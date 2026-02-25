'use strict';

const express    = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer     = require('multer');
const mysql      = require('mysql2/promise');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcrypt');
const session    = require('express-session');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
require('dotenv').config();

// ============================================================
// 1. VALIDATION DES VARIABLES D'ENVIRONNEMENT AU DÉMARRAGE
// ============================================================
const REQUIRED_ENV = [
  'SESSION_SECRET', 'DB_HOST', 'DB_USER',
  'DB_PASSWORD', 'DB_NAME',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Variable manquante : ${key}`);
    process.exit(1);
  }
}
if (process.env.SESSION_SECRET.length < 64) {
  console.error('[FATAL] SESSION_SECRET trop court (minimum 64 caractères).');
  process.exit(1);
}

// ============================================================
// 2. CLOUDINARY
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder:        'vbg-temoignages',
    resource_type: file.mimetype.startsWith('video') || file.mimetype.startsWith('audio')
                   ? 'video' : 'image',
    public_id:     crypto.randomBytes(16).toString('hex'), // nom aléatoire, jamais devinable
    overwrite:     false,
  }),
});

// ============================================================
// 3. APP EXPRESS
// ============================================================
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ============================================================
// 4. HELMET — Headers de sécurité HTTP
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      mediaSrc:                ["'self'", 'blob:', 'https://res.cloudinary.com'],
      connectSrc:              ["'self'"],
      frameSrc:                ["'none'"],
      objectSrc:               ["'none'"],
      baseUri:                 ["'self'"],
      formAction:              ["'self'"],
      frameAncestors:          ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy:    false,
  crossOriginResourcePolicy:    { policy: 'cross-origin' },
  hsts:                         { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff:                      true,
  frameguard:                   { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy:               { policy: 'no-referrer' },
}));

// ============================================================
// 5. CORS
// ============================================================
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS refusé'));
  },
  methods:        ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials:    true,
}));

// ============================================================
// 6. BODY PARSERS
// ============================================================
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// ============================================================
// 7. SESSIONS
// ============================================================
app.use(session({
  name:              'vbg_sid',
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   60 * 60 * 1000,
  }
}));

// ============================================================
// 8. RATE LIMITERS
// ============================================================
const limitPublic = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Trop de requêtes. Réessayez dans 1 heure.' },
});

const limitLogin = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const limitAdmin = rateLimit({
  windowMs: 60 * 1000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Ralentissez.' },
});

// ============================================================
// 9. MULTER — Upload sécurisé
// ============================================================
const MIME_OK = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'video/mp4',  'video/webm',
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
  storage: cloudinaryStorage,
  fileFilter: (_req, file, cb) => {
    if (!MIME_OK.has(file.mimetype))
      return cb(new Error('Type de fichier non autorisé.'));
    const ext     = path.extname(file.originalname).toLowerCase();
    const allowed = MIME_EXT_MAP[file.mimetype] || [];
    if (!allowed.includes(ext))
      return cb(new Error('Extension non cohérente avec le type de fichier.'));
    cb(null, true);
  },
  limits: {
    fileSize:  20 * 1024 * 1024,
    files:     3,
    fields:    5,
    fieldSize: 20 * 1024,
  },
});

// ============================================================
// 10. BASE DE DONNÉES
// ============================================================
const db = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  port:               Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  ssl:                { rejectUnauthorized: false },
  connectionLimit:    10,
  charset:            'utf8mb4',
  connectTimeout:     10000,
  timezone:           'Z',
});

// ============================================================
// 11. HELPERS
// ============================================================
const sanitize = (s, max = 5000) =>
  typeof s === 'string' ? s.trim().slice(0, max) : '';

function requireAdmin(req, res, next) {
  if (req.session?.admin === true) return next();
  setTimeout(() => res.status(401).json({ message: 'Non autorisé.' }), 100);
}

function requireSessionFresh(req, res, next) {
  const MAX_AGE = 60 * 60 * 1000;
  if (!req.session.loginAt || Date.now() - req.session.loginAt > MAX_AGE) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: 'Session expirée. Reconnectez-vous.' });
  }
  next();
}

async function deleteCloudinaryFile(f) {
  try {
    if (!f?.public_id) return;
    const rtype = (f.resource_type === 'video' || f.resource_type === 'audio')
                  ? 'video' : 'image';
    await cloudinary.uploader.destroy(f.public_id, { resource_type: rtype });
  } catch (err) {
    console.error('[cloudinary delete]', err.message);
  }
}

// ============================================================
// 12. ROUTE PUBLIQUE — Envoi témoignage
// ============================================================
app.post('/api/temoignage', limitPublic, upload.array('fichiers', 3), async (req, res) => {
  try {
    const message = sanitize(req.body.message || '');

    if (!message && !(req.files?.length))
      return res.status(400).json({ message: 'Contenu vide.' });

    if (message.length > 5000)
      return res.status(400).json({ message: 'Message trop long (max 5000 caractères).' });

    // CORRECTION : secure_url vient de f.path avec multer-storage-cloudinary
    const fichiers = (req.files || []).map(f => ({
      nom:           f.originalname.slice(0, 100),
      secure_url:    f.path,
      url:           f.path,
      resource_type: f.mimetype.startsWith('image') ? 'image'
                   : f.mimetype.startsWith('video') ? 'video'
                   : f.mimetype.startsWith('audio') ? 'audio'
                   : 'raw',
      type:          f.mimetype,
      taille:        f.size,
      public_id:     f.filename,
    }));

    await db.execute(
      'INSERT INTO temoignages (message, fichiers_json) VALUES (?, ?)',
      [message || null, JSON.stringify(fichiers)]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[temoignage]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ============================================================
// 13. ROUTES ADMIN — Auth
// ============================================================
app.post('/api/admin/login', limitLogin, async (req, res) => {
  try {
    const username = sanitize(req.body.username || '', 50);
    const password = String(req.body.password || '').slice(0, 200);

    if (!username || !password)
      return res.status(400).json({ message: 'Identifiants manquants.' });

    const [rows] = await db.execute(
      'SELECT password_hash FROM admins WHERE username = ? LIMIT 1',
      [username]
    );

    const hash  = rows[0]?.password_hash || '$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const valid = await bcrypt.compare(password, hash);

    if (!valid || !rows[0]) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 200));
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

// ============================================================
// 14. ROUTES ADMIN — Données
// ============================================================
app.get('/api/admin/stats', requireAdmin, requireSessionFresh, limitAdmin, async (_req, res) => {
  try {
    const [[stats]] = await db.execute(`
      SELECT
        COUNT(*)               AS total,
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

app.get('/api/admin/temoignages', requireAdmin, requireSessionFresh, limitAdmin, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const STATUTS_VALIDES = ['nouveau', 'en_cours', 'traite', 'archive'];
    const statut  = STATUTS_VALIDES.includes(req.query.statut) ? req.query.statut : null;
    const where   = statut ? 'WHERE statut = ?' : '';
    const wParam  = statut ? [statut] : [];

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM temoignages ${where}`, wParam
    );
    const [rows] = await db.query(
      `SELECT id, LEFT(message, 180) AS apercu, fichiers_json, statut, date_envoi
       FROM temoignages ${where}
       ORDER BY date_envoi DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      wParam
    );

    res.json({ total, page, pages: Math.ceil(total / limit) || 1, rows });
  } catch (err) {
    console.error('[liste]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/admin/temoignages/:id', requireAdmin, requireSessionFresh, limitAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ message: 'ID invalide.' });

    const [rows] = await db.execute(
      `SELECT id, message, fichiers_json, statut, notes_admin, date_envoi, date_maj
       FROM temoignages WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Introuvable.' });

    res.json(rows[0]);
  } catch (err) {
    console.error('[detail]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.patch('/api/admin/temoignages/:id', requireAdmin, requireSessionFresh, limitAdmin, async (req, res) => {
  try {
    const id     = parseInt(req.params.id);
    const VALIDS = ['nouveau', 'en_cours', 'traite', 'archive'];
    const statut = req.body.statut;
    const notes  = sanitize(req.body.notes || '', 2000);

    if (!id || id < 1)            return res.status(400).json({ message: 'ID invalide.' });
    if (!VALIDS.includes(statut)) return res.status(400).json({ message: 'Statut invalide.' });

    const [result] = await db.execute(
      'UPDATE temoignages SET statut = ?, notes_admin = ? WHERE id = ?',
      [statut, notes || null, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Introuvable.' });

    res.json({ success: true });
  } catch (err) {
    console.error('[update]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/temoignages/:id', requireAdmin, requireSessionFresh, limitAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ message: 'ID invalide.' });

    const [rows] = await db.execute(
      'SELECT fichiers_json FROM temoignages WHERE id = ? LIMIT 1', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Introuvable.' });

    await db.execute('DELETE FROM temoignages WHERE id = ?', [id]);

    let fichiers = [];
    try { fichiers = JSON.parse(rows[0].fichiers_json || '[]'); } catch {}
    for (const f of fichiers) await deleteCloudinaryFile(f);

    res.json({ success: true });
  } catch (err) {
    console.error('[delete]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ============================================================
// 15. FICHIERS STATIQUES
// ============================================================
app.use(express.static(path.join(__dirname, './frontend'), {
  maxAge:      '1d',
  etag:        true,
  lastModified: true,
  setHeaders:  (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// ============================================================
// 16. GESTION DES ERREURS
// ============================================================
app.use((_req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'   ? 'Fichier trop grand (max 20 Mo).'
              : err.code === 'LIMIT_FILE_COUNT'  ? 'Maximum 3 fichiers.'
              : err.code === 'LIMIT_FIELD_VALUE' ? 'Données trop volumineuses.'
              : err.message;
    return res.status(400).json({ message: msg });
  }
  if (['Type de fichier non autorisé.', 'Extension non cohérente avec le type de fichier.', 'CORS refusé'].includes(err.message)) {
    return res.status(400).json({ message: err.message });
  }
  const detail = process.env.NODE_ENV !== 'production' ? err.message : 'Erreur interne.';
  console.error('[erreur]', err.message);
  res.status(500).json({ message: detail });
});

// ============================================================
// 17. DÉMARRAGE
// ============================================================
app.listen(PORT, () => {
  console.log(`VBG Backend  →  http://localhost:${PORT}`);
  console.log(`Mode         →  ${process.env.NODE_ENV || 'development'}`);
});