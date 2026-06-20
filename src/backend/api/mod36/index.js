'use strict';
const express = require('express');
const router  = express.Router();
const { getPool, requireAuth, requireRole } = require('../../middleware');

// ── KPI summary ──────────────────────────────────────────────
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM EquipmentAsset  WHERE is_active = 1)                                    AS total_assets,
        (SELECT COUNT(*) FROM vw_PPMDue       WHERE pm_rag = 'OVERDUE')                               AS overdue_pm,
        (SELECT COUNT(*) FROM vw_PPMDue       WHERE pm_rag = 'DUE_SOON')                              AS due_soon_pm,
        (SELECT COUNT(*) FROM EquipmentAsset  WHERE status = 'UNDER_MAINTENANCE' AND is_active = 1)   AS under_maintenance,
        (SELECT COUNT(*) FROM PPMLog          WHERE performed_date >= DATEADD(DAY,-30,GETDATE()))      AS pm_completed_this_month,
        (SELECT COUNT(*) FROM PPMSchedule     WHERE is_active = 1)                                    AS total_schedules,
        (SELECT COUNT(*) FROM vw_PPMDue       WHERE pm_rag IN ('OVERDUE','DUE_SOON'))                 AS total
    `);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Equipment Assets ─────────────────────────────────────────
router.get('/assets', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT a.*,
         (SELECT COUNT(*) FROM PPMSchedule s WHERE s.asset_id = a.asset_id AND s.is_active = 1) AS schedule_count,
         (SELECT TOP 1 l.performed_date FROM PPMLog l WHERE l.asset_id = a.asset_id ORDER BY l.performed_date DESC) AS last_pm_date
       FROM EquipmentAsset a
       WHERE a.is_active = 1
       ORDER BY a.asset_category, a.asset_tag`
    );
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/assets/:id', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const asset = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM EquipmentAsset WHERE asset_id = @id`);
    if (!asset.recordset.length) return res.status(404).json({ message: 'Asset not found.' });
    const schedules = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM vw_PPMDue WHERE asset_id = @id ORDER BY next_due_date`);
    const logs = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM PPMLog WHERE asset_id = @id ORDER BY performed_date DESC`);
    res.json({ ...asset.recordset[0], schedules: schedules.recordset, recent_logs: logs.recordset });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/assets', requireAuth, requireRole('ENGINEER'), async (req, res) => {
  try {
    const { asset_tag, asset_name, asset_category, location, manufacturer,
            model_number, serial_number, install_date, mod30_oven_ref } = req.body;
    if (!asset_tag || !asset_name || !asset_category)
      return res.status(400).json({ message: 'asset_tag, asset_name and asset_category are required.' });
    const pool = await getPool();
    const r = await pool.request()
      .input('asset_tag',      asset_tag)
      .input('asset_name',     asset_name)
      .input('asset_category', asset_category)
      .input('location',       location       || null)
      .input('manufacturer',   manufacturer   || null)
      .input('model_number',   model_number   || null)
      .input('serial_number',  serial_number  || null)
      .input('install_date',   install_date   || null)
      .input('mod30_oven_ref', mod30_oven_ref || null)
      .query(`INSERT INTO EquipmentAsset
                (asset_tag, asset_name, asset_category, location, manufacturer, model_number, serial_number, install_date, mod30_oven_ref)
              OUTPUT INSERTED.asset_id
              VALUES (@asset_tag, @asset_name, @asset_category, @location, @manufacturer, @model_number, @serial_number, @install_date, @mod30_oven_ref)`);
    res.status(201).json({ asset_id: r.recordset[0].asset_id, message: 'Asset created.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/assets/:id/status', requireAuth, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required.' });
    const pool = await getPool();
    await pool.request()
      .input('id',     req.params.id)
      .input('status', status)
      .query(`UPDATE EquipmentAsset SET status = @status WHERE asset_id = @id`);
    res.json({ message: 'Asset status updated.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PM Schedules ─────────────────────────────────────────────
router.get('/schedules', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT * FROM vw_PPMDue
       ORDER BY CASE pm_rag WHEN 'OVERDUE' THEN 0 WHEN 'DUE_SOON' THEN 1 ELSE 2 END, days_until_due`
    );
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/schedules/:id/checklist', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', req.params.id)
      .query(`SELECT * FROM PPMChecklist WHERE schedule_id = @id ORDER BY task_order`);
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/schedules', requireAuth, requireRole('ENGINEER'), async (req, res) => {
  try {
    const { asset_id, schedule_name, frequency, next_due_date, estimated_hours, assigned_role, notes } = req.body;
    if (!asset_id || !schedule_name || !frequency || !next_due_date)
      return res.status(400).json({ message: 'asset_id, schedule_name, frequency and next_due_date are required.' });
    const pool = await getPool();
    const r = await pool.request()
      .input('asset_id',        asset_id)
      .input('schedule_name',   schedule_name)
      .input('frequency',       frequency)
      .input('next_due_date',   next_due_date)
      .input('estimated_hours', estimated_hours || null)
      .input('assigned_role',   assigned_role  || null)
      .input('notes',           notes          || null)
      .query(`INSERT INTO PPMSchedule (asset_id, schedule_name, frequency, next_due_date, estimated_hours, assigned_role, notes)
              OUTPUT INSERTED.schedule_id
              VALUES (@asset_id, @schedule_name, @frequency, @next_due_date, @estimated_hours, @assigned_role, @notes)`);
    res.status(201).json({ schedule_id: r.recordset[0].schedule_id, message: 'Schedule created.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PM Log ───────────────────────────────────────────────────
router.get('/log', requireAuth, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      `SELECT l.*, s.schedule_name, s.frequency, a.asset_tag, a.asset_name, a.asset_category
       FROM PPMLog l
       JOIN PPMSchedule s ON l.schedule_id = s.schedule_id
       JOIN EquipmentAsset a ON l.asset_id = a.asset_id
       ORDER BY l.performed_date DESC`
    );
    res.json({ items: r.recordset, total: r.recordset.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/log', requireAuth, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const { schedule_id, asset_id, performed_date, duration_hours, status, findings, corrective_action } = req.body;
    if (!schedule_id || !asset_id || !performed_date)
      return res.status(400).json({ message: 'schedule_id, asset_id and performed_date are required.' });
    const pool = await getPool();
    // Record the log entry
    const r = await pool.request()
      .input('schedule_id',       schedule_id)
      .input('asset_id',          asset_id)
      .input('performed_date',    performed_date)
      .input('performed_by',      req.user.full_name || req.user.username)
      .input('duration_hours',    duration_hours    || null)
      .input('status',            status            || 'COMPLETED')
      .input('findings',          findings          || null)
      .input('corrective_action', corrective_action || null)
      .query(`INSERT INTO PPMLog
                (schedule_id, asset_id, performed_date, performed_by, duration_hours, status, findings, corrective_action)
              OUTPUT INSERTED.log_id
              VALUES (@schedule_id, @asset_id, @performed_date, @performed_by, @duration_hours, @status, @findings, @corrective_action)`);
    // Advance next_due_date on the schedule
    await pool.request()
      .input('schedule_id',    schedule_id)
      .input('performed_date', performed_date)
      .query(`UPDATE PPMSchedule SET
                last_done_date = @performed_date,
                next_due_date  = CASE frequency
                  WHEN 'DAILY'       THEN DATEADD(DAY,   1, @performed_date)
                  WHEN 'WEEKLY'      THEN DATEADD(DAY,   7, @performed_date)
                  WHEN 'MONTHLY'     THEN DATEADD(MONTH, 1, @performed_date)
                  WHEN 'QUARTERLY'   THEN DATEADD(MONTH, 3, @performed_date)
                  WHEN 'SEMI_ANNUAL' THEN DATEADD(MONTH, 6, @performed_date)
                  WHEN 'ANNUAL'      THEN DATEADD(YEAR,  1, @performed_date)
                  ELSE next_due_date
                END
              WHERE schedule_id = @schedule_id`);
    res.status(201).json({ log_id: r.recordset[0].log_id, message: 'PM log recorded and schedule advanced.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
