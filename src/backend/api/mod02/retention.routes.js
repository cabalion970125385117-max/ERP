/**
 * ATCA-ERP v1.0 — MOD-02 Retention Schedule Routes
 * AS9100D §7.5.3 (c) — retention of documented information
 *
 * GET  /api/v1/mod02/retention         — full retention schedule
 * PUT  /api/v1/mod02/retention/:id     — update retention entry (QA_MANAGER+)
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/db');

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.*, c.code AS category_code, c.name AS category_name
      FROM dbo.RetentionSchedule r
      INNER JOIN dbo.DocumentCategory c ON r.category_id = c.category_id
      ORDER BY c.code
    `);
    res.json(rows);
  } catch (err) {
    console.error('[mod02/retention GET]', err.message);
    res.status(500).json({ message: 'Error fetching retention schedule.' });
  }
});

router.put('/:id', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { regulation_ref, retention_years, disposal_method, notes } = req.body;
  try {
    await query(`
      UPDATE dbo.RetentionSchedule
      SET regulation_ref  = ISNULL(@reg,     regulation_ref),
          retention_years = ISNULL(@years,   retention_years),
          disposal_method = ISNULL(@disposal, disposal_method),
          notes           = ISNULL(@notes,   notes)
      WHERE retention_id = @id
    `, [
      { name: 'id',       type: sql.Int,          value: id },
      { name: 'reg',      type: sql.VarChar(50),  value: regulation_ref  || null },
      { name: 'years',    type: sql.TinyInt,       value: retention_years ? parseInt(retention_years, 10) : null },
      { name: 'disposal', type: sql.NVarChar(100), value: disposal_method || null },
      { name: 'notes',    type: sql.NVarChar(300), value: notes           || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'RetentionSchedule', recordId: id, moduleId: 'MOD-02' });
    res.json({ message: 'Retention schedule updated.' });
  } catch (err) {
    console.error('[mod02/retention PUT]', err.message);
    res.status(500).json({ message: 'Error updating retention schedule.' });
  }
});

module.exports = router;
