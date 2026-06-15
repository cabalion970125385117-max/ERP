'use strict';
const router  = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// GET /api/v1/mod17/jobs
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE j.is_active = 1';
    const params = [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ];
    if (status) { where += ' AND j.status = @status'; params.push({ name: 'status', type: sql.NVarChar(20), value: status }); }

    const rows = await query(`
      SELECT j.*, p.full_name AS inspector_name,
        (SELECT COUNT(*) FROM dbo.MptInspectionStep s WHERE s.mpt_job_id = j.mpt_job_id AND s.status='COMPLETE') AS steps_done
      FROM dbo.MptJob j
      LEFT JOIN dbo.Personnel p ON p.personnel_id = j.assigned_inspector_id
      ${where}
      ORDER BY j.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[mod17/jobs GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// GET /api/v1/mod17/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const jobs = await query(`
      SELECT j.*, p.full_name AS inspector_name
      FROM dbo.MptJob j
      LEFT JOIN dbo.Personnel p ON p.personnel_id = j.assigned_inspector_id
      WHERE j.mpt_job_id = @id AND j.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!jobs.length) return res.status(404).json({ message: 'MPT job not found.' });

    const steps = await query(`
      SELECT s.*, p.full_name AS performed_name
      FROM dbo.MptInspectionStep s
      LEFT JOIN dbo.Personnel p ON p.personnel_id = s.performed_by_id
      WHERE s.mpt_job_id = @id ORDER BY s.step_number
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    const result = await query(`SELECT * FROM dbo.MptResult WHERE mpt_job_id = @id`,
      [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    res.json({ ...jobs[0], steps, result: result[0] || null });
  } catch (err) {
    console.error('[mod17/jobs GET/:id]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod17/jobs  — create MPT job, auto-insert 6 steps
router.post('/', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { work_order_id, customer_name, part_number, part_description, part_serial_no,
          quantity, material_spec, technique, magnetisation_method, demagnetisation_required,
          priority, planned_date, assigned_inspector_id, special_instructions, customer_po } = req.body;
  if (!customer_name || !part_number) {
    return res.status(400).json({ message: 'customer_name and part_number required.' });
  }
  try {
    const year = new Date().getFullYear();
    await query(`
      UPDATE dbo.Mod17Sequence SET last_num = last_num + 1, last_year = @yr WHERE seq_key = 'MPT_JOB'
    `, [{ name: 'yr', type: sql.Int, value: year }]);
    const seq = await query(`SELECT last_num FROM dbo.Mod17Sequence WHERE seq_key = 'MPT_JOB'`);
    const job_number = `MPT-${year}-${String(seq[0].last_num).padStart(4, '0')}`;

    const result = await query(`
      INSERT INTO dbo.MptJob
        (job_number, work_order_id, customer_name, part_number, part_description, part_serial_no,
         quantity, material_spec, technique, magnetisation_method, demagnetisation_required,
         priority, planned_date, assigned_inspector_id, special_instructions, customer_po, created_by)
      OUTPUT INSERTED.mpt_job_id
      VALUES (@num,@wid,@cname,@pnum,@pdesc,@pser,@qty,@mspec,@tech,@mag,@demag,@pri,@pd,@insp,@si,@cpo,@by)
    `, [
      { name: 'num',   type: sql.NVarChar(20),  value: job_number },
      { name: 'wid',   type: sql.Int,           value: work_order_id || null },
      { name: 'cname', type: sql.NVarChar(200), value: customer_name },
      { name: 'pnum',  type: sql.NVarChar(100), value: part_number },
      { name: 'pdesc', type: sql.NVarChar(200), value: part_description || null },
      { name: 'pser',  type: sql.NVarChar(100), value: part_serial_no || null },
      { name: 'qty',   type: sql.Int,           value: quantity || 1 },
      { name: 'mspec', type: sql.NVarChar(100), value: material_spec || null },
      { name: 'tech',  type: sql.NVarChar(20),  value: technique || 'WET_FLUORESCENT' },
      { name: 'mag',   type: sql.NVarChar(30),  value: magnetisation_method || null },
      { name: 'demag', type: sql.Bit,           value: demagnetisation_required !== false ? 1 : 0 },
      { name: 'pri',   type: sql.NVarChar(10),  value: priority || 'NORMAL' },
      { name: 'pd',    type: sql.Date,          value: planned_date || null },
      { name: 'insp',  type: sql.Int,           value: assigned_inspector_id || null },
      { name: 'si',    type: sql.NVarChar(sql.MAX), value: special_instructions || null },
      { name: 'cpo',   type: sql.NVarChar(100), value: customer_po || null },
      { name: 'by',    type: sql.Int,           value: req.user.userId },
    ]);
    const jobId = result[0].mpt_job_id;

    // Auto-insert 6 standard MPT process steps
    const stepDefs = [
      { n: 1, name: 'Pre-Cleaning' },
      { n: 2, name: 'Equipment Setup & Verification' },
      { n: 3, name: 'Magnetisation' },
      { n: 4, name: 'Particle Application' },
      { n: 5, name: 'Examination & Interpretation' },
      { n: 6, name: 'Demagnetisation & Post-Cleaning' },
    ];
    for (const s of stepDefs) {
      await query(`
        INSERT INTO dbo.MptInspectionStep (mpt_job_id, step_number, step_name)
        VALUES (@jid, @sn, @sname)
      `, [
        { name: 'jid',   type: sql.Int,           value: jobId },
        { name: 'sn',    type: sql.Int,           value: s.n },
        { name: 'sname', type: sql.NVarChar(100), value: s.name },
      ]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'MptJob', recordId: jobId, moduleId: 'MOD-17', newValue: job_number });
    res.status(201).json({ mpt_job_id: jobId, job_number });
  } catch (err) {
    console.error('[mod17/jobs POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod17/jobs/:id/steps/:stepNum  — update a single inspection step
router.patch('/:id/steps/:stepNum', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const stepNum = parseInt(req.params.stepNum);
  if (stepNum < 1 || stepNum > 6) return res.status(400).json({ message: 'stepNum must be 1–6.' });

  // Build dynamic SET from allowed fields per step
  const allowed = [
    'cleaning_method','solvent_used',
    'equipment_id','equipment_checked','uv_lamp_intensity_fc','uv_lamp_ok','ambient_light_fc','ambient_light_ok',
    'current_type','current_amps','field_strength_gauss','field_strength_ok',
    'particle_type','particle_conc','particle_conc_ok',
    'indications_found','indication_count','indication_notes',
    'residual_field_gauss','demagnetised_ok','post_clean_done',
    'notes','status',
  ];
  const setClauses = [];
  const params = [
    { name: 'jid', type: sql.Int, value: parseInt(req.params.id) },
    { name: 'sn',  type: sql.Int, value: stepNum },
  ];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      setClauses.push(`${field} = @${field}`);
      // Determine type
      const boolFields = ['equipment_checked','uv_lamp_ok','ambient_light_ok','field_strength_ok','particle_conc_ok','indications_found','demagnetised_ok','post_clean_done'];
      const intFields  = ['equipment_id','indication_count'];
      const decFields  = ['uv_lamp_intensity_fc','ambient_light_fc','current_amps','field_strength_gauss','particle_conc','residual_field_gauss'];
      let t = sql.NVarChar(sql.MAX);
      if (boolFields.includes(field)) t = sql.Bit;
      else if (intFields.includes(field)) t = sql.Int;
      else if (decFields.includes(field)) t = sql.Decimal(10, 2);
      params.push({ name: field, type: t, value: req.body[field] });
    }
  }
  if (!setClauses.length) return res.status(400).json({ message: 'No valid fields provided.' });

  // Auto-set performed_by and performed_at on first update
  setClauses.push('performed_by_id = ISNULL(performed_by_id, @pby)');
  setClauses.push('performed_at = ISNULL(performed_at, GETUTCDATE())');
  params.push({ name: 'pby', type: sql.Int, value: req.user.userId });

  try {
    await query(`
      UPDATE dbo.MptInspectionStep SET ${setClauses.join(', ')}
      WHERE mpt_job_id = @jid AND step_number = @sn
    `, params);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'STEP_UPDATE', tableName: 'MptInspectionStep', recordId: parseInt(req.params.id),
      moduleId: 'MOD-17', newValue: `Step ${stepNum}` });
    res.json({ message: 'Step updated.' });
  } catch (err) {
    console.error('[mod17/jobs step PATCH]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod17/jobs/:id/status
router.patch('/:id/status', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { status, disposition } = req.body;
  const allowed = ['RECEIVED','IN_PROGRESS','PENDING_REVIEW','ACCEPTED','REJECTED','ON_HOLD'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    await query(`
      UPDATE dbo.MptJob SET status=@s, disposition=@d, updated_at=GETUTCDATE()
      WHERE mpt_job_id=@id AND is_active=1
    `, [
      { name: 's',  type: sql.NVarChar(20), value: status },
      { name: 'd',  type: sql.NVarChar(20), value: disposition || null },
      { name: 'id', type: sql.Int,          value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'STATUS_CHANGE', tableName: 'MptJob', recordId: parseInt(req.params.id),
      moduleId: 'MOD-17', newValue: status });
    res.json({ message: 'Status updated.' });
  } catch (err) {
    console.error('[mod17/jobs status PATCH]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
