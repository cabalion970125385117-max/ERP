'use strict';

/**
 * MOD-25: User & Role Management
 * AS9100D §6.2 — Personnel Competence & System Access Control
 * View: QA_MANAGER+  |  Mutations: ADMIN only
 */

const router = require('express').Router();
const bcrypt = require('bcrypt');
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, requireRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

const VALID_ROLES = ['READONLY', 'NDT_INSPECTOR', 'SUPERVISOR', 'ENGINEER', 'QA_MANAGER', 'ADMIN'];

// ── GET /mod25/alerts/summary ──────────────────────────────────
router.get('/alerts/summary', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const r = await query(`
      SELECT
        COUNT(*)                                           AS total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)    AS active_users,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END)    AS inactive_users,
        SUM(CASE WHEN role IN ('ADMIN','QA_MANAGER')
                  AND is_active = 1 THEN 1 ELSE 0 END)    AS elevated_roles
      FROM dbo.Users
    `, []);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /mod25/users ───────────────────────────────────────────
router.get('/users', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const { role, status } = req.query;
    const params = [];
    const conditions = [];

    if (role) {
      conditions.push('u.role = @role');
      params.push({ name: 'role', type: sql.NVarChar(20), value: role });
    }
    if (status === 'active')   conditions.push('u.is_active = 1');
    if (status === 'inactive') conditions.push('u.is_active = 0');

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const r = await query(`
      SELECT
        u.user_id,
        u.username,
        u.full_name,
        u.role,
        u.employee_id,
        p.personnel_id,
        u.is_active   AS active,
        u.last_login,
        u.created_date,
        u.failed_attempts
      FROM dbo.Users u
      LEFT JOIN dbo.Personnel p ON p.user_id = u.user_id
      ${where}
      ORDER BY u.full_name
    `, params);

    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /mod25/users — create user ───────────────────────────
router.post('/users', requireRole('ADMIN'), async (req, res) => {
  const { full_name, username, password, role, personnel_id } = req.body;

  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ message: 'full_name, username, password and role are required.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (password.length < 12) {
    return res.status(400).json({ message: 'Password must be at least 12 characters.' });
  }
  if (/\s/.test(username)) {
    return res.status(400).json({ message: 'Username must not contain spaces.' });
  }

  try {
    // Duplicate username check
    const existing = await query(
      `SELECT user_id FROM dbo.Users WHERE username = @uname`,
      [{ name: 'uname', type: sql.NVarChar(50), value: username.toLowerCase() }]
    );
    if (existing.recordset.length) {
      return res.status(409).json({ message: `Username "${username}" is already taken.` });
    }

    const hash = await bcrypt.hash(password, 12);
    const r = await query(`
      INSERT INTO dbo.Users (username, password_hash, full_name, role, is_active, created_date)
      OUTPUT INSERTED.user_id
      VALUES (@uname, @hash, @fn, @role, 1, GETUTCDATE())
    `, [
      { name: 'uname', type: sql.NVarChar(50),  value: username.toLowerCase() },
      { name: 'hash',  type: sql.NVarChar(256), value: hash },
      { name: 'fn',    type: sql.NVarChar(100), value: full_name },
      { name: 'role',  type: sql.NVarChar(20),  value: role },
    ]);

    const userId = r.recordset[0].user_id;

    // Link to personnel record if provided
    if (personnel_id) {
      await query(
        `UPDATE dbo.Personnel SET user_id = @uid WHERE personnel_id = @pid AND user_id IS NULL`,
        [
          { name: 'uid', type: sql.Int, value: userId },
          { name: 'pid', type: sql.Int, value: personnel_id },
        ]
      );
    }

    await auditLog({
      userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'CREATE', tableName: 'Users',
      recordId: String(userId), moduleId: 'MOD-25',
      newValue: { username: username.toLowerCase(), role, full_name },
    });

    res.status(201).json({ user_id: userId, username: username.toLowerCase() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /mod25/users/:id — update role / status / personnel ───
router.put('/users/:id', requireRole('ADMIN'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { role, active, personnel_id } = req.body;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `Invalid role.` });
  }

  // Cannot deactivate own account
  if (req.user.userId === targetId && active === false) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }

  try {
    const check = await query(
      `SELECT user_id, role, is_active FROM dbo.Users WHERE user_id = @id`,
      [{ name: 'id', type: sql.Int, value: targetId }]
    );
    if (!check.recordset.length) return res.status(404).json({ message: 'User not found.' });

    const old = check.recordset[0];

    await query(`
      UPDATE dbo.Users SET
        role      = ISNULL(@role, role),
        is_active = ISNULL(@active, is_active),
        updated_at = GETUTCDATE()
      WHERE user_id = @id
    `, [
      { name: 'role',   type: sql.NVarChar(20), value: role   ?? null },
      { name: 'active', type: sql.Bit,           value: active != null ? (active ? 1 : 0) : null },
      { name: 'id',     type: sql.Int,           value: targetId },
    ]);

    // Update personnel link
    if (personnel_id !== undefined) {
      if (personnel_id) {
        await query(
          `UPDATE dbo.Personnel SET user_id = @uid WHERE personnel_id = @pid`,
          [
            { name: 'uid', type: sql.Int, value: targetId },
            { name: 'pid', type: sql.Int, value: personnel_id },
          ]
        );
      } else {
        // Clear link
        await query(
          `UPDATE dbo.Personnel SET user_id = NULL WHERE user_id = @uid`,
          [{ name: 'uid', type: sql.Int, value: targetId }]
        );
      }
    }

    await auditLog({
      userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'Users',
      recordId: String(targetId), moduleId: 'MOD-25',
      oldValue: { role: old.role, is_active: old.is_active },
      newValue: { role, active },
    });

    res.json({ message: 'User updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /mod25/users/:id/reset-password ──────────────────────
router.post('/users/:id/reset-password', requireRole('ADMIN'), async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { password } = req.body;

  if (!password || password.length < 12) {
    return res.status(400).json({ message: 'Password must be at least 12 characters.' });
  }

  try {
    const check = await query(
      `SELECT user_id, username FROM dbo.Users WHERE user_id = @id AND is_active = 1`,
      [{ name: 'id', type: sql.Int, value: targetId }]
    );
    if (!check.recordset.length) return res.status(404).json({ message: 'User not found.' });

    const hash = await bcrypt.hash(password, 12);
    await query(`
      UPDATE dbo.Users SET
        password_hash  = @hash,
        failed_attempts = 0,
        updated_at     = GETUTCDATE()
      WHERE user_id = @id
    `, [
      { name: 'hash', type: sql.NVarChar(256), value: hash },
      { name: 'id',   type: sql.Int,           value: targetId },
    ]);

    await auditLog({
      userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'Users',
      recordId: String(targetId), moduleId: 'MOD-25',
      newValue: 'password_reset_by_admin',
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
