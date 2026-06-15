'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT sc.checklist_id, sc.checklist_ref, sc.shift_type, sc.check_date, sc.process_area,
             sc.status,
             p.full_name AS checked_by_name,
             s.full_name AS supervisor_name
      FROM dbo.ShiftChecklist sc
      JOIN dbo.Personnel p ON p.personnel_id=sc.checked_by
      LEFT JOIN dbo.Personnel s ON s.personnel_id=sc.supervisor_id
      WHERE sc.is_active=1 AND (@status='' OR sc.status=@status)
      ORDER BY sc.check_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.ShiftChecklist WHERE is_active=1 AND (@status='' OR status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const body = req.body;
    if (!body.checked_by || !body.process_area) return res.status(400).json({ message: 'checked_by and process_area required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod10Sequence SET last_num=last_num+1 WHERE seq_key='SHIFT_CHECKLIST';
      SELECT last_num FROM dbo.Mod10Sequence WHERE seq_key='SHIFT_CHECKLIST';
    `);
    const checklist_ref = `SC-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.ShiftChecklist (checklist_ref,shift_type,check_date,process_area,checked_by,supervisor_id,
        equipment_ready,chemicals_ok,ppe_available,lighting_ok,safety_station_ok,prev_shift_issues,
        housekeeping_ok,readings_recorded,uv_lamp_checked,penetrant_level_ok,
        demagnetiser_ok,particle_conc_ok,checklist_notes)
      OUTPUT INSERTED.checklist_id
      VALUES (@ref,@st,@cd,@pa,@cb,@sid,@er,@co,@ppe,@lo,@sso,@psi,@hk,@rr,@uv,@pl,@dm,@pc,@notes)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: checklist_ref },
      { name: 'st',    type: sql.NVarChar(10),  value: body.shift_type || 'DAY' },
      { name: 'cd',    type: sql.Date,          value: body.check_date || null },
      { name: 'pa',    type: sql.NVarChar(50),  value: body.process_area },
      { name: 'cb',    type: sql.Int,           value: parseInt(body.checked_by) },
      { name: 'sid',   type: sql.Int,           value: body.supervisor_id || null },
      { name: 'er',    type: sql.Bit,           value: body.equipment_ready ? 1 : 0 },
      { name: 'co',    type: sql.Bit,           value: body.chemicals_ok ? 1 : 0 },
      { name: 'ppe',   type: sql.Bit,           value: body.ppe_available ? 1 : 0 },
      { name: 'lo',    type: sql.Bit,           value: body.lighting_ok ? 1 : 0 },
      { name: 'sso',   type: sql.Bit,           value: body.safety_station_ok ? 1 : 0 },
      { name: 'psi',   type: sql.NVarChar(sql.MAX), value: body.prev_shift_issues || null },
      { name: 'hk',    type: sql.Bit,           value: body.housekeeping_ok ? 1 : 0 },
      { name: 'rr',    type: sql.Bit,           value: body.readings_recorded ? 1 : 0 },
      { name: 'uv',    type: sql.Bit,           value: body.uv_lamp_checked ? 1 : 0 },
      { name: 'pl',    type: sql.Bit,           value: body.penetrant_level_ok ? 1 : 0 },
      { name: 'dm',    type: sql.Bit,           value: body.demagnetiser_ok ? 1 : 0 },
      { name: 'pc',    type: sql.Bit,           value: body.particle_conc_ok ? 1 : 0 },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: body.checklist_notes || null },
    ]);
    const checklist_id = ins[0].checklist_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'ShiftChecklist', recordId: checklist_id, moduleId: 'MOD-10',
      newValue: JSON.stringify({ checklist_ref, process_area: body.process_area }) });
    res.status(201).json({ checklist_id, checklist_ref, message: 'Shift checklist submitted.' });
  } catch (err) {
    console.error('[mod10/shift-checklists POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/approve', requireAuth, requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { supervisor_sign } = req.body;
    await query(`
      UPDATE dbo.ShiftChecklist
      SET status='APPROVED', supervisor_sign=@sign, supervisor_at=GETUTCDATE(), updated_at=GETUTCDATE()
      WHERE checklist_id=@id AND is_active=1
    `, [
      { name: 'sign', type: sql.NVarChar(100), value: supervisor_sign || req.session.username },
      { name: 'id',   type: sql.Int,           value: id },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CHECKLIST_APPROVED', tableName: 'ShiftChecklist', recordId: id, moduleId: 'MOD-10' });
    res.json({ message: 'Shift checklist approved.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
