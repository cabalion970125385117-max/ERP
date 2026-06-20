/**
 * ATCA-ERP v1.0 — MOD-06 Chemical / Bath Control Routes
 * NADCAP AC7108 | AC7110 | AC7114 §6.3 | ASTM E1417 | AMS 2644
 *
 * GET    /api/v1/mod06/baths                  — list all baths + RAG status
 * POST   /api/v1/mod06/baths                  — create bath (ENGINEER+)
 * GET    /api/v1/mod06/baths/:id              — bath detail + parameters + recent samples
 * PUT    /api/v1/mod06/baths/:id              — update bath (ENGINEER+)
 * DELETE /api/v1/mod06/baths/:id              — soft delete (QA_MANAGER+)
 * GET    /api/v1/mod06/baths/:id/samples      — sample history for a bath
 * POST   /api/v1/mod06/baths/:id/samples      — record new sample (NDT_INSPECTOR+)
 * GET    /api/v1/mod06/alerts/summary         — {out_of_spec, overdue_sample, total}
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── Helper: next sample ref ────────────────────────────────── */
async function nextSampleRef() {
  const year = new Date().getUTCFullYear();
  const rows = await query(`
    SELECT COUNT(*) AS cnt FROM dbo.BathSample
    WHERE sample_ref LIKE @prefix
  `, [{ name: 'prefix', type: sql.NVarChar(20), value: `BS-${year}-%` }]);
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `BS-${year}-${seq}`;
}

/* ── GET /alerts/summary ─────────────────────────────────────── */
/* Split FPI (NDT) vs Electroplating per the PCM, with backward-compatible
   top-level totals for MOD-15 dashboard aggregation. */
router.get('/alerts/summary', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        process_category,
        SUM(CASE WHEN rag_status = 'RED'   AND last_status = 'FAIL'  THEN 1 ELSE 0 END) AS out_of_spec,
        SUM(CASE WHEN rag_status = 'RED'   AND (last_status <> 'FAIL' OR last_sample_id IS NULL) THEN 1 ELSE 0 END) AS overdue_sample,
        SUM(CASE WHEN rag_status = 'AMBER' THEN 1 ELSE 0 END) AS due_soon,
        COUNT(*) AS total_baths
      FROM dbo.vw_BathStatus
      GROUP BY process_category
    `);
    const blank = () => ({ out_of_spec: 0, overdue_sample: 0, due_soon: 0, total_baths: 0 });
    const fpi = blank(), plating = blank();
    for (const r of rows) {
      const t = r.process_category === 'NDT_FPI' ? fpi : plating;
      t.out_of_spec = r.out_of_spec; t.overdue_sample = r.overdue_sample;
      t.due_soon = r.due_soon; t.total_baths = r.total_baths;
    }
    res.json({
      fpi, plating,
      // top-level = combined (kept for §7 contract / dashboard back-compat)
      out_of_spec:    fpi.out_of_spec    + plating.out_of_spec,
      overdue_sample: fpi.overdue_sample + plating.overdue_sample,
      due_soon:       fpi.due_soon       + plating.due_soon,
      total_baths:    fpi.total_baths    + plating.total_baths,
      total:          fpi.out_of_spec + plating.out_of_spec + fpi.overdue_sample + plating.overdue_sample,
    });
  } catch (err) {
    console.error('[mod06/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching bath alert summary.' });
  }
});

/* ── GET /baths?category=NDT_FPI|ELECTROPLATING ───────────────── */
router.get('/baths', async (req, res) => {
  try {
    const category = req.query.category || null;   // null = all
    const rows = await query(`
      SELECT
        bath_id, bath_code, bath_name, bath_type, process_category, process_area, spec_ref,
        sample_frequency_days, bay, max_len_cm, max_wid_cm, max_dep_cm,
        last_sample_ref, last_sampled_at,
        days_since_sample, last_status, last_sampled_by_name, rag_status
      FROM dbo.vw_BathStatus
      WHERE (@category IS NULL OR process_category = @category)
      ORDER BY process_category, bath_code
    `, [{ name: 'category', type: sql.NVarChar(20), value: category }]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod06/baths]', err.message);
    res.status(500).json({ message: 'Error fetching baths.' });
  }
});

/* ── POST /baths ─────────────────────────────────────────────── */
router.post('/baths', requireMinRole('ENGINEER'), async (req, res) => {
  const { bath_code, bath_name, bath_type, process_area, spec_ref, sample_frequency_days, notes,
          bay, max_len_cm, max_wid_cm, max_dep_cm } = req.body;
  if (!bath_code || !bath_name || !bath_type) {
    return res.status(400).json({ message: 'bath_code, bath_name and bath_type are required.' });
  }
  const FPI_TYPES = ['PENETRANT','EMULSIFIER','DEVELOPER','RINSE'];
  const EP_TYPES  = ['ANODIZE','BLACK_OXIDE','CHROMATE','ZINC_PLATE','COPPER_PLATE','NICKEL_PLATE',
                     'ELECTROLESS_NICKEL','SILVER_PLATE','GOLD_PLATE','PHOSPHATING','PASSIVATION',
                     'HARD_CHROME','CADMIUM','ELECTROPOLISH','BLUEING','CONVERSION','COATING','PLATING'];
  const validTypes = [...FPI_TYPES, ...EP_TYPES];
  if (!validTypes.includes(bath_type)) {
    return res.status(400).json({ message: `bath_type must be one of: ${validTypes.join(', ')}` });
  }
  const process_category = FPI_TYPES.includes(bath_type) ? 'NDT_FPI' : 'ELECTROPLATING';
  try {
    const result = await query(`
      INSERT INTO dbo.ChemBath
        (bath_code, bath_name, bath_type, process_category, process_area, spec_ref, sample_frequency_days,
         notes, bay, max_len_cm, max_wid_cm, max_dep_cm, created_by)
      OUTPUT INSERTED.bath_id
      VALUES
        (@bath_code, @bath_name, @bath_type, @category, @process_area, @spec_ref, @freq,
         @notes, @bay, @maxlen, @maxwid, @maxdep, @userId)
    `, [
      { name: 'bath_code',   type: sql.NVarChar(20),  value: bath_code },
      { name: 'bath_name',   type: sql.NVarChar(100), value: bath_name },
      { name: 'bath_type',   type: sql.NVarChar(20),  value: bath_type },
      { name: 'category',    type: sql.NVarChar(20),  value: process_category },
      { name: 'process_area',type: sql.NVarChar(100), value: process_area || null },
      { name: 'spec_ref',    type: sql.NVarChar(200), value: spec_ref || null },
      { name: 'freq',        type: sql.Int,            value: parseInt(sample_frequency_days) || 7 },
      { name: 'notes',       type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'bay',         type: sql.NVarChar(20),   value: bay || null },
      { name: 'maxlen',      type: sql.Decimal(6,1),   value: max_len_cm != null ? parseFloat(max_len_cm) : null },
      { name: 'maxwid',      type: sql.Decimal(6,1),   value: max_wid_cm != null ? parseFloat(max_wid_cm) : null },
      { name: 'maxdep',      type: sql.Decimal(6,1),   value: max_dep_cm != null ? parseFloat(max_dep_cm) : null },
      { name: 'userId',      type: sql.Int,            value: req.user.userId },
    ]);
    const newId = result[0].bath_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'ChemBath', recordId: String(newId), moduleId: 'MOD-06', newValue: req.body });
    res.status(201).json({ bath_id: newId, message: 'Bath created.' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'Bath code already exists.' });
    console.error('[mod06/baths/create]', err.message);
    res.status(500).json({ message: 'Error creating bath.' });
  }
});

/* ── GET /baths/:id ──────────────────────────────────────────── */
router.get('/baths/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  try {
    const [bath] = await query(`
      SELECT
        b.bath_id, b.bath_code, b.bath_name, b.bath_type, b.process_category, b.process_area,
        b.spec_ref, b.sample_frequency_days, b.notes, b.bay, b.max_len_cm, b.max_wid_cm, b.max_dep_cm,
        b.is_active, b.created_at,
        v.rag_status, v.last_sampled_at, v.days_since_sample, v.last_status, v.last_sampled_by_name
      FROM dbo.ChemBath b
      LEFT JOIN dbo.vw_BathStatus v ON v.bath_id = b.bath_id
      WHERE b.bath_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]);

    if (!bath) return res.status(404).json({ message: 'Bath not found.' });

    const params = await query(`
      SELECT param_id, param_name, unit, min_value, max_value, test_method
      FROM dbo.BathParameter WHERE bath_id = @id ORDER BY param_id
    `, [{ name: 'id', type: sql.Int, value: id }]);

    res.json({ ...bath, parameters: params });
  } catch (err) {
    console.error('[mod06/baths/:id]', err.message);
    res.status(500).json({ message: 'Error fetching bath.' });
  }
});

/* ── PUT /baths/:id ──────────────────────────────────────────── */
router.put('/baths/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  const { bath_name, process_area, spec_ref, sample_frequency_days, notes } = req.body;
  try {
    await query(`
      UPDATE dbo.ChemBath
      SET bath_name = @bath_name, process_area = @process_area, spec_ref = @spec_ref,
          sample_frequency_days = @freq, notes = @notes, updated_at = GETUTCDATE()
      WHERE bath_id = @id AND is_active = 1
    `, [
      { name: 'bath_name',    type: sql.NVarChar(100), value: bath_name },
      { name: 'process_area', type: sql.NVarChar(100), value: process_area || null },
      { name: 'spec_ref',     type: sql.NVarChar(200), value: spec_ref || null },
      { name: 'freq',         type: sql.Int,            value: parseInt(sample_frequency_days) || 7 },
      { name: 'notes',        type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'id',           type: sql.Int,            value: id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'ChemBath', recordId: String(id), moduleId: 'MOD-06', newValue: req.body });
    res.json({ message: 'Bath updated.' });
  } catch (err) {
    console.error('[mod06/baths/update]', err.message);
    res.status(500).json({ message: 'Error updating bath.' });
  }
});

/* ── DELETE /baths/:id ───────────────────────────────────────── */
router.delete('/baths/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  try {
    await query(`UPDATE dbo.ChemBath SET is_active = 0, updated_at = GETUTCDATE() WHERE bath_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'DEACTIVATE', tableName: 'ChemBath', recordId: String(id), moduleId: 'MOD-06' });
    res.json({ message: 'Bath deactivated.' });
  } catch (err) {
    console.error('[mod06/baths/delete]', err.message);
    res.status(500).json({ message: 'Error deactivating bath.' });
  }
});

/* ── GET /baths/:id/samples ──────────────────────────────────── */
router.get('/baths/:id/samples', async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  if (!id) return res.status(400).json({ message: 'Invalid ID.' });
  try {
    const rows = await query(`
      SELECT
        s.sample_id, s.sample_ref, s.sampled_at, s.overall_status,
        s.corrective_action, s.notes, u.full_name AS sampled_by_name,
        (SELECT COUNT(*) FROM dbo.BathSampleParam p WHERE p.sample_id = s.sample_id AND p.within_spec = 0) AS failed_params
      FROM dbo.BathSample s
      JOIN dbo.Users u ON u.user_id = s.sampled_by
      WHERE s.bath_id = @id
      ORDER BY s.sampled_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'id',     type: sql.Int, value: id },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: limit },
    ]);
    const [cnt] = await query(`SELECT COUNT(*) AS total FROM dbo.BathSample WHERE bath_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ items: rows, total: cnt.total });
  } catch (err) {
    console.error('[mod06/baths/samples]', err.message);
    res.status(500).json({ message: 'Error fetching samples.' });
  }
});

/* ── POST /baths/:id/samples ─────────────────────────────────── */
router.post('/baths/:id/samples', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const bathId = parseInt(req.params.id, 10);
  if (!bathId) return res.status(400).json({ message: 'Invalid bath ID.' });

  const { sampled_at, corrective_action, notes, params } = req.body;
  // params: [{ param_name, result_value, unit, within_spec }]
  if (!params || !Array.isArray(params) || params.length === 0) {
    return res.status(400).json({ message: 'params array with at least one result is required.' });
  }

  const overallStatus = params.every(p => p.within_spec) ? 'PASS' : 'FAIL';
  if (overallStatus === 'FAIL' && !corrective_action) {
    return res.status(400).json({ message: 'corrective_action is required when any parameter is out of spec.' });
  }

  try {
    const sampleRef = await nextSampleRef();
    const sampledAt = sampled_at ? new Date(sampled_at) : new Date();

    const result = await query(`
      INSERT INTO dbo.BathSample
        (bath_id, sample_ref, sampled_by, sampled_at, overall_status, corrective_action, notes)
      OUTPUT INSERTED.sample_id
      VALUES (@bathId, @ref, @userId, @sampledAt, @status, @ca, @notes)
    `, [
      { name: 'bathId',    type: sql.Int,           value: bathId },
      { name: 'ref',       type: sql.NVarChar(30),  value: sampleRef },
      { name: 'userId',    type: sql.Int,           value: req.user.userId },
      { name: 'sampledAt', type: sql.DateTime2,     value: sampledAt },
      { name: 'status',    type: sql.NVarChar(10),  value: overallStatus },
      { name: 'ca',        type: sql.NVarChar(sql.MAX), value: corrective_action || null },
      { name: 'notes',     type: sql.NVarChar(sql.MAX), value: notes || null },
    ]);
    const sampleId = result[0].sample_id;

    for (const p of params) {
      await query(`
        INSERT INTO dbo.BathSampleParam (sample_id, param_name, result_value, unit, within_spec)
        VALUES (@sid, @name, @val, @unit, @ok)
      `, [
        { name: 'sid',  type: sql.Int,            value: sampleId },
        { name: 'name', type: sql.NVarChar(100),  value: p.param_name },
        { name: 'val',  type: sql.Decimal(10, 3), value: parseFloat(p.result_value) },
        { name: 'unit', type: sql.NVarChar(20),   value: p.unit || null },
        { name: 'ok',   type: sql.Bit,            value: p.within_spec ? 1 : 0 },
      ]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'BathSample', recordId: sampleRef, moduleId: 'MOD-06',
      newValue: { bath_id: bathId, overall_status: overallStatus, param_count: params.length } });

    res.status(201).json({ sample_id: sampleId, sample_ref: sampleRef, overall_status: overallStatus, message: 'Sample recorded.' });
  } catch (err) {
    console.error('[mod06/baths/samples/create]', err.message);
    res.status(500).json({ message: 'Error recording sample.' });
  }
});

/* ── GET /baths/:id/samples/:sampleId/params ─────────────────── */
router.get('/baths/:id/samples/:sampleId/params', async (req, res) => {
  const sampleId = parseInt(req.params.sampleId, 10);
  if (!sampleId) return res.status(400).json({ message: 'Invalid sample ID.' });
  try {
    const rows = await query(`
      SELECT result_id, param_name, result_value, unit, within_spec
      FROM dbo.BathSampleParam WHERE sample_id = @id ORDER BY result_id
    `, [{ name: 'id', type: sql.Int, value: sampleId }]);
    res.json({ items: rows });
  } catch (err) {
    console.error('[mod06/samples/params]', err.message);
    res.status(500).json({ message: 'Error fetching param results.' });
  }
});

module.exports = router;
