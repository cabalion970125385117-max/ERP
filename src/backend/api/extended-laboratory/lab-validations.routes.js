'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { result = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT lv.validation_id, lv.validation_ref, lv.validation_type, lv.description,
             lv.process_area, lv.validation_date, lv.next_review_date, lv.result,
             p.full_name AS performed_by_name,
             a.full_name AS approved_by_name,
             DATEDIFF(day, GETDATE(), lv.next_review_date) AS days_to_review
      FROM dbo.LabValidationRecord lv
      JOIN dbo.Personnel p ON p.personnel_id=lv.performed_by
      LEFT JOIN dbo.Personnel a ON a.personnel_id=lv.approved_by
      WHERE lv.is_active=1 AND (@result='' OR lv.result=@result)
      ORDER BY lv.validation_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'result', type: sql.NVarChar(20), value: result },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.LabValidationRecord WHERE is_active=1 AND (@result='' OR result=@result)`,
      [{ name: 'result', type: sql.NVarChar(20), value: result }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { validation_type, description, equipment_id, process_area, standard_ref,
            validation_date, next_review_date, performed_by, result, validation_notes } = req.body;
    if (!description || !performed_by || !result) return res.status(400).json({ message: 'description, performed_by, result required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod19Sequence SET last_num=last_num+1 WHERE seq_key='LAB_VALIDATION';
      SELECT last_num FROM dbo.Mod19Sequence WHERE seq_key='LAB_VALIDATION';
    `);
    const validation_ref = `LV-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.LabValidationRecord (validation_ref,validation_type,description,equipment_id,process_area,
        standard_ref,validation_date,next_review_date,performed_by,result,validation_notes)
      OUTPUT INSERTED.validation_id
      VALUES (@ref,@type,@desc,@eid,@pa,@std,@vd,@nrd,@pb,@res,@notes)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: validation_ref },
      { name: 'type',  type: sql.NVarChar(30),  value: validation_type || 'METHOD' },
      { name: 'desc',  type: sql.NVarChar(300), value: description },
      { name: 'eid',   type: sql.Int,           value: equipment_id || null },
      { name: 'pa',    type: sql.NVarChar(50),  value: process_area || null },
      { name: 'std',   type: sql.NVarChar(100), value: standard_ref || null },
      { name: 'vd',    type: sql.Date,          value: validation_date || null },
      { name: 'nrd',   type: sql.Date,          value: next_review_date || null },
      { name: 'pb',    type: sql.Int,           value: parseInt(performed_by) },
      { name: 'res',   type: sql.NVarChar(20),  value: result },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: validation_notes || null },
    ]);
    const validation_id = ins[0].validation_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'LabValidationRecord', recordId: validation_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ validation_ref, result }) });
    res.status(201).json({ validation_id, validation_ref, message: 'Lab validation recorded.' });
  } catch (err) {
    console.error('[mod19/lab-validations POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
