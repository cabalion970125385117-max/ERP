'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole } = require('../../middleware/auth');

router.get('/schedules', async (req, res) => {
  try {
    const r = await query(`
      SELECT s.*, a.name AS asset_name, a.asset_code, a.category,
             u.full_name AS assigned_name,
             CASE WHEN s.next_due_date < CAST(GETUTCDATE() AS DATE) THEN 'OVERDUE'
                  WHEN s.next_due_date <= DATEADD(day,7,CAST(GETUTCDATE() AS DATE)) THEN 'DUE_SOON'
                  ELSE 'OK' END AS rag_status
      FROM PmSchedule s
      JOIN MaintenanceAsset a ON a.asset_id = s.asset_id
      LEFT JOIN Users u ON u.user_id = s.assigned_to
      WHERE s.is_active = 1 AND a.is_active = 1
      ORDER BY s.next_due_date
    `, []);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/schedules/:id', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { next_due_date, assigned_to, procedure_ref, description } = req.body;
    await query(`UPDATE PmSchedule SET next_due_date = @ndd, assigned_to = @at, procedure_ref = @pr, description = @desc, updated_at = GETUTCDATE() WHERE schedule_id = @id AND is_active = 1`, [
      { name: 'ndd', type: sql.Date, value: next_due_date },
      { name: 'at', type: sql.Int, value: assigned_to || null },
      { name: 'pr', type: sql.NVarChar, value: procedure_ref || null },
      { name: 'desc', type: sql.NVarChar, value: description || null },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
