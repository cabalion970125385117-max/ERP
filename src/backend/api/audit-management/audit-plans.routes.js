'use strict';
const router  = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// GET /api/v1/mod08/audit-plans
router.get('/', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE ap.is_active = 1';
    const params = [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ];
    if (status) { where += ' AND ap.status = @status'; params.push({ name: 'status', type: sql.NVarChar(20), value: status }); }
    if (type)   { where += ' AND ap.audit_type = @type'; params.push({ name: 'type',   type: sql.NVarChar(30), value: type }); }

    const rows = await query(`
      SELECT ap.*, p.full_name AS lead_auditor_full_name,
        (SELECT COUNT(*) FROM dbo.AuditFinding f WHERE f.audit_plan_id = ap.audit_plan_id AND f.is_active=1) AS total_findings,
        (SELECT COUNT(*) FROM dbo.AuditFinding f WHERE f.audit_plan_id = ap.audit_plan_id AND f.status='OPEN' AND f.is_active=1) AS open_findings
      FROM dbo.AuditPlan ap
      LEFT JOIN dbo.Personnel p ON p.personnel_id = ap.lead_auditor_id
      ${where}
      ORDER BY ap.planned_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[mod08/audit-plans GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// GET /api/v1/mod08/audit-plans/:id
router.get('/:id', async (req, res) => {
  try {
    const plans = await query(`
      SELECT ap.*, p.full_name AS lead_auditor_full_name
      FROM dbo.AuditPlan ap
      LEFT JOIN dbo.Personnel p ON p.personnel_id = ap.lead_auditor_id
      WHERE ap.audit_plan_id = @id AND ap.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!plans.length) return res.status(404).json({ message: 'Audit plan not found.' });

    const findings = await query(`
      SELECT f.*, p.full_name AS assigned_full_name
      FROM dbo.AuditFinding f
      LEFT JOIN dbo.Personnel p ON p.personnel_id = f.assigned_to_id
      WHERE f.audit_plan_id = @id AND f.is_active = 1
      ORDER BY f.finding_number
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    const checklist = await query(`
      SELECT * FROM dbo.AuditChecklistItem
      WHERE audit_plan_id = @id ORDER BY item_seq
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    res.json({ ...plans[0], findings, checklist });
  } catch (err) {
    console.error('[mod08/audit-plans GET/:id]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod08/audit-plans
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const { audit_title, audit_type, audit_scope, standard_ref, planned_date,
          lead_auditor_id, lead_auditor_name, auditee_dept, checklist_items = [] } = req.body;
  if (!audit_title || !audit_type || !planned_date || !auditee_dept) {
    return res.status(400).json({ message: 'audit_title, audit_type, planned_date, auditee_dept required.' });
  }
  try {
    const year = new Date().getFullYear();
    await query(`
      UPDATE dbo.Mod08Sequence SET last_num = last_num + 1, last_year = @yr WHERE seq_key = 'AUDIT_PLAN'
    `, [{ name: 'yr', type: sql.Int, value: year }]);
    const seq = await query(`SELECT last_num FROM dbo.Mod08Sequence WHERE seq_key = 'AUDIT_PLAN'`);
    const audit_number = `AP-${year}-${String(seq[0].last_num).padStart(4, '0')}`;

    const result = await query(`
      INSERT INTO dbo.AuditPlan
        (audit_number, audit_title, audit_type, audit_scope, standard_ref, planned_date,
         lead_auditor_id, lead_auditor_name, auditee_dept, created_by)
      OUTPUT INSERTED.audit_plan_id
      VALUES (@num, @title, @type, @scope, @std, @date, @lead_id, @lead_name, @dept, @by)
    `, [
      { name: 'num',       type: sql.NVarChar(20),  value: audit_number },
      { name: 'title',     type: sql.NVarChar(200), value: audit_title },
      { name: 'type',      type: sql.NVarChar(30),  value: audit_type },
      { name: 'scope',     type: sql.NVarChar(500), value: audit_scope },
      { name: 'std',       type: sql.NVarChar(100), value: standard_ref || null },
      { name: 'date',      type: sql.Date,          value: planned_date },
      { name: 'lead_id',   type: sql.Int,           value: lead_auditor_id || null },
      { name: 'lead_name', type: sql.NVarChar(100), value: lead_auditor_name || null },
      { name: 'dept',      type: sql.NVarChar(100), value: auditee_dept },
      { name: 'by',        type: sql.Int,           value: req.user.userId },
    ]);
    const planId = result[0].audit_plan_id;

    // Insert checklist items if provided
    for (let i = 0; i < checklist_items.length; i++) {
      const ci = checklist_items[i];
      await query(`
        INSERT INTO dbo.AuditChecklistItem (audit_plan_id, item_seq, requirement_ref, question_text)
        VALUES (@pid, @seq, @ref, @q)
      `, [
        { name: 'pid', type: sql.Int,           value: planId },
        { name: 'seq', type: sql.Int,           value: i + 1 },
        { name: 'ref', type: sql.NVarChar(100), value: ci.requirement_ref },
        { name: 'q',   type: sql.NVarChar(500), value: ci.question_text },
      ]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'AuditPlan', recordId: planId, moduleId: 'MOD-08',
      newValue: audit_number });
    res.status(201).json({ audit_plan_id: planId, audit_number });
  } catch (err) {
    console.error('[mod08/audit-plans POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod08/audit-plans/:id/status
router.patch('/:id/status', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { status, actual_date, summary_findings, overall_result } = req.body;
  const allowed = ['PLANNED','IN_PROGRESS','COMPLETE','CANCELLED'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    await query(`
      UPDATE dbo.AuditPlan SET status=@s, actual_date=@ad,
        summary_findings=@sf, overall_result=@or2,
        closed_date = CASE WHEN @s IN ('COMPLETE','CANCELLED') THEN CAST(GETUTCDATE() AS DATE) ELSE closed_date END,
        updated_at=GETUTCDATE()
      WHERE audit_plan_id=@id AND is_active=1
    `, [
      { name: 's',   type: sql.NVarChar(20),  value: status },
      { name: 'ad',  type: sql.Date,          value: actual_date || null },
      { name: 'sf',  type: sql.NVarChar(sql.MAX), value: summary_findings || null },
      { name: 'or2', type: sql.NVarChar(20),  value: overall_result || null },
      { name: 'id',  type: sql.Int,           value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'STATUS_CHANGE', tableName: 'AuditPlan', recordId: parseInt(req.params.id),
      moduleId: 'MOD-08', newValue: status });
    res.json({ message: 'Status updated.' });
  } catch (err) {
    console.error('[mod08/audit-plans PATCH status]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod08/audit-plans/:id/checklist/:itemId
router.patch('/:id/checklist/:itemId', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const { response, notes } = req.body;
  try {
    await query(`
      UPDATE dbo.AuditChecklistItem SET response=@r, notes=@n
      WHERE checklist_item_id=@iid AND audit_plan_id=@pid
    `, [
      { name: 'r',   type: sql.NVarChar(10),      value: response || null },
      { name: 'n',   type: sql.NVarChar(sql.MAX),  value: notes || null },
      { name: 'iid', type: sql.Int, value: parseInt(req.params.itemId) },
      { name: 'pid', type: sql.Int, value: parseInt(req.params.id) },
    ]);
    res.json({ message: 'Checklist item updated.' });
  } catch (err) {
    console.error('[mod08/checklist PATCH]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
