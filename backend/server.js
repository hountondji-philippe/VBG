'use strict';

const express    = require('express');
const multer     = require('multer');
const { Pool }   = require('pg');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcrypt');
const session    = require('express-session');
const PgSession  = require('connect-pg-simple')(session);
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
require('dotenv').config();

// ============================================================
// 1. VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================================
const REQUIRED_ENV = ['SESSION_SECRET', 'DATABASE_URL'];
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
// 2. APP EXPRESS
// ============================================================
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ============================================================
// 3. HELMET
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc:                 ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:                  ["'self'", 'data:', 'blob:'],
      mediaSrc:                ["'self'", 'blob:'],
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
  crossOriginResourcePolicy:    { policy: 'same-origin' },
  hsts:                         { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff:                      true,
  frameguard:                   { action: 'deny' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy:               { policy: 'no-referrer' },
}));

// ============================================================
// 4. CORS
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
// 5. BODY PARSERS
// ============================================================
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// ============================================================
// 6. BASE DE DONNÉES PostgreSQL
// ============================================================
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ============================================================
// 7. SESSION STORE PostgreSQL
// ============================================================
app.use(session({
  name:   'vbg_sid',
  secret: process.env.SESSION_SECRET,
  store:  new PgSession({
    pool:                db,
    tableName:           'session',
    createTableIfMissing: true,
  }),
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
// 9. MULTER — stockage local sécurisé
// ============================================================
const MIME_OK = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/3gpp',
]);

const MIME_EXT_MAP = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png':  ['.png'],
  'image/gif':  ['.gif'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'audio/mpeg':  ['.mp3'],
  'audio/wav':   ['.wav'],
  'audio/ogg':   ['.ogg'],
  'audio/aac':   ['.aac'],
  'audio/x-m4a': ['.m4a'],
  'audio/mp4':   ['.m4a', '.mp4'],
  'video/mp4':       ['.mp4'],
  'video/webm':      ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/3gpp':      ['.3gp'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file,  cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomBytes(16).toString('hex') + ext);
  },
});

const upload = multer({
  storage,
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
// 10. HELPERS
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

// ============================================================
// 11. ROUTE PUBLIQUE — Envoi témoignage
// ============================================================
app.post('/api/temoignage', limitPublic, upload.array('fichiers', 3), async (req, res) => {
  try {
    const message = sanitize(req.body.message || '');

    if (!message && !(req.files?.length))
      return res.status(400).json({ message: 'Contenu vide.' });

    if (message.length > 5000)
      return res.status(400).json({ message: 'Message trop long (max 5000 caractères).' });

    const fichiers = (req.files || []).map(f => ({
      nom:           f.originalname.slice(0, 100),
      url:           `/uploads/${f.filename}`,
      resource_type: f.mimetype.startsWith('image/') ? 'image'
                   : f.mimetype.startsWith('video/') ? 'video'
                   : f.mimetype.startsWith('audio/') ? 'audio' : 'raw',
      type:          f.mimetype,
      taille:        f.size,
      filename:      f.filename,
    }));

    await db.query(
      'INSERT INTO temoignages (message, fichiers_json) VALUES ($1, $2)',
      [message || null, JSON.stringify(fichiers)]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('[temoignage]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ============================================================
// 12. ROUTES ADMIN — Auth
// ============================================================
app.post('/api/admin/login', limitLogin, async (req, res) => {
  try {
    const username = sanitize(req.body.username || '', 50);
    const password = String(req.body.password || '').slice(0, 200);

    if (!username || !password)
      return res.status(400).json({ message: 'Identifiants manquants.' });

    const result = await db.query(
      'SELECT password_hash FROM admins WHERE username = $1 LIMIT 1',
      [username]
    );

    const hash  = result.rows[0]?.password_hash || '$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const valid = await bcrypt.compare(password, hash);

    if (!valid || !result.rows[0]) {
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
// 13. ROUTES ADMIN — Données
// ============================================================
app.get('/api/admin/stats', requireAdmin, requireSessionFresh, limitAdmin, async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*)                                           AS total,
        SUM(CASE WHEN statut='nouveau'  THEN 1 ELSE 0 END) AS nouveaux,
        SUM(CASE WHEN statut='en_cours' THEN 1 ELSE 0 END) AS en_cours,
        SUM(CASE WHEN statut='traite'   THEN 1 ELSE 0 END) AS traites,
        SUM(CASE WHEN statut='archive'  THEN 1 ELSE 0 END) AS archives
      FROM temoignages
    `);
    res.json(result.rows[0]);
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
    const where   = statut ? 'WHERE statut = $1' : '';
    const wParam  = statut ? [statut] : [];

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM temoignages ${where}`, wParam
    );
    const total = parseInt(countResult.rows[0].total);

    const dataParams = statut ? [statut, limit, offset] : [limit, offset];
    const whereData  = statut ? 'WHERE statut = $1' : '';
    const lp         = statut ? '$2' : '$1';
    const op         = statut ? '$3' : '$2';

    const rows = await db.query(
      `SELECT id, LEFT(message, 180) AS apercu, fichiers_json, statut, date_envoi
       FROM temoignages ${whereData}
       ORDER BY date_envoi DESC
       LIMIT ${lp} OFFSET ${op}`,
      dataParams
    );

    res.json({ total, page, pages: Math.ceil(total / limit) || 1, rows: rows.rows });
  } catch (err) {
    console.error('[liste]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/admin/temoignages/:id', requireAdmin, requireSessionFresh, limitAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) return res.status(400).json({ message: 'ID invalide.' });

    const result = await db.query(
      `SELECT id, message, fichiers_json, statut, notes_admin, date_envoi, date_maj
       FROM temoignages WHERE id = $1 LIMIT 1`, [id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Introuvable.' });

    res.json(result.rows[0]);
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

    const result = await db.query(
      'UPDATE temoignages SET statut = $1, notes_admin = $2 WHERE id = $3',
      [statut, notes || null, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Introuvable.' });
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

    const select = await db.query(
      'SELECT fichiers_json FROM temoignages WHERE id = $1 LIMIT 1', [id]
    );
    if (!select.rows.length) return res.status(404).json({ message: 'Introuvable.' });

    await db.query('DELETE FROM temoignages WHERE id = $1', [id]);

    // Supprimer les fichiers locaux
    try {
      const raw = select.rows[0].fichiers_json;
      const fichiers = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
      for (const f of fichiers) {
        if (f.filename) {
          const filePath = path.join(UPLOAD_DIR, f.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
    } catch {}

    res.json({ success: true });
  } catch (err) {
    console.error('[delete]', err.message);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ============================================================
// 14. FICHIERS STATIQUES + UPLOADS
// ============================================================
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1d',
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

app.use(express.static(path.join(__dirname, './frontend'), {
  maxAge:      '1d',
  etag:        true,
  lastModified: true,
  setHeaders:  (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

// ============================================================
// 15. GESTION DES ERREURS
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
// 16. DÉMARRAGE
// ============================================================
app.listen(PORT, () => {
  console.log(`VBG Backend  →  http://localhost:${PORT}`);
  console.log(`Mode         →  ${process.env.NODE_ENV || 'development'}`);
});