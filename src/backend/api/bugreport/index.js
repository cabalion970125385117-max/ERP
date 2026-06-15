'use strict';
const router = require('express').Router();
const sql    = require('mssql');
const { query }        = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

// GET /alerts/summary
router.get('/alerts/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        SUM(CASE WHEN status IN ('OPEN','IN_PROGRESS') THEN 1 ELSE 0 END)                    AS open_bugs,
        SUM(CASE WHEN status IN ('OPEN','IN_PROGRESS') AND severity = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_bugs,
        SUM(CASE WHEN status = 'RESOLVED'
                  AND MONTH(resolved_at) = MONTH(GETUTCDATE())
                  AND YEAR(resolved_at)  = YEAR(GETUTCDATE())  THEN 1 ELSE 0 END)            AS resolved_this_month,
        AVG(CASE WHEN resolved_at IS NOT NULL
                 THEN DATEDIFF(hour, reported_at, resolved_at) / 24.0 END)                   AS avg_resolution_days
      FROM BugReport WHERE is_active = 1
    `, []);
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /bugs
router.get('/bugs', async (req, res) => {
  try {
    const { status, severity, limit = 50, offset = 0 } = req.query;
    const params = [
      { name: 'limit',  type: sql.Int, value: parseInt(limit)  },
      { name: 'offset', type: sql.Int, value: parseInt(offset) },
    ];
    let where = 'WHERE b.is_active = 1';
    if (status)   { where += ' AND b.status = @status';     params.push({ name: 'status',   type: sql.NVarChar(20), value: status }); }
    if (severity) { where += ' AND b.severity = @severity'; params.push({ name: 'severity', type: sql.NVarChar(20), value: severity }); }
    const result = await query(`
      SELECT b.bug_id, b.title, b.description, b.severity, b.module_affected,
             b.steps_to_reproduce, b.status, b.resolution_notes,
             b.reported_at, b.resolved_at,
             ur.full_name AS reported_by_name,
             rv.full_name AS resolved_by_name
      FROM BugReport b
      JOIN Users ur ON ur.user_id = b.reported_by
      LEFT JOIN Users rv ON rv.user_id = b.resolved_by
      ${where}
      ORDER BY
        CASE b.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
        b.reported_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /bugs — any authenticated user
router.post('/bugs', async (req, res) => {
  try {
    const { title, description, severity, module_affected, steps_to_reproduce } = req.body;
    const result = await query(`
      INSERT INTO BugReport (title, description, severity, module_affected, steps_to_reproduce, reported_by)
      OUTPUT INSERTED.bug_id, INSERTED.title, INSERTED.severity, INSERTED.status, INSERTED.reported_at
      VALUES (@title, @description, @severity, @module_affected, @steps_to_reproduce, @userId)
    `, [
      { name: 'title',              type: sql.NVarChar(200),     value: title },
      { name: 'description',        type: sql.NVarChar(sql.MAX), value: description },
      { name: 'severity',           type: sql.NVarChar(20),      value: severity },
      { name: 'module_affected',    type: sql.NVarChar(100),     value: module_affected || null },
      { name: 'steps_to_reproduce', type: sql.NVarChar(sql.MAX), value: steps_to_reproduce || null },
      { name: 'userId',             type: sql.Int,               value: req.user.userId },
    ]);
    const row = result.recordset[0];
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'REPORT_BUG', tableName: 'BugReport', recordId: row.bug_id,
      moduleId: 'BUGREPORT', newValue: JSON.stringify({ title, severity }) });
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /bugs/:id/resolve
router.patch('/bugs/:id/resolve', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { resolution_notes, status = 'RESOLVED' } = req.body;
    if (!['RESOLVED','WONT_FIX','IN_PROGRESS'].includes(status))
      return res.status(400).json({ error: 'Invalid status transition' });
    const result = await query(`
      UPDATE BugReport
      SET status = @status,
          resolution_notes = @resolution_notes,
          resolved_by  = CASE WHEN @status IN ('RESOLVED','WONT_FIX') THEN @userId ELSE resolved_by END,
          resolved_at  = CASE WHEN @status IN ('RESOLVED','WONT_FIX') THEN GETUTCDATE() ELSE resolved_at END
      OUTPUT INSERTED.bug_id, INSERTED.status, INSERTED.resolved_at
      WHERE bug_id = @id AND is_active = 1
    `, [
      { name: 'status',           type: sql.NVarChar(20),      value: status },
      { name: 'resolution_notes', type: sql.NVarChar(sql.MAX), value: resolution_notes || null },
      { name: 'userId',           type: sql.Int,               value: req.user.userId },
      { name: 'id',               type: sql.Int,               value: parseInt(req.params.id) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Bug not found' });
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: `BUG_${status}`, tableName: 'BugReport', recordId: parseInt(req.params.id),
      moduleId: 'BUGREPORT', newValue: JSON.stringify({ status, resolution_notes }) });
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
