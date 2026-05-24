/**
 * ATCA-ERP v1.0 — MOD-01 Quality Objectives Routes
 * AS9100D §6.2 — Quality Objectives and Planning to Achieve Them
 *
 * GET    /api/v1/mod01/objectives           — list all (with filters)
 * GET    /api/v1/mod01/objectives/:id       — single objective
 * POST   /api/v1/mod01/objectives           — create (QA_MANAGER+)
 * PUT    /api/v1/mod01/objectives/:id       — update (QA_MANAGER+)
 * DELETE /api/v1/mod01/objectives/:id       — soft-delete (ADMIN)
 * POST   /api/v1/mod01/objectives/:id/measurements — record KPI data point
 * GET    /api/v1/mod01/objectives/:id/measurements — get history
 */

'use strict';

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* -------------------------------------------------------
   GET / — List objectives with optional filters
------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const { status, process_area, limit = 50, offset = 0 } = req.query;

    let where = 'WHERE o.is_active = 1';
    const params = [];

    if (status) {
      where += ' AND o.status = @status';
      params.push({ name: 'status', type: sql.NVarChar(12), value: status });
    }
    if (process_area) {
      where += ' AND o.process_area = @process_area';
      params.push({ name: 'process_area', type: sql.NVarChar(50), value: process_area });
    }

    const rows = await query(`
      SELECT
        o.objective_id, o.objective_ref, o.title, o.description,
        o.as9100d_clause, o.process_area,
        o.target_value, o.target_unit, o.target_date,
        o.measurement_freq, o.status,
        u.full_name AS owner_name,
        o.created_at, o.updated_at,
        -- Latest measurement
        (SELECT TOP 1 m.actual_value
         FROM dbo.QmsObjectiveMeasurement m
         WHERE m.objective_id = o.objective_id
         ORDER BY m.period_date DESC) AS latest_actual,
        (SELECT TOP 1 m.period_label
         FROM dbo.QmsObjectiveMeasurement m
         WHERE m.objective_id = o.objective_id
         ORDER BY m.period_date DESC) AS latest_period
      FROM dbo.QmsObjective o
      LEFT JOIN dbo.Users u ON u.user_id = o.owner_user_id
      ${where}
      ORDER BY o.objective_ref
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      ...params,
      { name: 'limit',  type: sql.Int, value: parseInt(limit,  10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ]);

    // Total count
    const countRows = await query(
      `SELECT COUNT(*) AS total FROM dbo.QmsObjective o ${where}`,
      params
    );

    res.json({ items: rows, total: countRows[0].total });
  } catch (err) {
    console.error('[objectives/list]', err.message);
    res.status(500).json({ message: 'Error fetching objectives.' });
  }
});

/* -------------------------------------------------------
   GET /:id — Single objective
------------------------------------------------------- */
router.get('/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.*, u.full_name AS owner_name
      FROM dbo.QmsObjective o
      LEFT JOIN dbo.Users u ON u.user_id = o.owner_user_id
      WHERE o.objective_id = @id AND o.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) }]);

    if (!rows.length) return res.status(404).json({ message: 'Objective not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[objectives/get]', err.message);
    res.status(500).json({ message: 'Error fetching objective.' });
  }
});

/* -------------------------------------------------------
   POST / — Create objective
------------------------------------------------------- */
router.post('/', requireMinRole('QA_MANAGER'), async (req, res) => {
  const {
    objective_ref, title, description, as9100d_clause,
    process_area, target_value, target_unit, target_date,
    measurement_freq, status, owner_user_id
  } = req.body;

  if (!objective_ref || !title || !target_date) {
    return res.status(400).json({ message: 'objective_ref, title, target_date are required.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.QmsObjective
        (objective_ref, title, description, as9100d_clause, process_area,
         target_value, target_unit, target_date, measurement_freq,
         status, owner_user_id, created_by)
      OUTPUT INSERTED.objective_id
      VALUES
        (@ref, @title, @desc, @clause, @area,
         @tval, @tunit, @tdate, @freq,
         @status, @owner, @creator)
    `, [
      { name: 'ref',     type: sql.NVarChar(20),  value: objective_ref },
      { name: 'title',   type: sql.NVarChar(200), value: title },
      { name: 'desc',    type: sql.NVarChar(sql.MAX), value: description || null },
      { name: 'clause',  type: sql.NVarChar(50),  value: as9100d_clause || null },
      { name: 'area',    type: sql.NVarChar(50),  value: process_area || null },
      { name: 'tval',    type: sql.Decimal(10,2), value: target_value ? parseFloat(target_value) : null },
      { name: 'tunit',   type: sql.NVarChar(30),  value: target_unit || null },
      { name: 'tdate',   type: sql.Date,           value: new Date(target_date) },
      { name: 'freq',    type: sql.NVarChar(15),  value: measurement_freq || 'Monthly' },
      { name: 'status',  type: sql.NVarChar(12),  value: status || 'OPEN' },
      { name: 'owner',   type: sql.Int,            value: parseInt(owner_user_id, 10) || req.user.userId },
      { name: 'creator', type: sql.Int,            value: req.user.userId },
    ]);

    const newId = result[0].objective_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'QmsObjective', recordId: String(newId), moduleId: 'MOD-01', newValue: req.body });

    res.status(201).json({ objective_id: newId, message: 'Objective created.' });
  } catch (err) {
    if (err.number === 2627) return res.status(409).json({ message: 'Objective reference already exists.' });
    console.error('[objectives/create]', err.message);
    res.status(500).json({ message: 'Error creating objective.' });
  }
});

/* -------------------------------------------------------
   PUT /:id — Update objective
------------------------------------------------------- */
router.put('/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    title, description, as9100d_clause, process_area,
    target_value, target_unit, target_date,
    measurement_freq, status, owner_user_id
  } = req.body;

  try {
    // Snapshot old value for audit
    const old = await query(`SELECT * FROM dbo.QmsObjective WHERE objective_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!old.length) return res.status(404).json({ message: 'Objective not found.' });

    await query(`
      UPDATE dbo.QmsObjective SET
        title              = @title,
        description        = @desc,
        as9100d_clause     = @clause,
        process_area       = @area,
        target_value       = @tval,
        target_unit        = @tunit,
        target_date        = @tdate,
        measurement_freq   = @freq,
        status             = @status,
        owner_user_id      = @owner,
        updated_at         = GETUTCDATE()
      WHERE objective_id = @id AND is_active = 1
    `, [
      { name: 'id',     type: sql.Int,            value: id },
      { name: 'title',  type: sql.NVarChar(200),  value: title },
      { name: 'desc',   type: sql.NVarChar(sql.MAX), value: description || null },
      { name: 'clause', type: sql.NVarChar(50),   value: as9100d_clause || null },
      { name: 'area',   type: sql.NVarChar(50),   value: process_area || null },
      { name: 'tval',   type: sql.Decimal(10,2),  value: target_value ? parseFloat(target_value) : null },
      { name: 'tunit',  type: sql.NVarChar(30),   value: target_unit || null },
      { name: 'tdate',  type: sql.Date,            value: new Date(target_date) },
      { name: 'freq',   type: sql.NVarChar(15),   value: measurement_freq || 'Monthly' },
      { name: 'status', type: sql.NVarChar(12),   value: status || 'OPEN' },
      { name: 'owner',  type: sql.Int,             value: parseInt(owner_user_id, 10) || req.user.userId },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'QmsObjective', recordId: String(id), moduleId: 'MOD-01',
      oldValue: old[0], newValue: req.body });

    res.json({ message: 'Objective updated.' });
  } catch (err) {
    console.error('[objectives/update]', err.message);
    res.status(500).json({ message: 'Error updating objective.' });
  }
});

/* -------------------------------------------------------
   DELETE /:id — Soft delete
------------------------------------------------------- */
router.delete('/:id', requireMinRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`UPDATE dbo.QmsObjective SET is_active = 0, updated_at = GETUTCDATE() WHERE objective_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'SOFT_DELETE', tableName: 'QmsObjective', recordId: String(id), moduleId: 'MOD-01' });
    res.json({ message: 'Objective deactivated.' });
  } catch (err) {
    console.error('[objectives/delete]', err.message);
    res.status(500).json({ message: 'Error deactivating objective.' });
  }
});

/* -------------------------------------------------------
   POST /:id/measurements — Record KPI data point
------------------------------------------------------- */
router.post('/:id/measurements', async (req, res) => {
  const objId = parseInt(req.params.id, 10);
  const { period_label, period_date, actual_value, notes } = req.body;

  if (!period_label || !period_date || actual_value === undefined) {
    return res.status(400).json({ message: 'period_label, period_date, actual_value are required.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.QmsObjectiveMeasurement
        (objective_id, period_label, period_date, actual_value, notes, recorded_by)
      OUTPUT INSERTED.measurement_id
      VALUES (@objId, @label, @date, @actual, @notes, @recorder)
    `, [
      { name: 'objId',    type: sql.Int,             value: objId },
      { name: 'label',    type: sql.NVarChar(20),    value: period_label },
      { name: 'date',     type: sql.Date,             value: new Date(period_date) },
      { name: 'actual',   type: sql.Decimal(10,2),   value: parseFloat(actual_value) },
      { name: 'notes',    type: sql.NVarChar(500),   value: notes || null },
      { name: 'recorder', type: sql.Int,              value: req.user.userId },
    ]);

    res.status(201).json({ measurement_id: result[0].measurement_id, message: 'Measurement recorded.' });
  } catch (err) {
    console.error('[objectives/measure]', err.message);
    res.status(500).json({ message: 'Error recording measurement.' });
  }
});

/* -------------------------------------------------------
   GET /:id/measurements — KPI history
------------------------------------------------------- */
router.get('/:id/measurements', async (req, res) => {
  const objId = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT m.*, u.full_name AS recorded_by_name
      FROM dbo.QmsObjectiveMeasurement m
      LEFT JOIN dbo.Users u ON u.user_id = m.recorded_by
      WHERE m.objective_id = @objId
      ORDER BY m.period_date DESC
    `, [{ name: 'objId', type: sql.Int, value: objId }]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[objectives/measurements]', err.message);
    res.status(500).json({ message: 'Error fetching measurements.' });
  }
});

module.exports = router;
