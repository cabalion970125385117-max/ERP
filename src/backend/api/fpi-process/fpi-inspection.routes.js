/**
 * ATCA-ERP v1.0 — MOD-03 FPI Process Control Routes
 * NADCAP AC7114 | ASTM E1417 | AMS 2644 | NAS410
 *
 * GET    /api/v1/mod03/jobs                         — list FPI jobs
 * POST   /api/v1/mod03/jobs                         — create job + auto-create steps (NDT_INSPECTOR+)
 * GET    /api/v1/mod03/jobs/:id                     — job detail with steps
 * PUT    /api/v1/mod03/jobs/:id/cancel              — cancel job (SUPERVISOR+)
 * POST   /api/v1/mod03/jobs/:id/steps/:seq/signoff  — sign off a step (NDT_INSPECTOR+)
 * POST   /api/v1/mod03/jobs/:id/result              — record final disposition (SUPERVISOR+)
 * GET    /api/v1/mod03/jobs/:id/traveler            — full traveler data
 * GET    /api/v1/mod03/alerts/summary               — {in_progress, pending_signoff, rejected}
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── FPI step definitions per ASTM E1417 §7 ─────────────────── */
const FPI_STEPS = [
  { seq: 1, name: 'PRE_CLEAN',        label: 'Pre-Cleaning' },
  { seq: 2, name: 'PENETRANT_APPLY',  label: 'Penetrant Application' },
  { seq: 3, name: 'PENETRANT_DWELL',  label: 'Penetrant Dwell' },
  { seq: 4, name: 'RINSE',            label: 'Excess Penetrant Removal / Rinse' },
  { seq: 5, name: 'DEVELOPER_APPLY',  label: 'Developer Application' },
  { seq: 6, name: 'DEVELOPER_DWELL',  label: 'Development Dwell' },
  { seq: 7, name: 'INTERPRET',        label: 'Interpretation & Evaluation' },
  { seq: 8, name: 'POST_CLEAN',       label: 'Post-Cleaning' },
];

/* ── Helper: next job ref ────────────────────────────────────── */
async function nextJobRef() {
  const year = new Date().getUTCFullYear();
  const rows = await query(`
    SELECT COUNT(*) AS cnt FROM dbo.FpiJob WHERE job_ref LIKE @prefix
  `, [{ name: 'prefix', type: sql.NVarChar(20), value: `FPI-${year}-%` }]);
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `FPI-${year}-${seq}`;
}

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END)          AS in_progress,
        SUM(CASE WHEN status = 'IN_PROGRESS'
                  AND completed_steps < total_steps THEN 1 ELSE 0 END)   AS pending_signoff,
        SUM(CASE WHEN disposition = 'REJECT' THEN 1 ELSE 0 END)          AS rejected
      FROM dbo.vw_FpiJob
    `);
    const r = rows[0];
    res.json({
      in_progress:     r.in_progress,
      pending_signoff: r.pending_signoff,
      rejected:        r.rejected,
      total:           r.in_progress,
    });
  } catch (err) {
    console.error('[mod03/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching FPI alert summary.' });
  }
});

/* ── GET /jobs ───────────────────────────────────────────────── */
router.get('/jobs', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status || null;

  try {
    const rows = await query(`
      SELECT
        job_id, job_ref, work_order_ref, customer, part_number, part_description,
        quantity, penetrant_type, method, sensitivity_level, status,
        created_at, created_by_name, penetrant_bath_code,
        disposition, indication_found, final_signed_by_name, final_signed_at,
        total_steps, completed_steps
      FROM dbo.vw_FpiJob
      WHERE (@status IS NULL OR status = @status)
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int,          value: offset },
      { name: 'limit',  type: sql.Int,          value: limit  },
    ]);

    const [cnt] = await query(`
      SELECT COUNT(*) AS total FROM dbo.vw_FpiJob
      WHERE (@status IS NULL OR status = @status)
    `, [{ name: 'status', type: sql.NVarChar(20), value: status }]);

    res.json({ items: rows, total: cnt.total });
  } catch (err) {
    console.error('[mod03/jobs]', err.message);
    res.status(500).json({ message: 'Error fetching FPI jobs.' });
  }
});

/* ── POST /jobs ──────────────────────────────────────────────── */
router.post('/jobs', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const {
    work_order_ref, customer, part_number, part_description, material_spec,
    quantity, penetrant_type, penetrant_bath_id, developer_type, method, sensitivity_level,
  } = req.body;

  if (!part_number || !penetrant_type || !developer_type || !method || !sensitivity_level) {
    return res.status(400).json({ message: 'part_number, penetrant_type, developer_type, method, sensitivity_level required.' });
  }

  try {
    const jobRef = await nextJobRef();
    const result = await query(`
      INSERT INTO dbo.FpiJob
        (job_ref, work_order_ref, customer, part_number, part_description, material_spec,
         quantity, penetrant_type, penetrant_bath_id, developer_type, method, sensitivity_level, created_by)
      OUTPUT INSERTED.job_id
      VALUES
        (@ref, @wo, @customer, @pn, @pd, @ms,
         @qty, @pt, @bathId, @dt, @method, @sl, @userId)
    `, [
      { name: 'ref',     type: sql.NVarChar(20),  value: jobRef },
      { name: 'wo',      type: sql.NVarChar(30),  value: work_order_ref || null },
      { name: 'customer',type: sql.NVarChar(100), value: customer || null },
      { name: 'pn',      type: sql.NVarChar(100), value: part_number },
      { name: 'pd',      type: sql.NVarChar(200), value: part_description || null },
      { name: 'ms',      type: sql.NVarChar(100), value: material_spec || null },
      { name: 'qty',     type: sql.Int,            value: parseInt(quantity) || 1 },
      { name: 'pt',      type: sql.NVarChar(10),  value: penetrant_type },
      { name: 'bathId',  type: sql.Int,            value: penetrant_bath_id ? parseInt(penetrant_bath_id) : null },
      { name: 'dt',      type: sql.NVarChar(20),  value: developer_type },
      { name: 'method',  type: sql.NVarChar(10),  value: method },
      { name: 'sl',      type: sql.Int,            value: parseInt(sensitivity_level) },
      { name: 'userId',  type: sql.Int,            value: req.user.userId },
    ]);
    const jobId = result[0].job_id;

    // Auto-create all 8 steps
    for (const step of FPI_STEPS) {
      await query(`
        INSERT INTO dbo.FpiInspectionStep (job_id, step_seq, step_name)
        VALUES (@jobId, @seq, @name)
      `, [
        { name: 'jobId', type: sql.Int,           value: jobId },
        { name: 'seq',   type: sql.Int,           value: step.seq },
        { name: 'name',  type: sql.NVarChar(30),  value: step.name },
      ]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'FpiJob', recordId: jobRef, moduleId: 'MOD-03',
      newValue: { part_number, method, penetrant_type } });

    res.status(201).json({ job_id: jobId, job_ref: jobRef, message: 'FPI job created.' });
  } catch (err) {
    console.error('[mod03/jobs/create]', err.message);
    res.status(500).json({ message: 'Error creating FPI job.' });
  }
});

/* ── GET /jobs/:id ───────────────────────────────────────────── */
router.get('/jobs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  try {
    const [job] = await query(`
      SELECT * FROM dbo.vw_FpiJob WHERE job_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!job) return res.status(404).json({ message: 'FPI job not found.' });

    const steps = await query(`
      SELECT
        s.step_id, s.step_seq, s.step_name, s.performed_at, s.duration_min,
        s.uv_intensity_fc, s.white_light_fc, s.temp_c, s.parameters,
        s.result, s.signed_off, s.notes,
        u.full_name AS performed_by_name
      FROM dbo.FpiInspectionStep s
      LEFT JOIN dbo.Users u ON u.user_id = s.performed_by
      WHERE s.job_id = @id
      ORDER BY s.step_seq
    `, [{ name: 'id', type: sql.Int, value: id }]);

    const [finalResult] = await query(`
      SELECT r.disposition, r.indication_found, r.indication_desc,
             r.final_signed_at, u.full_name AS final_signed_by_name,
             r.linked_ncr_id
      FROM dbo.FpiResult r
      JOIN dbo.Users u ON u.user_id = r.final_signed_by
      WHERE r.job_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]) || [];

    res.json({ ...job, steps, final_result: finalResult || null });
  } catch (err) {
    console.error('[mod03/jobs/:id]', err.message);
    res.status(500).json({ message: 'Error fetching FPI job.' });
  }
});

/* ── PUT /jobs/:id/cancel ────────────────────────────────────── */
router.put('/jobs/:id/cancel', requireMinRole('SUPERVISOR'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  try {
    await query(`
      UPDATE dbo.FpiJob SET status = 'CANCELLED', updated_at = GETUTCDATE()
      WHERE job_id = @id AND status = 'IN_PROGRESS'
    `, [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'FpiJob', recordId: String(id), moduleId: 'MOD-03',
      newValue: { status: 'CANCELLED' } });
    res.json({ message: 'Job cancelled.' });
  } catch (err) {
    console.error('[mod03/jobs/cancel]', err.message);
    res.status(500).json({ message: 'Error cancelling job.' });
  }
});

/* ── POST /jobs/:id/steps/:seq/signoff ───────────────────────── */
router.post('/jobs/:id/steps/:seq/signoff', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  const seq   = parseInt(req.params.seq, 10);
  if (!jobId || !seq) return res.status(400).json({ message: 'Invalid job ID or step sequence.' });

  const { duration_min, uv_intensity_fc, white_light_fc, temp_c, parameters, result, notes } = req.body;

  if (!result || !['PASS','FAIL','N/A'].includes(result)) {
    return res.status(400).json({ message: 'result must be PASS, FAIL or N/A.' });
  }

  try {
    // GAP-06: NAS410 cert check — signer must hold active PT certification (NAS410 §9.1 / NADCAP AC7114)
    const cert = await query(`
      SELECT TOP 1 c.cert_id FROM dbo.NdtCertification c
      INNER JOIN dbo.Personnel p ON p.personnel_id = c.personnel_id
      WHERE p.user_id = @uid AND c.method = 'PT' AND c.is_active = 1
        AND c.expiry_date >= CAST(GETUTCDATE() AS DATE)
    `, [{ name: 'uid', type: sql.Int, value: req.user.userId }]);
    if (!cert.recordset.length) {
      return res.status(403).json({ message: 'Sign-off rejected — you do not hold a valid active PT (Penetrant Testing) certification. Contact QA Manager to update your certifications.' });
    }

    // GAP-04: Sequential gate — previous step must be signed off before current (ASTM E1417 §8 / SoR §5)
    if (seq > 1) {
      const prevStep = await query(
        `SELECT signed_off FROM dbo.FpiInspectionStep WHERE job_id = @jobId AND step_seq = @prev`,
        [{ name: 'jobId', type: sql.Int, value: jobId }, { name: 'prev', type: sql.Int, value: seq - 1 }]
      );
      if (!prevStep.recordset.length || !prevStep.recordset[0].signed_off) {
        return res.status(400).json({ message: `Step ${seq - 1} must be completed before signing off step ${seq}.` });
      }
    }

    await query(`
      UPDATE dbo.FpiInspectionStep
      SET
        performed_by    = @userId,
        performed_at    = GETUTCDATE(),
        duration_min    = @dur,
        uv_intensity_fc = @uv,
        white_light_fc  = @wl,
        temp_c          = @temp,
        parameters      = @params,
        result          = @result,
        signed_off      = 1,
        notes           = @notes
      WHERE job_id = @jobId AND step_seq = @seq AND signed_off = 0
    `, [
      { name: 'userId', type: sql.Int,            value: req.user.userId },
      { name: 'dur',    type: sql.Int,            value: duration_min ? parseInt(duration_min) : null },
      { name: 'uv',     type: sql.Int,            value: uv_intensity_fc ? parseInt(uv_intensity_fc) : null },
      { name: 'wl',     type: sql.Int,            value: white_light_fc ? parseInt(white_light_fc) : null },
      { name: 'temp',   type: sql.Decimal(5, 1),  value: temp_c ? parseFloat(temp_c) : null },
      { name: 'params', type: sql.NVarChar(sql.MAX), value: parameters ? JSON.stringify(parameters) : null },
      { name: 'result', type: sql.NVarChar(10),   value: result },
      { name: 'notes',  type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'jobId',  type: sql.Int,            value: jobId },
      { name: 'seq',    type: sql.Int,            value: seq },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'SIGNOFF', tableName: 'FpiInspectionStep', recordId: `${jobId}/step${seq}`,
      moduleId: 'MOD-03', newValue: { result } });

    res.json({ message: `Step ${seq} signed off.` });
  } catch (err) {
    console.error('[mod03/jobs/steps/signoff]', err.message);
    res.status(500).json({ message: 'Error signing off step.' });
  }
});

/* ── POST /jobs/:id/result ───────────────────────────────────── */
router.post('/jobs/:id/result', requireMinRole('SUPERVISOR'), async (req, res) => {
  const jobId = parseInt(req.params.id, 10);
  if (!jobId) return res.status(400).json({ message: 'Invalid job ID.' });

  const { disposition, indication_found, indication_desc, linked_ncr_id } = req.body;
  if (!disposition || !['ACCEPT','REJECT','REWORK'].includes(disposition)) {
    return res.status(400).json({ message: 'disposition must be ACCEPT, REJECT or REWORK.' });
  }
  if (disposition === 'REJECT' && !indication_desc) {
    return res.status(400).json({ message: 'indication_desc required when rejecting.' });
  }

  try {
    // Check all steps signed off
    const [check] = await query(`
      SELECT COUNT(*) AS unsigned FROM dbo.FpiInspectionStep
      WHERE job_id = @id AND signed_off = 0
    `, [{ name: 'id', type: sql.Int, value: jobId }]);
    if (check.unsigned > 0) {
      return res.status(400).json({ message: `${check.unsigned} step(s) not yet signed off. Complete all steps before recording final result.` });
    }

    await query(`
      INSERT INTO dbo.FpiResult
        (job_id, disposition, indication_found, indication_desc, linked_ncr_id, final_signed_by)
      VALUES (@jobId, @disp, @found, @desc, @ncrId, @userId)
    `, [
      { name: 'jobId',  type: sql.Int,            value: jobId },
      { name: 'disp',   type: sql.NVarChar(10),   value: disposition },
      { name: 'found',  type: sql.Bit,            value: indication_found ? 1 : 0 },
      { name: 'desc',   type: sql.NVarChar(sql.MAX), value: indication_desc || null },
      { name: 'ncrId',  type: sql.Int,            value: linked_ncr_id ? parseInt(linked_ncr_id) : null },
      { name: 'userId', type: sql.Int,            value: req.user.userId },
    ]);

    await query(`
      UPDATE dbo.FpiJob SET status = 'COMPLETE', updated_at = GETUTCDATE()
      WHERE job_id = @id
    `, [{ name: 'id', type: sql.Int, value: jobId }]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'COMPLETE', tableName: 'FpiJob', recordId: String(jobId), moduleId: 'MOD-03',
      newValue: { disposition, indication_found } });

    res.status(201).json({ message: `FPI job ${disposition}.` });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Final result already recorded.' });
    console.error('[mod03/jobs/result]', err.message);
    res.status(500).json({ message: 'Error recording final result.' });
  }
});

/* ── GET /jobs/:id/traveler ──────────────────────────────────── */
router.get('/jobs/:id/traveler', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  try {
    const [job] = await query(`SELECT * FROM dbo.vw_FpiJob WHERE job_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!job) return res.status(404).json({ message: 'FPI job not found.' });

    const steps = await query(`
      SELECT s.step_id, s.step_seq, s.step_name, s.performed_at, s.duration_min,
             s.uv_intensity_fc, s.white_light_fc, s.temp_c, s.parameters,
             s.result, s.signed_off, s.notes, u.full_name AS performed_by_name
      FROM dbo.FpiInspectionStep s
      LEFT JOIN dbo.Users u ON u.user_id = s.performed_by
      WHERE s.job_id = @id ORDER BY s.step_seq
    `, [{ name: 'id', type: sql.Int, value: id }]);

    const [finalResult] = await query(`
      SELECT r.*, u.full_name AS final_signed_by_name
      FROM dbo.FpiResult r JOIN dbo.Users u ON u.user_id = r.final_signed_by
      WHERE r.job_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]) || [];

    // Compliance references for print header
    const compliance = {
      standard: 'ASTM E1417 / AMS 2644',
      nadcap:   'NADCAP AC7114',
      nas410:   'NAS410',
    };

    res.json({ job, steps, final_result: finalResult || null, compliance });
  } catch (err) {
    console.error('[mod03/traveler]', err.message);
    res.status(500).json({ message: 'Error fetching traveler.' });
  }
});

module.exports = router;
