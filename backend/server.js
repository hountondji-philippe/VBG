'use strict';

const express   = require('express');
const multer    = require('multer');
const mysql     = require('mysql2/promise');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt    = require('bcrypt');
const session   = require('express-session');
const path      = require('path');
const fs        = require('fs');
require('dotenv').config();

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const REQUIRED_ENV = ['SESSION_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Variable manquante : ${key}`);
    process.exit(1);
  }
}
if (process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET trop court (minimum 32 caractères).');
  process.exit(1);
}

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      mediaSrc:   ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

const ALLOWED = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : [];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error('CORS refusé'));
  },
  methods:        ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials:    true
}));

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use(session({
  name:   'vbg_sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   60 * 60 * 1000
  }
}));

const limitPublic = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Trop de requêtes. Réessayez dans 1 heure.' }
});

const limitLogin = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

const limitAdmin = rateLimit({
  windowMs: 60 * 1000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Ralentissez.' }
});

const MIME_OK = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4',  'video/webm'
]);

const MIME_EXT_MAP = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
  'audio/mpeg': ['.mp3'],
  'audio/wav':  ['.wav'],
  'audio/ogg':  ['.ogg'],
  'video/mp4':  ['.mp4'],
  'video/webm': ['.webm'],
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    }
  }),
  fileFilter: (_req, file, cb) => {
    if (!MIME_OK.has(file.mimetype)) return cb(new Error('Type refusé'));
    const ext     = path.extname(file.originalname).toLowerCase();
    const allowed = MIME_EXT_MAP[file.mimetype] || [];
    if (!allowed.includes(ext)) return cb(new Error('Extension ne correspond pas au type de fichier'));
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024, files: 3 }
});

const db = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  ssl: { rejectUnauthorized: false },
  connectionLimit:    10,
  charset:            'utf8mb4',
  connectTimeout:     10000,
  ssl: { rejectUnauthorized: false },
});

const sanitize = (s, max = 5000) => typeof s === 'string' ? s.trim().slice(0, max) : '';

function requireAdmin(req, res, next) {
  if (req.session?.admin === true) return next();
  res.status(401).json({ message: 'Non autorisé.' });
}

async function deleteUploadedFiles(files) {
  if (!files?.length) return;
  for (const f of files) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, f.filename)); } catch {}
  }
}

app.post('/api/temoignage', limitPublic, upload.array('fichiers', 3), async (req, res) => {
  try {
    const message = sanitize(req.body.message || '');
    if (!message && !(req.files?.length)) {
      await deleteUploadedFiles(req.files);
      return res.status(400).json({ message: 'Contenu vide.' });
    }
    if (message.length > 5000) {
      await deleteUploadedFiles(req.files);
      return res.status(400).json({ message: 'Message trop long.' });
    }

    const fichiers = (req.files || []).map(f => ({
      nom: f.filename, type: f.mimetype, taille: f.size
    }));

    await db.execute(
      'INSERT INTO temoignages (message, fichiers_json) VALUES (?, ?)',
      [message, JSON.stringify(fichiers)]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    await deleteUploadedFiles(req.files);
    console.error('[temoignage]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/admin/login', limitLogin, async (req, res) => {
  try {
    const username = sanitize(req.body.username || '', 50);
    const password = String(req.body.password || '').slice(0, 200);

    if (!username || !password) {
      return res.status(400).json({ message: 'Identifiants manquants.' });
    }

    const [rows] = await db.execute(
      'SELECT password_hash FROM admins WHERE username = ? LIMIT 1',
      [username]
    );

    const hash  = rows[0]?.password_hash || '$2b$12$invaliiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii';
    const valid = await bcrypt.compare(password, hash);

    if (!valid || !rows[0]) {
      await new Promise(r => setTimeout(r, 500));
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    await new Promise((resolve, reject) =>
      req.session.regenerate(err => err ? reject(err) : resolve())
    );

    req.session.admin   = true;
    req.session.loginAt = Date.now();

    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve())
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('vbg_sid');
    res.json({ success: true });
  });
});

app.get('/api/admin/me', (req, res) => {
  res.json({ admin: req.session?.admin === true });
});

app.get('/api/admin/stats', requireAdmin, limitAdmin, async (_req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(statut='nouveau')  AS nouveaux,
        SUM(statut='en_cours') AS en_cours,
        SUM(statut='traite')   AS traites,
        SUM(statut='archive')  AS archives
      FROM temoignages
    `);
    res.json(stats);
  } catch (err) {
    console.error('[stats]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/admin/temoignages', requireAdmin, limitAdmin, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = 20;
    const offset = (page - 1) * limit;
    const STATUTS_VALIDES = ['nouveau', 'en_cours', 'traite', 'archive'];
    const statut = STATUTS_VALIDES.includes(req.query.statut) ? req.query.statut : null;

    const where  = statut ? 'WHERE statut = ?' : '';
    const wParam = statut ? [statut] : [];

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM temoignages ${where}`, wParam
    );
    const [rows] = await db.execute(
      `SELECT id, LEFT(message, 180) AS apercu, fichiers_json, statut, date_envoi
       FROM temoignages ${where}
       ORDER BY date_envoi DESC LIMIT ? OFFSET ?`,
      [...wParam, limit, offset]
    );

    res.json({ total, page, pages: Math.ceil(total / limit), rows });
  } catch (err) {
    console.error('[liste]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/admin/temoignages/:id', requireAdmin, limitAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ message: 'ID invalide.' });

    const [rows] = await db.execute(
      'SELECT * FROM temoignages WHERE id = ? LIMIT 1', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[detail]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.patch('/api/admin/temoignages/:id', requireAdmin, limitAdmin, async (req, res) => {
  try {
    const id     = parseInt(req.params.id);
    const VALIDS = ['nouveau', 'en_cours', 'traite', 'archive'];
    const statut = req.body.statut;
    const notes  = sanitize(req.body.notes || '', 2000);

    if (!id || id < 1)            return res.status(400).json({ message: 'ID invalide.' });
    if (!VALIDS.includes(statut)) return res.status(400).json({ message: 'Statut invalide.' });

    await db.execute(
      'UPDATE temoignages SET statut = ?, notes_admin = ? WHERE id = ?',
      [statut, notes, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[update]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/temoignages/:id', requireAdmin, limitAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ message: 'ID invalide.' });

    const [rows] = await db.execute(
      'SELECT fichiers_json FROM temoignages WHERE id = ? LIMIT 1', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Introuvable.' });

    let fichiers = [];
    try { fichiers = JSON.parse(rows[0].fichiers_json || '[]'); } catch {}

    await db.execute('DELETE FROM temoignages WHERE id = ?', [id]);

    for (const f of fichiers) {
      try {
        const fp = path.resolve(UPLOAD_DIR, path.basename(f.nom));
        if (fp.startsWith(path.resolve(UPLOAD_DIR) + path.sep) && fs.existsSync(fp)) {
          fs.unlinkSync(fp);
        }
      } catch {}
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[delete]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/uploads/:filename', requireAdmin, (req, res) => {
  const filename = path.basename(req.params.filename);

  const ext = path.extname(filename).toLowerCase();
  const ALLOWED_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.mp3','.wav','.ogg','.mp4','.webm'];
  if (!ALLOWED_EXT.includes(ext)) {
    return res.status(403).json({ message: 'Type non autorisé.' });
  }

  const filepath = path.resolve(UPLOAD_DIR, filename);

  if (!filepath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    return res.status(403).json({ message: 'Accès refusé.' });
  }

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ message: 'Fichier introuvable.' });
  }

  const stat     = fs.statSync(filepath);
  const fileSize = stat.size;
  const range    = req.headers.range;

  const mimeTypes = {
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png',  '.gif': 'image/gif', '.webp': 'image/webp'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end   = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunkSize = (end - start) + 1;
    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   contentType,
      'Cache-Control':  'no-store',
      'Pragma':         'no-cache',
    });
    fs.createReadStream(filepath, { start, end }).pipe(res);
  } else {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    fs.createReadStream(filepath).pipe(res);
  }
});

app.use(express.static(path.join(__dirname, './frontend'), { maxAge: '1d' }));

app.use((_req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'  ? 'Fichier trop grand (max 20 Mo).'
              : err.code === 'LIMIT_FILE_COUNT' ? 'Maximum 3 fichiers.'
              : err.message;
    return res.status(400).json({ message: msg });
  }
  if (['Type refusé', 'CORS refusé', 'Extension ne correspond pas au type de fichier'].includes(err.message)) {
    return res.status(400).json({ message: err.message });
  }
  const detail = process.env.NODE_ENV !== 'production' ? err.message : 'Erreur interne.';
  console.error('[erreur]', err.message);
  res.status(500).json({ message: detail });
});

app.listen(PORT, () => {
  console.log(`VBG Backend  →  http://localhost:${PORT}`);
  console.log(`Uploads      →  ${UPLOAD_DIR}`);
  console.log(`Mode         →  ${process.env.NODE_ENV || 'development'}`);
});
