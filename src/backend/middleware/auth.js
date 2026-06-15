/**
 * ATCA-ERP v1.0 — Authentication & RBAC Middleware
 * Session-based auth; server-side sessions; LAN-only
 * AS9100D §7.5 access control
 */

'use strict';

const { query, sql } = require('../config/database');

/** Role hierarchy — higher index = more privilege */
const ROLE_RANK = {
  READONLY:      0,
  NDT_INSPECTOR: 1,
  SUPERVISOR:    2,
  ENGINEER:      3,
  QA_MANAGER:    4,
  ADMIN:         5,
};

/**
 * requireAuth — ensures valid session exists
 * Attaches req.user from session
 */
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  // Session already validated; user stored in req.session
  req.user = {
    userId:      req.session.userId,
    username:    req.session.username,
    role:        req.session.role,
    fullName:    req.session.fullName,
    employeeId:  req.session.employeeId,
    personnelId: req.session.personnelId || null,
  };
  next();
}

/**
 * requireRole(...roles) — checks user role is in allowed list
 * Usage: router.get('/sensitive', requireAuth, requireRole('ADMIN','QA_MANAGER'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

/**
 * requireMinRole(minRole) — checks user rank is >= minRole
 * Usage: requireMinRole('QA_MANAGER') allows QA_MANAGER and ADMIN
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated.' });
    const userRank = ROLE_RANK[req.user.role] ?? -1;
    const minRank  = ROLE_RANK[minRole] ?? 999;
    if (userRank < minRank) {
      return res.status(403).json({
        message: `Access denied. Requires ${minRole} or above.`
      });
    }
    next();
  };
}

/**
 * auditLog — write to AuditLog table
 * Call from route handlers after successful writes
 */
async function auditLog({ userId, username, lanIp, action, tableName, recordId, moduleId, oldValue, newValue }) {
  try {
    await query(`
      INSERT INTO dbo.AuditLog
        (user_id, username, lan_ip, action, table_name, record_id, module_id, old_value, new_value)
      VALUES
        (@userId, @username, @lanIp, @action, @tableName, @recordId, @moduleId, @oldValue, @newValue)
    `, [
      { name: 'userId',    type: sql.Int,          value: userId    || null },
      { name: 'username',  type: sql.NVarChar(50),  value: username  || null },
      { name: 'lanIp',     type: sql.NVarChar(45),  value: lanIp     || null },
      { name: 'action',    type: sql.NVarChar(20),  value: action              },
      { name: 'tableName', type: sql.NVarChar(100), value: tableName || null },
      { name: 'recordId',  type: sql.NVarChar(50),  value: recordId  || null },
      { name: 'moduleId',  type: sql.NVarChar(10),  value: moduleId  || null },
      { name: 'oldValue',  type: sql.NVarChar(sql.MAX), value: oldValue ? JSON.stringify(oldValue) : null },
      { name: 'newValue',  type: sql.NVarChar(sql.MAX), value: newValue ? JSON.stringify(newValue) : null },
    ]);
  } catch (err) {
    // Audit failures must not crash the main request
    console.error('[AuditLog] Failed to write:', err.message);
  }
}

/**
 * getLanIp — extract LAN IP from request
 * Handles X-Forwarded-For if behind IIS ARR
 */
function getLanIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
}

module.exports = { requireAuth, requireRole, requireMinRole, auditLog, getLanIp, ROLE_RANK };
