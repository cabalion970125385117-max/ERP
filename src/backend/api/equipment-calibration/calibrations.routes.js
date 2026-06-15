'use strict';

/**
 * MOD-05 Calibration Record Routes
 * GET  /api/v1/mod05/calibrations          — list overdue / due-soon
 * GET  /api/v1/mod05/calibrations/:id      — single record
 * POST /api/v1/mod05/calibrations          — record new calibration (ENGINEER+)
 * PUT  /api/v1/mod05/calibrations/:id      — update (ENGINEER+)
 */

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ---- GET / ---- */
router.get('/', async (req, res) => {
  const { equipment_id, result, limit = 100, offset = 0 } = req.query;
  let where = 'WHERE 1=1';
  const params = [];

  if (equipment_id) {
    where += ' AND cr.equipment_id = @eid';
    params.push({ name: 'eid', type: sql.Int, value: parseInt(equipment_id, 10) });
  }
  if (result) {
    where += ' AND cr.result = @result';
    params.push({ name: 'result', type: sql.NVarChar(12), value: result });
  }

  try {
    const rows = await query(`
      SELECT cr.*, e.equip_code, e.description AS equip_desc,
        u.full_name AS recorded_by_name
      FROM dbo.CalibrationRecord cr
      JOIN dbo.Equipment e ON e.equipment_id = cr.equipment_id
      LEFT JOIN dbo.Users u ON u.user_id = cr.recorded_by
      ${where}
      ORDER BY cr.cal_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [...params,
      { name: 'limit',  type: sql.Int, value: parseInt(limit, 10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ]);
    const tot = await query(`SELECT COUNT(*) AS total FROM dbo.CalibrationRecord cr ${where}`, params);
    res.json({ items: rows, total: tot[0].total });
  } catch (err) {
    console.error('[cals/list]', err.message);
    res.status(500).json({ message: 'Error fetching calibrations.' });
  }
});

/* ---- GET /:id ---- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT cr.*, e.equip_code, e.description AS equip_desc, e.acceptance_criteria AS equip_acceptance,
        u.full_name AS recorded_by_name
      FROM dbo.CalibrationRecord cr
      JOIN dbo.Equipment e ON e.equipment_id = cr.equipment_id
      LEFT JOIN dbo.Users u ON u.user_id = cr.recorded_by
      WHERE cr.cal_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Calibration record not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[cals/get]', err.message);
    res.status(500).json({ message: 'Error fetching calibration record.' });
  }
});

/* ---- POST / ---- */
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const {
    equipment_id, cal_ref, cal_date, cal_vendor, cert_number,
    result, out_of_tolerance, deviation_noted, corrective_action,
    measured_value, acceptance_criteria, notes,
  } = req.body;

  if (!equipment_id || !cal_ref || !cal_date || !result) {
    return res.status(400).json({ message: 'equipment_id, cal_ref, cal_date, result required.' });
  }

  // Compute cal_due_date from equipment's interval
  try {
    const equip = await query(`
      SELECT DATEADD(MONTH, ISNULL(cal_interval_months, 12), CAST(@cal_date AS DATE)) AS cal_due_date
      FROM dbo.Equipment WHERE equipment_id = @id AND is_active = 1
    `, [
      { name: 'id',       type: sql.Int,  value: parseInt(equipment_id, 10) },
      { name: 'cal_date', type: sql.Date, value: new Date(cal_date) },
    ]);
    if (!equip.length) return res.status(404).json({ message: 'Equipment not found.' });
    const dueDate = equip[0].cal_due_date;

    const r = await query(`
      INSERT INTO dbo.CalibrationRecord
        (equipment_id, cal_ref, cal_date, cal_due_date, cal_vendor, cert_number,
         result, out_of_tolerance, deviation_noted, corrective_action,
         measured_value, acceptance_criteria, notes, recorded_by)
      OUTPUT INSERTED.cal_id
      VALUES
        (@eid, @ref, @cal_date, @due_date, @vendor, @cert_no,
         @result, @oot, @dev, @ca,
         @mval, @acc, @notes, @recorder)
    `, [
      { name: 'eid',      type: sql.Int,           value: parseInt(equipment_id, 10) },
      { name: 'ref',      type: sql.NVarChar(30),  value: cal_ref },
      { name: 'cal_date', type: sql.Date,          value: new Date(cal_date) },
      { name: 'due_date', type: sql.Date,          value: dueDate },
      { name: 'vendor',   type: sql.NVarChar(100), value: cal_vendor || null },
      { name: 'cert_no',  type: sql.NVarChar(100), value: cert_number || null },
      { name: 'result',   type: sql.NVarChar(12),  value: result },
      { name: 'oot',      type: sql.Bit,           value: out_of_tolerance ? 1 : 0 },
      { name: 'dev',      type: sql.NVarChar(300), value: deviation_noted || null },
      { name: 'ca',       type: sql.NVarChar(300), value: corrective_action || null },
      { name: 'mval',     type: sql.NVarChar(100), value: measured_value || null },
      { name: 'acc',      type: sql.NVarChar(200), value: acceptance_criteria || null },
      { name: 'notes',    type: sql.NVarChar(500), value: notes || null },
      { name: 'recorder', type: sql.Int,           value: req.user.userId },
    ]);

    const newId = r[0].cal_id;

    // GAP-05: OOT impact — flag equipment WITHDRAWN when out-of-tolerance (AS9100D §7.1.5 / SoR §3)
    if (out_of_tolerance) {
      await query(
        `UPDATE dbo.Equipment SET status = 'WITHDRAWN', updated_at = GETUTCDATE() WHERE equipment_id = @eid AND is_active = 1`,
        [{ name: 'eid', type: sql.Int, value: parseInt(equipment_id, 10) }]
      );
      await auditLog({ userId: req.user.userId, username: req.user.username,
        lanIp: getLanIp(req), action: 'WITHDRAW', tableName: 'Equipment',
        recordId: String(equipment_id), moduleId: 'MOD-05',
        newValue: `WITHDRAWN — OOT on cal_id ${newId}` });
    }

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'INSERT', tableName: 'CalibrationRecord',
      recordId: String(newId), moduleId: 'MOD-05', newValue: req.body });

    res.status(201).json({
      cal_id: newId,
      cal_due_date: dueDate.toISOString().split('T')[0],
      withdrawn: !!out_of_tolerance,
      message: out_of_tolerance
        ? 'Calibration recorded. Equipment flagged WITHDRAWN from service due to out-of-tolerance result.'
        : 'Calibration recorded.',
    });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'Calibration reference already exists.' });
    console.error('[cals/create]', err.message);
    res.status(500).json({ message: 'Error recording calibration.' });
  }
});

/* ---- PUT /:id ---- */
router.put('/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    cal_vendor, cert_number, result, out_of_tolerance,
    deviation_noted, corrective_action, measured_value, notes,
  } = req.body;
  try {
    await query(`
      UPDATE dbo.CalibrationRecord SET
        cal_vendor        = @vendor,
        cert_number       = @cert_no,
        result            = @result,
        out_of_tolerance  = @oot,
        deviation_noted   = @dev,
        corrective_action = @ca,
        measured_value    = @mval,
        notes             = @notes,
        updated_at        = GETUTCDATE()
      WHERE cal_id = @id
    `, [
      { name: 'id',     type: sql.Int,           value: id },
      { name: 'vendor', type: sql.NVarChar(100), value: cal_vendor || null },
      { name: 'cert_no',type: sql.NVarChar(100), value: cert_number || null },
      { name: 'result', type: sql.NVarChar(12),  value: result },
      { name: 'oot',    type: sql.Bit,           value: out_of_tolerance ? 1 : 0 },
      { name: 'dev',    type: sql.NVarChar(300), value: deviation_noted || null },
      { name: 'ca',     type: sql.NVarChar(300), value: corrective_action || null },
      { name: 'mval',   type: sql.NVarChar(100), value: measured_value || null },
      { name: 'notes',  type: sql.NVarChar(500), value: notes || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'CalibrationRecord',
      recordId: String(id), moduleId: 'MOD-05', newValue: req.body });
    res.json({ message: 'Calibration record updated.' });
  } catch (err) {
    console.error('[cals/update]', err.message);
    res.status(500).json({ message: 'Error updating calibration record.' });
  }
});

module.exports = router;
