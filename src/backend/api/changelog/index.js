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
        COUNT(*)                                                    AS total_entries,
        SUM(CASE WHEN MONTH(created_at) = MONTH(GETUTCDATE())
                  AND YEAR(created_at)  = YEAR(GETUTCDATE())  THEN 1 ELSE 0 END) AS entries_this_month,
        SUM(CASE WHEN category = 'FEATURE'  THEN 1 ELSE 0 END)    AS feature_count,
        SUM(CASE WHEN category = 'BUGFIX'   THEN 1 ELSE 0 END)    AS bugfix_count
      FROM ChangeLog WHERE is_active = 1
    `, []);
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /entries
router.get('/entries', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    const params = [
      { name: 'limit',  type: sql.Int, value: parseInt(limit)  },
      { name: 'offset', type: sql.Int, value: parseInt(offset) },
    ];
    let where = 'WHERE c.is_active = 1';
    if (category) { where += ' AND c.category = @category'; params.push({ name: 'category', type: sql.NVarChar(20), value: category }); }
    const result = await query(`
      SELECT c.entry_id, c.version, c.category, c.description, c.affected_modules,
             c.notes, c.created_at, u.full_name AS created_by_name
      FROM ChangeLog c
      JOIN Users u ON u.user_id = c.created_by
      ${where}
      ORDER BY c.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /entries
router.post('/entries', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { version, category, description, affected_modules, notes } = req.body;
    const result = await query(`
      INSERT INTO ChangeLog (version, category, description, affected_modules, notes, created_by)
      OUTPUT INSERTED.entry_id, INSERTED.version, INSERTED.category, INSERTED.created_at
      VALUES (@version, @category, @description, @affected_modules, @notes, @userId)
    `, [
      { name: 'version',          type: sql.NVarChar(20),  value: version },
      { name: 'category',         type: sql.NVarChar(20),  value: category },
      { name: 'description',      type: sql.NVarChar(500), value: description },
      { name: 'affected_modules', type: sql.NVarChar(200), value: affected_modules || null },
      { name: 'notes',            type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'userId',           type: sql.Int,           value: req.user.userId },
    ]);
    const row = result.recordset[0];
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE_CHANGELOG', tableName: 'ChangeLog', recordId: row.entry_id,
      moduleId: 'CHANGELOG', newValue: JSON.stringify({ version, category }) });
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
