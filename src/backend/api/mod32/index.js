/**
 * ATCA-ERP v1.0 — MOD-32 Bay Load Scheduler + Tank-Fit Check
 * AS9100D §8.1 | PCM tank-envelope validation
 *
 * GET  /mod32/alerts/summary
 * GET  /mod32/schedule?date=&bay=
 * POST /mod32/schedule              (SUPERVISOR+)
 * PUT  /mod32/schedule/:id          (SUPERVISOR+)
 * GET  /mod32/tank-fit?bay=&len=&wid=&dep=
 * GET  /mod32/bay-load?date=
 * GET  /mod32/lines
 */
'use strict';

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [r] = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.BaySchedule
         WHERE scheduled_date = @today AND status NOT IN ('CANCELLED','COMPLETED')) AS scheduled_today,
        (SELECT COUNT(*) FROM dbo.BaySchedule
         WHERE oversize_flagged=1 AND status NOT IN ('CANCELLED','COMPLETED')) AS oversize_flagged,
        (SELECT COUNT(*) FROM dbo.BaySchedule
         WHERE status='PENDING'
         AND scheduled_date <= DATEADD(day,1,CAST(GETUTCDATE() AS DATE))) AS pending_confirmation,
        (SELECT COUNT(*) FROM dbo.BaySchedule
         WHERE status='IN_PROGRESS') AS in_progress
    `, [{ name: 'today', type: sql.Date, value: today }]);
    res.json({ ...r, total: r.oversize_flagged + r.pending_confirmation });
  } catch (err) {
    console.error('[mod32/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching scheduler summary.' });
  }
});

/* ── GET /schedule ───────────────────────────────────────────── */
router.get('/schedule', async (req, res) => {
  const { date, bay } = req.query;
  const schedDate = date || new Date().toISOString().slice(0, 10);
  try {
    const params = [{ name: 'date', type: sql.Date, value: schedDate }];
    let where = 'WHERE s.scheduled_date = @date';
    if (bay) {
      where += ' AND s.bay = @bay';
      params.push({ name: 'bay', type: sql.NVarChar(10), value: bay });
    }
    const rows = await query(`
      SELECT s.schedule_id, s.schedule_ref, s.job_description, s.customer_code,
             s.process_area, s.bay, s.line_code, s.shift,
             s.part_len_cm, s.part_wid_cm, s.part_dep_cm, s.part_qty,
             s.fit_checked, s.fit_result, s.oversize_flagged, s.fit_notes,
             s.is_manual, s.priority, s.status, s.notes,
             s.scheduled_date, s.created_at,
             cb.bath_code AS tank_code, cb.bath_type AS tank_type,
             cb.max_len_cm AS tank_len, cb.max_wid_cm AS tank_wid, cb.max_dep_cm AS tank_dep
      FROM dbo.BaySchedule s
      LEFT JOIN dbo.ChemBath cb ON cb.bath_id = s.assigned_tank_id
      ${where}
      ORDER BY s.shift, s.priority, s.created_at
    `, params);
    res.json({ items: rows, total: rows.length, date: schedDate });
  } catch (err) {
    console.error('[mod32/schedule]', err.message);
    res.status(500).json({ message: 'Error fetching schedule.' });
  }
});

/* ── POST /schedule ──────────────────────────────────────────── */
router.post('/schedule', requireMinRole('SUPERVISOR'), async (req, res) => {
  const {
    job_description, customer_code, process_area, bay, line_code,
    assigned_tank_id, scheduled_date, shift,
    part_len_cm, part_wid_cm, part_dep_cm, part_qty,
    is_manual, priority, notes
  } = req.body;

  if (!job_description || !process_area || !bay || !shift) {
    return res.status(400).json({ message: 'job_description, process_area, bay and shift are required.' });
  }

  const sDate = scheduled_date || new Date().toISOString().slice(0, 10);

  // Tank-fit check if dimensions and tank provided
  let fitResult = 'N/A', oversized = 0, fitNotes = null;
  if (assigned_tank_id && part_len_cm && part_wid_cm && part_dep_cm) {
    const tanks = await query(`
      SELECT max_len_cm, max_wid_cm, max_dep_cm FROM dbo.ChemBath WHERE bath_id=@id`,
      [{ name: 'id', type: sql.Int, value: parseInt(assigned_tank_id) }]);
    if (tanks.length) {
      const t = tanks[0];
      const fits = (part_len_cm <= (t.max_len_cm || 9999)) &&
                   (part_wid_cm <= (t.max_wid_cm || 9999)) &&
                   (part_dep_cm <= (t.max_dep_cm || 9999));
      fitResult = fits ? 'PASS' : 'FAIL';
      oversized = fits ? 0 : 1;
      if (!fits) {
        fitNotes = `Part ${part_len_cm}×${part_wid_cm}×${part_dep_cm} cm exceeds tank envelope ` +
                   `${t.max_len_cm||'?'}×${t.max_wid_cm||'?'}×${t.max_dep_cm||'?'} cm.`;
      }
    }
  }

  const initialStatus = oversized ? 'OVERSIZE' : 'PENDING';

  try {
    const result = await query(`
      INSERT INTO dbo.BaySchedule
        (job_description, customer_code, process_area, bay, line_code, assigned_tank_id,
         scheduled_date, shift, part_len_cm, part_wid_cm, part_dep_cm, part_qty,
         fit_checked, fit_result, oversize_flagged, fit_notes,
         is_manual, priority, status, notes, scheduled_by)
      OUTPUT INSERTED.schedule_id, INSERTED.schedule_ref
      VALUES (@jd, @cc, @pa, @bay, @lc, @tid,
              @sdate, @shift, @plen, @pwid, @pdep, @qty,
              @fc, @fr, @of, @fn, @im, @pri, @st, @notes, @by)
    `, [
      { name: 'jd',    type: sql.NVarChar(200), value: job_description },
      { name: 'cc',    type: sql.NVarChar(50),  value: customer_code || null },
      { name: 'pa',    type: sql.NVarChar(100), value: process_area },
      { name: 'bay',   type: sql.NVarChar(10),  value: bay },
      { name: 'lc',    type: sql.NVarChar(20),  value: line_code || null },
      { name: 'tid',   type: sql.Int,           value: assigned_tank_id ? parseInt(assigned_tank_id) : null },
      { name: 'sdate', type: sql.Date,          value: sDate },
      { name: 'shift', type: sql.NVarChar(10),  value: shift },
      { name: 'plen',  type: sql.Decimal(8,1),  value: part_len_cm ? parseFloat(part_len_cm) : null },
      { name: 'pwid',  type: sql.Decimal(8,1),  value: part_wid_cm ? parseFloat(part_wid_cm) : null },
      { name: 'pdep',  type: sql.Decimal(8,1),  value: part_dep_cm ? parseFloat(part_dep_cm) : null },
      { name: 'qty',   type: sql.Int,           value: parseInt(part_qty) || 1 },
      { name: 'fc',    type: sql.Bit,           value: assigned_tank_id && part_len_cm ? 1 : 0 },
      { name: 'fr',    type: sql.NVarChar(10),  value: fitResult },
      { name: 'of',    type: sql.Bit,           value: oversized },
      { name: 'fn',    type: sql.NVarChar(400), value: fitNotes },
      { name: 'im',    type: sql.Bit,           value: is_manual ? 1 : 0 },
      { name: 'pri',   type: sql.Int,           value: parseInt(priority) || 3 },
      { name: 'st',    type: sql.NVarChar(20),  value: initialStatus },
      { name: 'notes', type: sql.NVarChar(500), value: notes || null },
      { name: 'by',    type: sql.Int,           value: req.user.userId },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'CREATE', tableName: 'BaySchedule',
      recordId: String(result[0].schedule_id), moduleId: 'MOD-32',
      newValue: `${initialStatus} | bay=${bay} | fit=${fitResult}` });

    res.status(201).json({
      message: oversized
        ? 'Schedule entry created — OVERSIZE flagged; part exceeds tank envelope.'
        : 'Schedule entry created.',
      schedule_id: result[0].schedule_id,
      schedule_ref: result[0].schedule_ref,
      fit_result: fitResult,
      oversize_flagged: !!oversized,
      fit_notes: fitNotes,
    });
  } catch (err) {
    console.error('[mod32/schedule POST]', err.message);
    res.status(500).json({ message: 'Error creating schedule entry.' });
  }
});

/* ── PUT /schedule/:id ───────────────────────────────────────── */
router.put('/schedule/:id', requireMinRole('SUPERVISOR'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, notes, confirmed_by } = req.body;
  const allowed = ['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','OVERSIZE'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ message: `Invalid status. Allowed: ${allowed.join(',')}` });
  }
  try {
    const existing = await query(`SELECT status FROM dbo.BaySchedule WHERE schedule_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!existing.length) return res.status(404).json({ message: 'Schedule entry not found.' });

    const sets = ['updated_at=GETUTCDATE()'];
    const params = [{ name: 'id', type: sql.Int, value: id }];
    if (status) { sets.push('status=@st'); params.push({ name: 'st', type: sql.NVarChar(20), value: status }); }
    if (notes !== undefined) { sets.push('notes=@notes'); params.push({ name: 'notes', type: sql.NVarChar(500), value: notes }); }
    if (status === 'COMPLETED') { sets.push('completed_at=GETUTCDATE()'); }
    if (confirmed_by) { sets.push('confirmed_by=@cb'); params.push({ name: 'cb', type: sql.Int, value: parseInt(confirmed_by) }); }

    await query(`UPDATE dbo.BaySchedule SET ${sets.join(',')} WHERE schedule_id=@id`, params);

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'BaySchedule',
      recordId: String(id), moduleId: 'MOD-32',
      oldValue: existing[0].status, newValue: status || existing[0].status });

    res.json({ message: 'Schedule entry updated.' });
  } catch (err) {
    console.error('[mod32/schedule PUT]', err.message);
    res.status(500).json({ message: 'Error updating schedule entry.' });
  }
});

/* ── GET /tank-fit ───────────────────────────────────────────── */
router.get('/tank-fit', async (req, res) => {
  const { bay, len, wid, dep, process_category } = req.query;
  if (!len || !wid || !dep) {
    return res.status(400).json({ message: 'len, wid, and dep (cm) are required.' });
  }
  try {
    const params = [
      { name: 'len', type: sql.Decimal(8,1), value: parseFloat(len) },
      { name: 'wid', type: sql.Decimal(8,1), value: parseFloat(wid) },
      { name: 'dep', type: sql.Decimal(8,1), value: parseFloat(dep) },
    ];
    let where = `WHERE is_active=1
      AND (max_len_cm IS NULL OR max_len_cm >= @len)
      AND (max_wid_cm IS NULL OR max_wid_cm >= @wid)
      AND (max_dep_cm IS NULL OR max_dep_cm >= @dep)`;
    if (bay) {
      where += ' AND bay=@bay';
      params.push({ name: 'bay', type: sql.NVarChar(10), value: bay });
    }
    if (process_category) {
      where += ' AND process_category=@pcat';
      params.push({ name: 'pcat', type: sql.NVarChar(30), value: process_category });
    }
    const rows = await query(`
      SELECT bath_id, bath_code, bath_name, bath_type, bay, process_category,
             max_len_cm, max_wid_cm, max_dep_cm, rag_status, status
      FROM dbo.ChemBath ${where}
      ORDER BY bay, bath_code
    `, params);
    res.json({
      part_dims: { len: parseFloat(len), wid: parseFloat(wid), dep: parseFloat(dep) },
      eligible_tanks: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error('[mod32/tank-fit]', err.message);
    res.status(500).json({ message: 'Error checking tank fit.' });
  }
});

/* ── GET /bay-load ───────────────────────────────────────────── */
router.get('/bay-load', async (req, res) => {
  const { date } = req.query;
  const loadDate = date || new Date().toISOString().slice(0, 10);
  try {
    const rows = await query(`
      SELECT scheduled_date, bay, shift,
             total_slots, oversize_count, pending_count, confirmed_count,
             inprogress_count, completed_count
      FROM dbo.vw_BayLoad
      WHERE scheduled_date = @date
      ORDER BY bay, shift
    `, [{ name: 'date', type: sql.Date, value: loadDate }]);
    res.json({ items: rows, date: loadDate });
  } catch (err) {
    console.error('[mod32/bay-load]', err.message);
    res.status(500).json({ message: 'Error fetching bay load.' });
  }
});

/* ── GET /lines ──────────────────────────────────────────────── */
router.get('/lines', async (req, res) => {
  try {
    const rows = await query(`
      SELECT line_id, bay, line_code, line_name, process_area, max_slots_per_shift, is_active
      FROM dbo.BayLine WHERE is_active=1 ORDER BY bay, line_code
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod32/lines]', err.message);
    res.status(500).json({ message: 'Error fetching bay lines.' });
  }
});

module.exports = router;
