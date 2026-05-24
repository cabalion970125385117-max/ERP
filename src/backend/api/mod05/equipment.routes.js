'use strict';

/**
 * MOD-05 Equipment Routes
 * GET  /api/v1/mod05/equipment          — list with cal status
 * GET  /api/v1/mod05/equipment/:id      — single
 * POST /api/v1/mod05/equipment          — create (ENGINEER+)
 * PUT  /api/v1/mod05/equipment/:id      — update (ENGINEER+)
 * DELETE /api/v1/mod05/equipment/:id   — soft-delete (QA_MANAGER+)
 */

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ---- GET / ---- */
router.get('/', async (req, res) => {
  const { process_area, equip_type, cal_rag, status } = req.query;
  let where = 'WHERE e.is_active = 1';
  const params = [];

  if (process_area) { where += ' AND e.process_area = @area';      params.push({ name: 'area',      type: sql.NVarChar(20), value: process_area }); }
  if (equip_type)   { where += ' AND e.equip_type = @equip_type';  params.push({ name: 'equip_type', type: sql.NVarChar(20), value: equip_type }); }
  if (status)       { where += ' AND e.status = @status';          params.push({ name: 'status',     type: sql.NVarChar(12), value: status }); }

  try {
    let rows = await query(`
      SELECT
        e.equipment_id, e.equip_code, e.description, e.make_model, e.serial_number,
        e.used_for, e.location, e.equip_type, e.process_area,
        e.cal_required, e.cal_interval_months, e.acceptance_criteria,
        e.status AS equip_status,
        cr.cal_date AS last_cal_date,
        cr.cal_due_date,
        cr.result AS last_cal_result,
        cr.cal_vendor,
        DATEDIFF(DAY, GETUTCDATE(), cr.cal_due_date) AS days_until_cal_due,
        CASE
          WHEN e.cal_required = 0 THEN 'NA'
          WHEN cr.cal_id IS NULL  THEN 'NEVER'
          WHEN cr.cal_due_date < CAST(GETUTCDATE() AS DATE) THEN 'OVERDUE'
          WHEN DATEDIFF(DAY, GETUTCDATE(), cr.cal_due_date) <= 30 THEN 'DUE_SOON'
          ELSE 'CURRENT'
        END AS cal_rag_status
      FROM dbo.Equipment e
      LEFT JOIN dbo.CalibrationRecord cr ON cr.cal_id = (
        SELECT TOP 1 cal_id FROM dbo.CalibrationRecord
        WHERE equipment_id = e.equipment_id ORDER BY cal_date DESC
      )
      ${where}
      ORDER BY e.process_area, e.equip_type, e.equip_code
    `, params);

    // Client-side RAG filter (simpler than pushing into SQL HAVING)
    if (cal_rag) {
      rows = rows.filter(r => r.cal_rag_status === cal_rag);
    }

    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[equipment/list]', err.message);
    res.status(500).json({ message: 'Error fetching equipment.' });
  }
});

/* ---- GET /:id ---- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT e.* FROM dbo.Equipment e WHERE e.equipment_id = @id AND e.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Equipment not found.' });

    const cals = await query(`
      SELECT cr.*, u.full_name AS recorded_by_name
      FROM dbo.CalibrationRecord cr
      LEFT JOIN dbo.Users u ON u.user_id = cr.recorded_by
      WHERE cr.equipment_id = @id
      ORDER BY cr.cal_date DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);

    res.json({ ...rows[0], calibration_history: cals });
  } catch (err) {
    console.error('[equipment/get]', err.message);
    res.status(500).json({ message: 'Error fetching equipment.' });
  }
});

/* ---- POST / ---- */
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const {
    equip_code, description, make_model, serial_number, used_for,
    location, equip_type, process_area, cal_required, cal_interval_months,
    acceptance_criteria, cal_vendor,
  } = req.body;

  if (!equip_code || !description || !equip_type) {
    return res.status(400).json({ message: 'equip_code, description, equip_type required.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.Equipment
        (equip_code, description, make_model, serial_number, used_for,
         location, equip_type, process_area, cal_required, cal_interval_months,
         acceptance_criteria, cal_vendor, created_by)
      OUTPUT INSERTED.equipment_id
      VALUES
        (@code, @desc, @make, @sn, @used,
         @loc, @type, @area, @cal_req, @cal_int,
         @acc_crit, @vendor, @creator)
    `, [
      { name: 'code',     type: sql.NVarChar(50),  value: equip_code },
      { name: 'desc',     type: sql.NVarChar(200), value: description },
      { name: 'make',     type: sql.NVarChar(100), value: make_model || null },
      { name: 'sn',       type: sql.NVarChar(100), value: serial_number || null },
      { name: 'used',     type: sql.NVarChar(200), value: used_for || null },
      { name: 'loc',      type: sql.NVarChar(100), value: location || 'ATCA FPI Lab' },
      { name: 'type',     type: sql.NVarChar(20),  value: equip_type },
      { name: 'area',     type: sql.NVarChar(20),  value: process_area || 'FPI' },
      { name: 'cal_req',  type: sql.Bit,           value: cal_required !== false ? 1 : 0 },
      { name: 'cal_int',  type: sql.TinyInt,       value: cal_interval_months ? parseInt(cal_interval_months, 10) : null },
      { name: 'acc_crit', type: sql.NVarChar(300), value: acceptance_criteria || null },
      { name: 'vendor',   type: sql.NVarChar(100), value: cal_vendor || null },
      { name: 'creator',  type: sql.Int,           value: req.user.userId },
    ]);
    const newId = result[0].equipment_id;
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'INSERT', tableName: 'Equipment',
      recordId: String(newId), moduleId: 'MOD-05', newValue: req.body });
    res.status(201).json({ equipment_id: newId, message: 'Equipment registered.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'Equipment code already exists.' });
    console.error('[equipment/create]', err.message);
    res.status(500).json({ message: 'Error creating equipment.' });
  }
});

/* ---- PUT /:id ---- */
router.put('/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    description, make_model, serial_number, used_for, location,
    equip_type, process_area, cal_required, cal_interval_months,
    acceptance_criteria, cal_vendor, status,
  } = req.body;
  try {
    await query(`
      UPDATE dbo.Equipment SET
        description         = @desc,
        make_model          = @make,
        serial_number       = @sn,
        used_for            = @used,
        location            = @loc,
        equip_type          = @type,
        process_area        = @area,
        cal_required        = @cal_req,
        cal_interval_months = @cal_int,
        acceptance_criteria = @acc_crit,
        cal_vendor          = @vendor,
        status              = @status,
        updated_at          = GETUTCDATE()
      WHERE equipment_id = @id AND is_active = 1
    `, [
      { name: 'id',       type: sql.Int,           value: id },
      { name: 'desc',     type: sql.NVarChar(200), value: description },
      { name: 'make',     type: sql.NVarChar(100), value: make_model || null },
      { name: 'sn',       type: sql.NVarChar(100), value: serial_number || null },
      { name: 'used',     type: sql.NVarChar(200), value: used_for || null },
      { name: 'loc',      type: sql.NVarChar(100), value: location || 'ATCA FPI Lab' },
      { name: 'type',     type: sql.NVarChar(20),  value: equip_type },
      { name: 'area',     type: sql.NVarChar(20),  value: process_area || 'FPI' },
      { name: 'cal_req',  type: sql.Bit,           value: cal_required !== false ? 1 : 0 },
      { name: 'cal_int',  type: sql.TinyInt,       value: cal_interval_months ? parseInt(cal_interval_months, 10) : null },
      { name: 'acc_crit', type: sql.NVarChar(300), value: acceptance_criteria || null },
      { name: 'vendor',   type: sql.NVarChar(100), value: cal_vendor || null },
      { name: 'status',   type: sql.NVarChar(12),  value: status || 'ACTIVE' },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'Equipment',
      recordId: String(id), moduleId: 'MOD-05', newValue: req.body });
    res.json({ message: 'Equipment updated.' });
  } catch (err) {
    console.error('[equipment/update]', err.message);
    res.status(500).json({ message: 'Error updating equipment.' });
  }
});

/* ---- DELETE /:id ---- */
router.delete('/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`UPDATE dbo.Equipment SET is_active = 0, updated_at = GETUTCDATE() WHERE equipment_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'SOFT_DELETE', tableName: 'Equipment',
      recordId: String(id), moduleId: 'MOD-05' });
    res.json({ message: 'Equipment deactivated.' });
  } catch (err) {
    console.error('[equipment/delete]', err.message);
    res.status(500).json({ message: 'Error deactivating equipment.' });
  }
});

module.exports = router;
