/**
 * ATCA-ERP v1.0 — MOD-33 Spec & Flowdown / Frozen Process Control
 * NADCAP Frozen Process | AS9100D §8.1.x, §8.5.6 | NADCAP AAM
 *
 * GET  /mod33/alerts/summary
 * GET  /mod33/specs
 * POST /mod33/specs              (ENGINEER+)
 * GET  /mod33/specs/:id          (detail + parameters + recipes)
 * PUT  /mod33/specs/:id          (ENGINEER+)
 * GET  /mod33/parameters?spec_id=
 * POST /mod33/parameters         (ENGINEER+)
 * GET  /mod33/ecn
 * POST /mod33/ecn                (ENGINEER+)
 * PUT  /mod33/ecn/:id            (QA_MANAGER+ for approval/implement)
 * GET  /mod33/aam
 * POST /mod33/aam                (ADMIN)
 * GET  /mod33/recipes?spec_id=
 * POST /mod33/recipes            (ENGINEER+)
 */
'use strict';

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const [r] = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.SpecLibrary WHERE status='ACTIVE') AS active_specs,
        (SELECT COUNT(*) FROM dbo.SpecLibrary WHERE is_frozen=1 AND status='ACTIVE') AS frozen_specs,
        (SELECT COUNT(*) FROM dbo.ECN
         WHERE status IN ('PENDING_CUSTOMER','PENDING_REVIEW')) AS ecn_pending,
        (SELECT COUNT(*) FROM dbo.ECN
         WHERE status NOT IN ('IMPLEMENTED','WITHDRAWN','REJECTED','CUSTOMER_REJECTED')
         AND target_date IS NOT NULL
         AND target_date < CAST(GETUTCDATE() AS DATE)) AS ecn_overdue,
        (SELECT COUNT(*) FROM dbo.AAM WHERE is_active=1) AS aam_entries,
        (SELECT COUNT(*) FROM dbo.ProcessRecipe WHERE is_frozen=1 AND status='FROZEN') AS frozen_recipes
    `);
    res.json({ ...r, total: r.ecn_pending + r.ecn_overdue });
  } catch (err) {
    console.error('[mod33/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching spec/flowdown summary.' });
  }
});

/* ── GET /specs ──────────────────────────────────────────────── */
router.get('/specs', async (req, res) => {
  const { process_area, customer_code, spec_type, status } = req.query;
  try {
    const params = [];
    const wheres = [];
    if (process_area) { wheres.push('process_area=@pa'); params.push({ name: 'pa', type: sql.NVarChar(100), value: process_area }); }
    if (customer_code) { wheres.push('customer_code=@cc'); params.push({ name: 'cc', type: sql.NVarChar(50), value: customer_code }); }
    if (spec_type) { wheres.push('spec_type=@st'); params.push({ name: 'st', type: sql.NVarChar(20), value: spec_type }); }
    if (status) { wheres.push('status=@s'); params.push({ name: 's', type: sql.NVarChar(20), value: status }); }
    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    const rows = await query(`
      SELECT spec_id, spec_code, spec_title, revision, customer_code, spec_type,
             process_area, is_frozen, frozen_since, status, approved_date,
             (SELECT COUNT(*) FROM dbo.SpecParameter WHERE spec_id=s.spec_id) AS param_count,
             (SELECT COUNT(*) FROM dbo.ProcessRecipe WHERE spec_id=s.spec_id) AS recipe_count,
             (SELECT COUNT(*) FROM dbo.ECN WHERE affected_spec_id=s.spec_id
              AND status NOT IN ('IMPLEMENTED','WITHDRAWN','REJECTED','CUSTOMER_REJECTED')) AS open_ecn_count
      FROM dbo.SpecLibrary s ${where}
      ORDER BY spec_code
    `, params);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod33/specs]', err.message);
    res.status(500).json({ message: 'Error fetching spec library.' });
  }
});

/* ── POST /specs ─────────────────────────────────────────────── */
router.post('/specs', requireMinRole('ENGINEER'), async (req, res) => {
  const { spec_code, spec_title, revision, customer_code, spec_type,
          process_area, is_frozen, status, notes } = req.body;
  if (!spec_code || !spec_title) {
    return res.status(400).json({ message: 'spec_code and spec_title are required.' });
  }
  try {
    const exists = await query(`SELECT spec_id FROM dbo.SpecLibrary WHERE spec_code=@sc`,
      [{ name: 'sc', type: sql.NVarChar(50), value: spec_code }]);
    if (exists.length) return res.status(409).json({ message: `Spec ${spec_code} already exists.` });

    const result = await query(`
      INSERT INTO dbo.SpecLibrary
        (spec_code, spec_title, revision, customer_code, spec_type, process_area,
         is_frozen, status, notes, created_by)
      OUTPUT INSERTED.spec_id
      VALUES (@sc, @st, @rev, @cc, @stype, @pa, @frz, @s, @notes, @by)
    `, [
      { name: 'sc',    type: sql.NVarChar(50),  value: spec_code },
      { name: 'st',    type: sql.NVarChar(200), value: spec_title },
      { name: 'rev',   type: sql.NVarChar(20),  value: revision || 'Rev A' },
      { name: 'cc',    type: sql.NVarChar(50),  value: customer_code || null },
      { name: 'stype', type: sql.NVarChar(20),  value: spec_type || 'CUSTOMER' },
      { name: 'pa',    type: sql.NVarChar(100), value: process_area || null },
      { name: 'frz',   type: sql.Bit,           value: is_frozen ? 1 : 0 },
      { name: 's',     type: sql.NVarChar(20),  value: status || 'ACTIVE' },
      { name: 'notes', type: sql.NVarChar(500), value: notes || null },
      { name: 'by',    type: sql.Int,           value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'CREATE', tableName: 'SpecLibrary',
      recordId: String(result[0].spec_id), moduleId: 'MOD-33', newValue: spec_code });
    res.status(201).json({ message: 'Spec created.', spec_id: result[0].spec_id });
  } catch (err) {
    console.error('[mod33/specs POST]', err.message);
    res.status(500).json({ message: 'Error creating spec.' });
  }
});

/* ── GET /specs/:id ──────────────────────────────────────────── */
router.get('/specs/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [spec] = await query(`SELECT * FROM dbo.SpecLibrary WHERE spec_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!spec) return res.status(404).json({ message: 'Spec not found.' });
    const params = await query(`SELECT * FROM dbo.SpecParameter WHERE spec_id=@id ORDER BY param_id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    const recipes = await query(`SELECT * FROM dbo.ProcessRecipe WHERE spec_id=@id ORDER BY recipe_id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    const ecns = await query(`
      SELECT ecn_id, ecn_ref, title, change_type, status, risk_level, submitted_at, target_date
      FROM dbo.ECN WHERE affected_spec_id=@id ORDER BY ecn_id DESC`,
      [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ ...spec, parameters: params, recipes, ecns });
  } catch (err) {
    console.error('[mod33/specs/:id]', err.message);
    res.status(500).json({ message: 'Error fetching spec detail.' });
  }
});

/* ── PUT /specs/:id ──────────────────────────────────────────── */
router.put('/specs/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [existing] = await query(`SELECT is_frozen, status FROM dbo.SpecLibrary WHERE spec_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!existing) return res.status(404).json({ message: 'Spec not found.' });

    // Frozen spec — only ADMIN can edit directly; otherwise must go via ECN
    if (existing.is_frozen && req.user.role !== 'ADMIN' && req.user.role !== 'QA_MANAGER') {
      return res.status(403).json({
        message: 'This spec is frozen. Raise an ECN (Engineering Change Notice) to modify frozen parameters.',
        is_frozen: true,
      });
    }

    const { spec_title, revision, status, notes, is_frozen } = req.body;
    const sets = ['updated_at=GETUTCDATE()'];
    const params = [{ name: 'id', type: sql.Int, value: id }];
    if (spec_title) { sets.push('spec_title=@t'); params.push({ name: 't', type: sql.NVarChar(200), value: spec_title }); }
    if (revision)   { sets.push('revision=@rev'); params.push({ name: 'rev', type: sql.NVarChar(20), value: revision }); }
    if (status)     { sets.push('status=@s'); params.push({ name: 's', type: sql.NVarChar(20), value: status }); }
    if (notes !== undefined) { sets.push('notes=@notes'); params.push({ name: 'notes', type: sql.NVarChar(500), value: notes }); }
    if (is_frozen !== undefined) {
      sets.push('is_frozen=@frz');
      params.push({ name: 'frz', type: sql.Bit, value: is_frozen ? 1 : 0 });
      if (is_frozen) {
        sets.push('frozen_since=CAST(GETUTCDATE() AS DATE)');
        sets.push('freeze_approved_by=@fab');
        params.push({ name: 'fab', type: sql.Int, value: req.user.userId });
      }
    }
    await query(`UPDATE dbo.SpecLibrary SET ${sets.join(',')} WHERE spec_id=@id`, params);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'SpecLibrary',
      recordId: String(id), moduleId: 'MOD-33' });
    res.json({ message: 'Spec updated.' });
  } catch (err) {
    console.error('[mod33/specs PUT]', err.message);
    res.status(500).json({ message: 'Error updating spec.' });
  }
});

/* ── GET /parameters ─────────────────────────────────────────── */
router.get('/parameters', async (req, res) => {
  const { spec_id } = req.query;
  if (!spec_id) return res.status(400).json({ message: 'spec_id required.' });
  try {
    const rows = await query(`
      SELECT * FROM dbo.SpecParameter WHERE spec_id=@sid ORDER BY param_id`,
      [{ name: 'sid', type: sql.Int, value: parseInt(spec_id) }]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching parameters.' });
  }
});

/* ── POST /parameters ────────────────────────────────────────── */
router.post('/parameters', requireMinRole('ENGINEER'), async (req, res) => {
  const { spec_id, param_name, param_category, value_nominal, value_min, value_max,
          unit, tolerance, is_frozen, is_critical, test_method, frequency, notes } = req.body;
  if (!spec_id || !param_name) return res.status(400).json({ message: 'spec_id and param_name required.' });
  try {
    const result = await query(`
      INSERT INTO dbo.SpecParameter
        (spec_id, param_name, param_category, value_nominal, value_min, value_max,
         unit, tolerance, is_frozen, is_critical, test_method, frequency, notes)
      OUTPUT INSERTED.param_id
      VALUES (@sid,@pn,@pc,@vn,@vmi,@vma,@u,@tol,@frz,@crit,@tm,@freq,@notes)
    `, [
      { name: 'sid',   type: sql.Int,           value: parseInt(spec_id) },
      { name: 'pn',    type: sql.NVarChar(100), value: param_name },
      { name: 'pc',    type: sql.NVarChar(50),  value: param_category || null },
      { name: 'vn',    type: sql.NVarChar(50),  value: value_nominal || null },
      { name: 'vmi',   type: sql.NVarChar(50),  value: value_min || null },
      { name: 'vma',   type: sql.NVarChar(50),  value: value_max || null },
      { name: 'u',     type: sql.NVarChar(20),  value: unit || null },
      { name: 'tol',   type: sql.NVarChar(50),  value: tolerance || null },
      { name: 'frz',   type: sql.Bit,           value: is_frozen ? 1 : 0 },
      { name: 'crit',  type: sql.Bit,           value: is_critical ? 1 : 0 },
      { name: 'tm',    type: sql.NVarChar(100), value: test_method || null },
      { name: 'freq',  type: sql.NVarChar(50),  value: frequency || null },
      { name: 'notes', type: sql.NVarChar(300), value: notes || null },
    ]);
    res.status(201).json({ message: 'Parameter added.', param_id: result[0].param_id });
  } catch (err) {
    console.error('[mod33/parameters POST]', err.message);
    res.status(500).json({ message: 'Error adding parameter.' });
  }
});

/* ── GET /ecn ────────────────────────────────────────────────── */
router.get('/ecn', async (req, res) => {
  const { status, risk_level } = req.query;
  try {
    const params = [];
    const wheres = [];
    if (status) { wheres.push('e.status=@s'); params.push({ name: 's', type: sql.NVarChar(25), value: status }); }
    if (risk_level) { wheres.push('e.risk_level=@rl'); params.push({ name: 'rl', type: sql.NVarChar(10), value: risk_level }); }
    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    const rows = await query(`
      SELECT e.ecn_id, e.ecn_ref, e.title, e.change_type, e.risk_level, e.status,
             e.customer_approval_required, e.submitted_at, e.target_date,
             e.customer_approval_date, e.implemented_at, e.days_open,
             e.spec_code, e.spec_title, e.customer_code
      FROM dbo.vw_ECNSummary e ${where}
      ORDER BY e.ecn_id DESC
    `, params);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod33/ecn]', err.message);
    res.status(500).json({ message: 'Error fetching ECN register.' });
  }
});

/* ── POST /ecn ───────────────────────────────────────────────── */
router.post('/ecn', requireMinRole('ENGINEER'), async (req, res) => {
  const { title, description, change_type, affected_spec_id, affected_recipe_id,
          old_value, new_value, justification, customer_approval_required,
          nadcap_notification_required, risk_level, target_date, notes } = req.body;
  if (!title) return res.status(400).json({ message: 'title is required.' });
  try {
    const result = await query(`
      INSERT INTO dbo.ECN
        (title, description, change_type, affected_spec_id, affected_recipe_id,
         old_value, new_value, justification, customer_approval_required,
         nadcap_notification_required, risk_level, status, target_date, notes,
         submitted_by, submitted_at)
      OUTPUT INSERTED.ecn_id, INSERTED.ecn_ref
      VALUES (@t,@desc,@ct,@asid,@arid,@ov,@nv,@just,@car,@nnr,@rl,'DRAFT',@td,@notes,@by,GETUTCDATE())
    `, [
      { name: 't',    type: sql.NVarChar(200), value: title },
      { name: 'desc', type: sql.NVarChar(sql.MAX), value: description || null },
      { name: 'ct',   type: sql.NVarChar(30),  value: change_type || 'PARAMETER_CHANGE' },
      { name: 'asid', type: sql.Int,           value: affected_spec_id ? parseInt(affected_spec_id) : null },
      { name: 'arid', type: sql.Int,           value: affected_recipe_id ? parseInt(affected_recipe_id) : null },
      { name: 'ov',   type: sql.NVarChar(500), value: old_value || null },
      { name: 'nv',   type: sql.NVarChar(500), value: new_value || null },
      { name: 'just', type: sql.NVarChar(sql.MAX), value: justification || null },
      { name: 'car',  type: sql.Bit,           value: customer_approval_required !== false ? 1 : 0 },
      { name: 'nnr',  type: sql.Bit,           value: nadcap_notification_required ? 1 : 0 },
      { name: 'rl',   type: sql.NVarChar(10),  value: risk_level || 'MEDIUM' },
      { name: 'td',   type: sql.Date,          value: target_date || null },
      { name: 'notes', type: sql.NVarChar(500), value: notes || null },
      { name: 'by',   type: sql.Int,           value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'CREATE', tableName: 'ECN',
      recordId: String(result[0].ecn_id), moduleId: 'MOD-33', newValue: result[0].ecn_ref });
    res.status(201).json({ message: 'ECN raised.', ecn_id: result[0].ecn_id, ecn_ref: result[0].ecn_ref });
  } catch (err) {
    console.error('[mod33/ecn POST]', err.message);
    res.status(500).json({ message: 'Error raising ECN.' });
  }
});

/* ── PUT /ecn/:id ────────────────────────────────────────────── */
router.put('/ecn/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, customer_ref, customer_approved_by, customer_approval_date, notes } = req.body;
  const allowed = ['PENDING_REVIEW','PENDING_CUSTOMER','CUSTOMER_APPROVED','CUSTOMER_REJECTED',
                   'APPROVED','REJECTED','IMPLEMENTED','WITHDRAWN'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ message: `Invalid ECN status.` });
  }
  try {
    const [existing] = await query(`SELECT status FROM dbo.ECN WHERE ecn_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!existing) return res.status(404).json({ message: 'ECN not found.' });

    const sets = ['updated_at=GETUTCDATE()'];
    const params = [{ name: 'id', type: sql.Int, value: id }];
    if (status) { sets.push('status=@st'); params.push({ name: 'st', type: sql.NVarChar(25), value: status }); }
    if (status === 'APPROVED') {
      sets.push('approved_by=@ab'); sets.push('approved_at=GETUTCDATE()');
      params.push({ name: 'ab', type: sql.Int, value: req.user.userId });
    }
    if (status === 'IMPLEMENTED') {
      sets.push('implemented_by=@ib'); sets.push('implemented_at=GETUTCDATE()');
      params.push({ name: 'ib', type: sql.Int, value: req.user.userId });
    }
    if (customer_ref) { sets.push('customer_ref=@cr'); params.push({ name: 'cr', type: sql.NVarChar(100), value: customer_ref }); }
    if (customer_approved_by) { sets.push('customer_approved_by=@cab'); params.push({ name: 'cab', type: sql.NVarChar(100), value: customer_approved_by }); }
    if (customer_approval_date) {
      sets.push('customer_approval_date=@cad');
      params.push({ name: 'cad', type: sql.Date, value: customer_approval_date });
    }
    if (notes !== undefined) { sets.push('notes=@notes'); params.push({ name: 'notes', type: sql.NVarChar(500), value: notes }); }

    await query(`UPDATE dbo.ECN SET ${sets.join(',')} WHERE ecn_id=@id`, params);

    // Log the sequence
    await query(`
      INSERT INTO dbo.Mod33Sequence (entity_type, entity_id, action, action_by, old_status, new_status)
      VALUES ('ECN', @id, @act, @by, @old, @new)
    `, [
      { name: 'id',  type: sql.Int, value: id },
      { name: 'act', type: sql.NVarChar(40), value: `ECN_${status || 'UPDATED'}` },
      { name: 'by',  type: sql.Int, value: req.user.userId },
      { name: 'old', type: sql.NVarChar(25), value: existing.status },
      { name: 'new', type: sql.NVarChar(25), value: status || existing.status },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'ECN',
      recordId: String(id), moduleId: 'MOD-33',
      oldValue: existing.status, newValue: status || existing.status });
    res.json({ message: 'ECN updated.' });
  } catch (err) {
    console.error('[mod33/ecn PUT]', err.message);
    res.status(500).json({ message: 'Error updating ECN.' });
  }
});

/* ── GET /aam ────────────────────────────────────────────────── */
router.get('/aam', async (req, res) => {
  try {
    const rows = await query(`
      SELECT aam_id, process_area, action_type, min_role, two_person_required, second_role,
             requires_operator_pin, requires_qam_approval, is_irreversible,
             effective_date, is_active, notes
      FROM dbo.AAM WHERE is_active=1
      ORDER BY process_area, action_type
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod33/aam]', err.message);
    res.status(500).json({ message: 'Error fetching AAM.' });
  }
});

/* ── POST /aam ───────────────────────────────────────────────── */
router.post('/aam', requireMinRole('ADMIN'), async (req, res) => {
  const { process_area, action_type, min_role, two_person_required, second_role,
          requires_operator_pin, requires_qam_approval, is_irreversible,
          effective_date, notes } = req.body;
  if (!process_area || !action_type || !min_role) {
    return res.status(400).json({ message: 'process_area, action_type and min_role are required.' });
  }
  try {
    const result = await query(`
      INSERT INTO dbo.AAM
        (process_area, action_type, min_role, two_person_required, second_role,
         requires_operator_pin, requires_qam_approval, is_irreversible,
         effective_date, approved_by, notes)
      OUTPUT INSERTED.aam_id
      VALUES (@pa,@at,@mr,@tp,@sr,@rp,@rq,@ir,@ed,@by,@notes)
    `, [
      { name: 'pa',    type: sql.NVarChar(100), value: process_area },
      { name: 'at',    type: sql.NVarChar(100), value: action_type },
      { name: 'mr',    type: sql.NVarChar(30),  value: min_role },
      { name: 'tp',    type: sql.Bit,           value: two_person_required ? 1 : 0 },
      { name: 'sr',    type: sql.NVarChar(30),  value: second_role || null },
      { name: 'rp',    type: sql.Bit,           value: requires_operator_pin ? 1 : 0 },
      { name: 'rq',    type: sql.Bit,           value: requires_qam_approval ? 1 : 0 },
      { name: 'ir',    type: sql.Bit,           value: is_irreversible ? 1 : 0 },
      { name: 'ed',    type: sql.Date,          value: effective_date || new Date().toISOString().slice(0,10) },
      { name: 'by',    type: sql.Int,           value: req.user.userId },
      { name: 'notes', type: sql.NVarChar(300), value: notes || null },
    ]);
    res.status(201).json({ message: 'AAM entry created.', aam_id: result[0].aam_id });
  } catch (err) {
    console.error('[mod33/aam POST]', err.message);
    res.status(500).json({ message: 'Error creating AAM entry.' });
  }
});

/* ── GET /recipes ────────────────────────────────────────────── */
router.get('/recipes', async (req, res) => {
  const { spec_id } = req.query;
  try {
    const params = spec_id ? [{ name: 'sid', type: sql.Int, value: parseInt(spec_id) }] : [];
    const where = spec_id ? 'WHERE r.spec_id=@sid' : '';
    const rows = await query(`
      SELECT r.recipe_id, r.recipe_ref, r.recipe_name, r.version, r.process_area, r.bay,
             r.is_frozen, r.frozen_at, r.status, r.approved_at,
             s.spec_code, s.spec_title, s.customer_code
      FROM dbo.ProcessRecipe r
      LEFT JOIN dbo.SpecLibrary s ON s.spec_id=r.spec_id
      ${where} ORDER BY r.recipe_id DESC
    `, params);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod33/recipes]', err.message);
    res.status(500).json({ message: 'Error fetching recipes.' });
  }
});

/* ── POST /recipes ───────────────────────────────────────────── */
router.post('/recipes', requireMinRole('ENGINEER'), async (req, res) => {
  const { spec_id, recipe_name, version, process_area, bay,
          parameter_snapshot, notes } = req.body;
  if (!spec_id || !recipe_name) return res.status(400).json({ message: 'spec_id and recipe_name required.' });
  try {
    const snapshot = typeof parameter_snapshot === 'object'
      ? JSON.stringify(parameter_snapshot)
      : parameter_snapshot || null;
    const result = await query(`
      INSERT INTO dbo.ProcessRecipe
        (spec_id, recipe_name, version, process_area, bay, parameter_snapshot,
         status, created_by)
      OUTPUT INSERTED.recipe_id, INSERTED.recipe_ref
      VALUES (@sid,@rn,@ver,@pa,@bay,@snap,'DRAFT',@by)
    `, [
      { name: 'sid',  type: sql.Int,           value: parseInt(spec_id) },
      { name: 'rn',   type: sql.NVarChar(100), value: recipe_name },
      { name: 'ver',  type: sql.NVarChar(10),  value: version || '1.0' },
      { name: 'pa',   type: sql.NVarChar(100), value: process_area || null },
      { name: 'bay',  type: sql.NVarChar(10),  value: bay || null },
      { name: 'snap', type: sql.NVarChar(sql.MAX), value: snapshot },
      { name: 'by',   type: sql.Int,           value: req.user.userId },
    ]);
    res.status(201).json({
      message: 'Process recipe created.',
      recipe_id: result[0].recipe_id,
      recipe_ref: result[0].recipe_ref,
    });
  } catch (err) {
    console.error('[mod33/recipes POST]', err.message);
    res.status(500).json({ message: 'Error creating recipe.' });
  }
});

module.exports = router;
