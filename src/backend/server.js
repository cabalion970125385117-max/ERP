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

const { query, sql, getPool } = require('./config/database');
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

// PATCH /api/v1/auth/signature — upload own signature (base64 PNG/JPG, max ~500 KB)
authRouter.patch('/signature', requireAuth, async (req, res) => {
  const { signature_data } = req.body;
  if (!signature_data) return res.status(400).json({ message: 'signature_data required.' });
  if (!signature_data.startsWith('data:image/')) {
    return res.status(400).json({ message: 'signature_data must be a data URI (data:image/...).' });
  }
  if (Buffer.byteLength(signature_data, 'utf8') > 700_000) {
    return res.status(413).json({ message: 'Signature image too large (max ~500 KB).' });
  }
  try {
    await query(
      `UPDATE dbo.Users SET signature_data = @sig, signature_updated_at = GETUTCDATE() WHERE user_id = @id`,
      [
        { name: 'sig', type: sql.NVarChar(sql.MAX), value: signature_data },
        { name: 'id',  type: sql.Int,               value: req.user.userId },
      ]
    );
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'Users',
      recordId: String(req.user.userId), moduleId: 'AUTH', newValue: 'signature_updated' });
    res.json({ message: 'Signature saved.' });
  } catch (err) {
    console.error('[auth/signature]', err.message);
    res.status(500).json({ message: 'Error saving signature.' });
  }
});

// GET /api/v1/auth/signature — get own signature
authRouter.get('/signature', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT signature_data, signature_updated_at FROM dbo.Users WHERE user_id = @id`,
      [{ name: 'id', type: sql.Int, value: req.user.userId }]
    );
    res.json(rows.length ? rows[0] : { signature_data: null, signature_updated_at: null });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching signature.' });
  }
});

// PATCH /api/v1/auth/signature/admin/:userId — admin uploads signature for any user
authRouter.patch('/signature/admin/:userId', requireAuth, requireMinRole('ADMIN'), async (req, res) => {
  const { signature_data } = req.body;
  const targetId = parseInt(req.params.userId, 10);
  if (!signature_data) return res.status(400).json({ message: 'signature_data required.' });
  if (!signature_data.startsWith('data:image/')) {
    return res.status(400).json({ message: 'signature_data must be a data URI.' });
  }
  if (Buffer.byteLength(signature_data, 'utf8') > 700_000) {
    return res.status(413).json({ message: 'Image too large (max ~500 KB).' });
  }
  try {
    const check = await query(`SELECT user_id FROM dbo.Users WHERE user_id = @id AND is_active = 1`,
      [{ name: 'id', type: sql.Int, value: targetId }]);
    if (!check.length) return res.status(404).json({ message: 'User not found.' });
    await query(
      `UPDATE dbo.Users SET signature_data = @sig, signature_updated_at = GETUTCDATE() WHERE user_id = @id`,
      [
        { name: 'sig', type: sql.NVarChar(sql.MAX), value: signature_data },
        { name: 'id',  type: sql.Int,               value: targetId },
      ]
    );
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'Users',
      recordId: String(targetId), moduleId: 'MOD-25', newValue: 'signature_updated_by_admin' });
    res.json({ message: 'Signature saved.' });
  } catch (err) {
    console.error('[auth/signature/admin]', err.message);
    res.status(500).json({ message: 'Error saving signature.' });
  }
});

// GET /api/v1/auth/signature/:userId — get another user's signature (any auth)
authRouter.get('/signature/:userId', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT signature_data, signature_updated_at FROM dbo.Users WHERE user_id = @id AND is_active = 1`,
      [{ name: 'id', type: sql.Int, value: parseInt(req.params.userId, 10) }]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching signature.' });
  }
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
apiRouter.use('/mod01',   require('./api/qms-core/index'));
apiRouter.use('/mod02',   require('./api/document-control/index'));
apiRouter.use('/mod03',   require('./api/fpi-process/index'));   // FPI Process Control (AC7114)
apiRouter.use('/mod04',   require('./api/ndt-personnel/index'));   // Personnel & NAS410 Certifications
apiRouter.use('/mod05',   require('./api/equipment-calibration/index'));   // Equipment & Calibration
apiRouter.use('/mod06',   require('./api/chemical-bath-control/index'));   // Chemical / Bath Control (AC7108/AC7110/AC7114)
apiRouter.use('/mod07',   require('./api/ncr-capa/index'));                      // NCR & CAPA
apiRouter.use('/mod08',   require('./api/audit-management/index'));              // Audit Management
apiRouter.use('/mod09',   require('./api/sales-customer-service/index'));        // Sales & Customer Service
apiRouter.use('/mod10',   require('./api/production-management/index'));         // Production Management
apiRouter.use('/mod13',   require('./api/work-order/index'));                    // Work Order / Job Traveler
apiRouter.use('/mod17',   require('./api/mpt-process/index'));                   // MPT Process Control
apiRouter.use('/mod19',   require('./api/extended-laboratory/index'));           // Extended Laboratory
apiRouter.use('/mod20',   require('./api/customer-complaint/index'));            // Customer Complaint & 8D
apiRouter.use('/mod24',   require('./api/certificate-of-conformance/index'));    // Certificate of Conformance
apiRouter.use('/mod11',   require('./api/maintenance/index'));               // Maintenance Management
apiRouter.use('/mod12',   require('./api/purchasing/index'));                // Purchasing & Supplier/AVL
apiRouter.use('/mod14',   require('./api/inventory/index'));                 // Inventory Management
apiRouter.use('/mod16',   require('./api/finance/index'));                   // Finance (GL, AR/AP, Assets, Budget)
apiRouter.use('/mod18',   require('./api/hr-management/index'));             // HR & Organisation Management
apiRouter.use('/mod21',   require('./api/communications/index'));            // Communications & Announcements
apiRouter.use('/mod22',   require('./api/leave-attendance/index'));          // Leave & Attendance
apiRouter.use('/mod23',   require('./api/payroll/index'));                   // Payroll Processing
apiRouter.use('/changelog',  require('./api/changelog/index'));              // System Change Log
apiRouter.use('/bugreport',  require('./api/bugreport/index'));              // Bug Report / Issue Tracker
apiRouter.use('/chat',       require('./api/chat/index'));                   // Internal Chat Messaging
// apiRouter.use('/mod15', require('./api/mod15/index'));   // KPI Dashboard
apiRouter.use('/mod25',   require('./api/mod25/index'));              // User & Role Management
// apiRouter.use('/mod26', require('./api/mod26/index'));   // System Configuration
apiRouter.use('/mod27',   require('./api/mod27/index'));              // Value Flow Tracker (AS9100D §8.5)
apiRouter.use('/mod28',   require('./api/mod28/index'));              // Process Capability Master (PCM)
apiRouter.use('/mod29',   require('./api/mod29/index'));              // Customer Qualification (lifecycle)
apiRouter.use('/mod30',   require('./api/mod30/index'));              // Pyrometry & Heat-Treat (AMS 2750)
apiRouter.use('/mod31',   require('./api/mod31/index'));              // Operator Competency & PIN Sign-off
apiRouter.use('/mod32',   require('./api/mod32/index'));              // Bay Load Scheduler + Tank-Fit Check
apiRouter.use('/mod33',   require('./api/mod33/index'));              // Spec & Flowdown / Frozen Process + ECN + AAM
apiRouter.use('/mod34',   require('./api/mod34/index'));              // Chemical & Hazmat Control + Alert Escalation Engine

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
