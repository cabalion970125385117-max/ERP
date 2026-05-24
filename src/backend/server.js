/**
 * ATCA-ERP v1.0 — Express Application Entry Point
 * ATC Aviation Pte Ltd | AS9100D | NADCAP AC7114 | NAS410
 * LAN-only: binds to LAN fixed IP; no internet routes
 *
 * Start: node src/backend/server.js
 * Dev:   npm run dev  (nodemon)
 */

'use strict';

require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const MssqlStore     = require('connect-mssql-v2');
const helmet         = require('helmet');
const morgan         = require('morgan');
const path           = require('path');
const bcrypt         = require('bcrypt');

const { query, sql, getPool } = require('./config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('./middleware/auth');

const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';   // IIS/local LAN binding

/* ============================================================
   SECURITY MIDDLEWARE
   ============================================================ */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:'],
      fontSrc:    ["'self'"],
      connectSrc: ["'self'"],
      // No external sources — LAN-only
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
}));

/* ============================================================
   REQUEST PARSING
   ============================================================ */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/* ============================================================
   LOGGING (dev: combined, prod: short)
   ============================================================ */
app.use(morgan(process.env.NODE_ENV === 'production' ? 'short' : 'dev'));

/* ============================================================
   SESSION — Server-side, SQL Server backed
   AS9100D §7.5 access control; 8-hour shift session
   ============================================================ */
const sessionConfig = {
  secret:            process.env.SESSION_SECRET || 'CHANGE_THIS_IN_PRODUCTION_ATCA_ERP',
  resave:            false,
  saveUninitialized: false,
  name:              'atca_sess',
  cookie: {
    maxAge:   8 * 60 * 60 * 1000,  // 8 hours (one shift)
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
  },
};

// Use SQL Server session store in production
if (process.env.NODE_ENV === 'production') {
  const dbConfig = {
    server:   process.env.DB_HOST || '192.168.1.10',
    database: process.env.DB_NAME || 'ATCA_ERP_DB',
    user:     process.env.DB_USER || 'atca_app',
    password: process.env.DB_PASS || '',
    options:  { encrypt: false, trustServerCertificate: true },
  };
  sessionConfig.store = new MssqlStore(dbConfig);
}

app.use(session(sessionConfig));

/* ============================================================
   STATIC ASSETS — Serve frontend from /wwwroot equivalent
   All assets LAN-local: no CDN calls
   ============================================================ */
const FRONTEND_DIR = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR, {
  etag:         true,
  lastModified: true,
  maxAge:       '1h',
}));

/* ============================================================
   AUTH ROUTES (no requireAuth — login endpoint)
   ============================================================ */
const authRouter = express.Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required.' });
  }

  try {
    const rows = await query(`
      SELECT u.user_id, u.username, u.password_hash, u.role, u.full_name, u.employee_id,
             u.is_active, u.failed_attempts,
             p.personnel_id
      FROM dbo.Users u
      LEFT JOIN dbo.Personnel p ON p.user_id = u.user_id
      WHERE u.username = @username
    `, [{ name: 'username', type: sql.NVarChar(50), value: username }]);

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];

    // Account locked
    if (user.failed_attempts >= 5) {
      return res.status(403).json({ message: 'Account locked. Contact ATCA IT Administrator.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account deactivated.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Increment failed attempts
      await query(`UPDATE dbo.Users SET failed_attempts = failed_attempts + 1 WHERE user_id = @id`,
        [{ name: 'id', type: sql.Int, value: user.user_id }]);
      await auditLog({ userId: user.user_id, username, lanIp: getLanIp(req), action: 'LOGIN_FAIL' });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Success — reset failed attempts, update last_login
    await query(`
      UPDATE dbo.Users
      SET failed_attempts = 0, last_login = GETUTCDATE()
      WHERE user_id = @id
    `, [{ name: 'id', type: sql.Int, value: user.user_id }]);

    // Populate session
    req.session.userId      = user.user_id;
    req.session.username    = user.username;
    req.session.role        = user.role;
    req.session.fullName    = user.full_name;
    req.session.employeeId  = user.employee_id;
    req.session.personnelId = user.personnel_id || null;  // FK → Personnel (may be null)

    await auditLog({ userId: user.user_id, username, lanIp: getLanIp(req), action: 'LOGIN' });

    res.json({
      message:  'Login successful.',
      user_id:  user.user_id,
      username: user.username,
      role:     user.role,
      full_name: user.full_name,
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ message: 'Login error.' });
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', requireAuth, async (req, res) => {
  await auditLog({ userId: req.user.userId, username: req.user.username,
    lanIp: getLanIp(req), action: 'LOGOUT' });
  req.session.destroy();
  res.json({ message: 'Logged out.' });
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    user_id:      req.user.userId,
    username:     req.user.username,
    role:         req.user.role,
    full_name:    req.user.fullName,
    employee_id:  req.user.employeeId,
    personnel_id: req.user.personnelId || null,
  });
});

// POST /api/v1/auth/session-extend
authRouter.post('/session-extend', requireAuth, (req, res) => {
  req.session.touch();
  res.json({ message: 'Session extended.' });
});

// POST /api/v1/auth/change-password
authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'current_password and new_password required.' });
  }
  if (new_password.length < 10) {
    return res.status(400).json({ message: 'Password must be at least 10 characters.' });
  }

  try {
    const rows = await query(`SELECT password_hash FROM dbo.Users WHERE user_id = @id`,
      [{ name: 'id', type: sql.Int, value: req.user.userId }]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password incorrect.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await query(`UPDATE dbo.Users SET password_hash = @hash, updated_at = GETUTCDATE() WHERE user_id = @id`, [
      { name: 'hash', type: sql.NVarChar(256), value: newHash },
      { name: 'id',   type: sql.Int,           value: req.user.userId },
    ]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[auth/change-password]', err.message);
    res.status(500).json({ message: 'Error changing password.' });
  }
});

/* ============================================================
   ALERTS SUMMARY (global, not module-scoped)
   ============================================================ */
const alertsRouter = express.Router();
alertsRouter.get('/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT COUNT(*) AS total FROM dbo.AlertLog WHERE acknowledged = 0
    `);
    res.json({ total: rows[0].total });
  } catch (err) {
    console.error('[alerts/summary]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

/* ============================================================
   API ROUTER REGISTRATION
   ============================================================ */
const apiRouter = express.Router();

apiRouter.use('/auth',    authRouter);
apiRouter.use('/alerts',  requireAuth, alertsRouter);
apiRouter.use('/mod01',   require('./api/mod01/index'));
apiRouter.use('/mod02',   require('./api/mod02/index'));
apiRouter.use('/mod04',   require('./api/mod04/index'));   // Personnel & NAS410 Certifications
apiRouter.use('/mod05',   require('./api/mod05/index'));   // Equipment & Calibration
apiRouter.use('/mod07',   require('./api/mod07/index'));   // NCR & CAPA
// Future modules mount here:
// apiRouter.use('/mod03', require('./api/mod03/index'));   // FPI Process Control
// apiRouter.use('/mod06', require('./api/mod06/index'));   // Chemical / Bath Control
// apiRouter.use('/mod08', require('./api/mod08/index'));   // Audit Management
// apiRouter.use('/mod12', require('./api/mod12/index'));   // Traceability & Lot Control
// apiRouter.use('/mod13', require('./api/mod13/index'));   // Work Order / Traveler
// apiRouter.use('/mod15', require('./api/mod15/index'));   // KPI Dashboard
// apiRouter.use('/mod17', require('./api/mod17/index'));   // MPT Process Control
// apiRouter.use('/mod24', require('./api/mod24/index'));   // Certificate of Conformance
// apiRouter.use('/mod25', require('./api/mod25/index'));   // User Management
// apiRouter.use('/mod26', require('./api/mod26/index'));   // System Configuration

app.use('/api/v1', apiRouter);

/* ============================================================
   PAGE ROUTES — Login / Logout (must be before SPA fallback)
   ============================================================ */

// GET /login — serve login page (unauthenticated)
app.get('/login', (req, res) => {
  // Already logged in → redirect to home
  if (req.session?.userId) return res.redirect('/');
  res.sendFile(path.join(FRONTEND_DIR, 'login.html'));
});

// GET /logout — destroy session and redirect to login
app.get('/logout', async (req, res) => {
  if (req.session?.userId) {
    await auditLog({
      userId:   req.session.userId,
      username: req.session.username,
      lanIp:    getLanIp(req),
      action:   'LOGOUT',
    });
  }
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

/* ============================================================
   SPA FALLBACK — Serve index.html for all non-API routes
   ============================================================ */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

/* ============================================================
   GLOBAL ERROR HANDLER
   ============================================================ */
app.use((err, req, res, next) => {
  console.error('[UNHANDLED]', err.stack || err.message);
  res.status(500).json({ message: 'Internal server error.' });
});

/* ============================================================
   START SERVER
   ============================================================ */
async function start() {
  try {
    // Verify DB connectivity before accepting requests
    await getPool();
    console.log('[DB] Connection pool ready.');

    app.listen(PORT, HOST, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║  ATCA-ERP v1.0 — ATC Aviation Pte Ltd       ║
║  AS9100D | NADCAP AC7114 | NAS410           ║
║                                              ║
║  Server:  http://${HOST}:${PORT}
║  Mode:    ${process.env.NODE_ENV || 'development'}
║  LAN-Only: All external requests blocked     ║
╚══════════════════════════════════════════════╝`);
    });
  } catch (err) {
    console.error('[FATAL] Cannot start ATCA-ERP:', err.message);
    process.exit(1);
  }
}

start();
