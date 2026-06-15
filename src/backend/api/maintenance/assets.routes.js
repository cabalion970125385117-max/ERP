'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/assets', async (req, res) => {
  try {
    const { status, category } = req.query;
    let where = 'WHERE a.is_active = 1';
    const params = [];
    if (status) { where += ' AND a.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    if (category) { where += ' AND a.category = @category'; params.push({ name: 'category', type: sql.NVarChar, value: category }); }
    const r = await query(`
      SELECT a.*, u.full_name AS created_by_name,
        (SELECT COUNT(*) FROM PmSchedule s WHERE s.asset_id = a.asset_id AND s.is_active = 1) AS schedule_count,
        (SELECT MIN(s.next_due_date) FROM PmSchedule s WHERE s.asset_id = a.asset_id AND s.is_active = 1) AS next_pm_due
      FROM MaintenanceAsset a
      LEFT JOIN Users u ON u.user_id = a.created_by
      ${where} ORDER BY a.name
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/assets/:id', async (req, res) => {
  try {
    const r = await query(`
      SELECT a.*, u.full_name AS created_by_name
      FROM MaintenanceAsset a LEFT JOIN Users u ON u.user_id = a.created_by
      WHERE a.asset_id = @id AND a.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    if (!r.recordset.length) return res.status(404).json({ error: 'Not found' });
    const asset = r.recordset[0];
    const sched = await query('SELECT s.*, u.full_name AS assigned_name FROM PmSchedule s LEFT JOIN Users u ON u.user_id = s.assigned_to WHERE s.asset_id = @id AND s.is_active = 1 ORDER BY s.next_due_date', [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    const recs = await query('SELECT r.*, u.full_name AS performed_name FROM MaintenanceRecord r LEFT JOIN Users u ON u.user_id = r.performed_by WHERE r.asset_id = @id AND r.is_active = 1 ORDER BY r.start_datetime DESC', [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    asset.schedules = sched.recordset;
    asset.records = recs.recordset;
    res.json(asset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/assets', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { name, category, make, model, serial_no, location, equipment_id, notes } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod11Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod11Sequence', []);
    const code = `MA-${yr}-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO MaintenanceAsset (asset_code, name, category, make, model, serial_no, location, equipment_id, notes, created_by)
      OUTPUT INSERTED.asset_id
      VALUES (@code, @name, @category, @make, @model, @serial_no, @location, @eq, @notes, @uid)
    `, [
      { name: 'code', type: sql.NVarChar, value: code },
      { name: 'name', type: sql.NVarChar, value: name },
      { name: 'category', type: sql.NVarChar, value: category },
      { name: 'make', type: sql.NVarChar, value: make || null },
      { name: 'model', type: sql.NVarChar, value: model || null },
      { name: 'serial_no', type: sql.NVarChar, value: serial_no || null },
      { name: 'location', type: sql.NVarChar, value: location || null },
      { name: 'eq', type: sql.Int, value: equipment_id || null },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].asset_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'MaintenanceAsset', recordId: id, moduleId: 'MOD-11', newValue: JSON.stringify({ code, name }) });
    res.status(201).json({ asset_id: id, asset_code: code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/assets/:id/status', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { status } = req.body;
    await query('UPDATE MaintenanceAsset SET status = @status, updated_at = GETUTCDATE() WHERE asset_id = @id AND is_active = 1', [
      { name: 'status', type: sql.NVarChar, value: status },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'STATUS_CHANGE', tableName: 'MaintenanceAsset', recordId: +req.params.id, moduleId: 'MOD-11', newValue: status });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PM schedule CRUD
router.post('/assets/:id/schedules', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { frequency_type, frequency_value, next_due_date, nadcap_flag, procedure_ref, description, assigned_to } = req.body;
    const r = await query(`
      INSERT INTO PmSchedule (asset_id, frequency_type, frequency_value, next_due_date, nadcap_flag, procedure_ref, description, assigned_to, created_by)
      OUTPUT INSERTED.schedule_id
      VALUES (@aid, @ft, @fv, @ndd, @nf, @pr, @desc, @at, @uid)
    `, [
      { name: 'aid', type: sql.Int, value: +req.params.id },
      { name: 'ft', type: sql.NVarChar, value: frequency_type },
      { name: 'fv', type: sql.Int, value: frequency_value || 1 },
      { name: 'ndd', type: sql.Date, value: next_due_date },
      { name: 'nf', type: sql.Bit, value: nadcap_flag ? 1 : 0 },
      { name: 'pr', type: sql.NVarChar, value: procedure_ref || null },
      { name: 'desc', type: sql.NVarChar, value: description || null },
      { name: 'at', type: sql.Int, value: assigned_to || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    res.status(201).json({ schedule_id: r.recordset[0].schedule_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Maintenance record
router.post('/records', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { asset_id, schedule_id, type, start_datetime, end_datetime, downtime_mins, outcome, root_cause, findings, recalibration_required, notes } = req.body;
    const r = await query(`
      INSERT INTO MaintenanceRecord (asset_id, schedule_id, type, performed_by, start_datetime, end_datetime, downtime_mins, outcome, root_cause, findings, recalibration_required, notes, created_by)
      OUTPUT INSERTED.record_id
      VALUES (@aid, @sid, @type, @uid, @sd, @ed, @dm, @out, @rc, @findings, @recal, @notes, @uid)
    `, [
      { name: 'aid', type: sql.Int, value: asset_id },
      { name: 'sid', type: sql.Int, value: schedule_id || null },
      { name: 'type', type: sql.NVarChar, value: type },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'sd', type: sql.DateTime2, value: start_datetime },
      { name: 'ed', type: sql.DateTime2, value: end_datetime || null },
      { name: 'dm', type: sql.Int, value: downtime_mins || null },
      { name: 'out', type: sql.NVarChar, value: outcome },
      { name: 'rc', type: sql.NVarChar, value: root_cause || null },
      { name: 'findings', type: sql.NVarChar, value: findings || null },
      { name: 'recal', type: sql.Bit, value: recalibration_required ? 1 : 0 },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
    ]);
    if (schedule_id) {
      await query('UPDATE PmSchedule SET last_done_date = CAST(GETUTCDATE() AS DATE), updated_at = GETUTCDATE() WHERE schedule_id = @sid', [{ name: 'sid', type: sql.Int, value: schedule_id }]);
    }
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'MaintenanceRecord', recordId: r.recordset[0].record_id, moduleId: 'MOD-11', newValue: JSON.stringify({ asset_id, type, outcome }) });
    res.status(201).json({ record_id: r.recordset[0].record_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
