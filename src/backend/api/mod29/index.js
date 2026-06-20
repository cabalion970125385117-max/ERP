/**
 * ATCA-ERP v1.0 — MOD-29 Customer Qualification
 * Lifecycle: Gap Analysis -> Close Gap -> Qualification -> Award -> Periodic Audit
 * AS9100D §8.4 / §9.2 | customer & NADCAP special-process approvals
 *
 * GET  /mod29/alerts/summary
 * GET  /mod29/qualifications?status=&customer=
 * POST /mod29/qualifications                 (ENGINEER+)
 * GET  /mod29/qualifications/:id
 * POST /mod29/qualifications/:id/gaps        (ENGINEER+)
 * PUT  /mod29/gaps/:gid                       (ENGINEER+)
 * POST /mod29/qualifications/:id/advance     (stage-gated)
 * POST /mod29/qualifications/:id/activities  (ENGINEER+)
 * POST /mod29/qualifications/:id/award        (QA_MANAGER+)
 * POST /mod29/qualifications/:id/periodic-audits (SUPERVISOR+)
 */
'use strict';

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

const STAGES = ['GAP_ANALYSIS','GAP_CLOSURE','QUALIFICATION','AWARD','PERIODIC_AUDIT'];

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const [r] = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.CustomerQualification WHERE status='GAP_ANALYSIS' AND is_active=1) AS in_gap_analysis,
        (SELECT COUNT(*) FROM dbo.QualGap g JOIN dbo.CustomerQualification q ON q.qual_id=g.qual_id
            WHERE g.status<>'CLOSED' AND q.is_active=1) AS gaps_open,
        (SELECT COUNT(*) FROM dbo.CustomerQualification WHERE status='QUALIFICATION' AND is_active=1) AS in_qualification,
        (SELECT COUNT(*) FROM dbo.CustomerQualification WHERE status='PERIODIC_AUDIT' AND is_active=1
            AND (valid_to IS NULL OR valid_to >= CAST(GETUTCDATE() AS DATE))) AS awarded_active,
        (SELECT COUNT(*) FROM dbo.CustomerQualification WHERE next_audit_due IS NOT NULL
            AND next_audit_due <= DATEADD(day,30,CAST(GETUTCDATE() AS DATE)) AND is_active=1) AS audits_due,
        (SELECT COUNT(*) FROM dbo.CustomerQualification WHERE valid_to IS NOT NULL
            AND valid_to BETWEEN CAST(GETUTCDATE() AS DATE) AND DATEADD(day,90,CAST(GETUTCDATE() AS DATE)) AND is_active=1) AS expiring_90d
    `);
    res.json({ ...r, total: r.in_gap_analysis + r.in_qualification + r.audits_due });
  } catch (err) {
    console.error('[mod29/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching qualification summary.' });
  }
});

/* ── GET /qualifications ─────────────────────────────────────── */
router.get('/qualifications', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const { status = '', customer = '' } = req.query;
    const rows = await query(`
      SELECT q.qual_id, q.qual_ref, q.customer_name, q.process_name, q.specification, q.status,
             q.certificate_no, q.valid_from, q.valid_to, q.next_audit_due,
             (SELECT COUNT(*) FROM dbo.QualGap g WHERE g.qual_id=q.qual_id) AS gaps_total,
             (SELECT COUNT(*) FROM dbo.QualGap g WHERE g.qual_id=q.qual_id AND g.status='CLOSED') AS gaps_closed
      FROM dbo.CustomerQualification q
      WHERE q.is_active=1
        AND (@status='' OR q.status=@status)
        AND (@customer='' OR q.customer_name=@customer)
      ORDER BY q.created_at DESC
    `, [
      { name: 'status',   type: sql.NVarChar(20),  value: status },
      { name: 'customer', type: sql.NVarChar(200), value: customer },
    ]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod29/qualifications]', err.message);
    res.status(500).json({ message: 'Error fetching qualifications.' });
  }
});

/* ── POST /qualifications ────────────────────────────────────── */
router.post('/qualifications', requireMinRole('ENGINEER'), async (req, res) => {
  const b = req.body || {};
  if (!b.customer_name || !b.process_name || !b.specification) {
    return res.status(400).json({ message: 'customer_name, process_name and specification are required.' });
  }
  try {
    const year = new Date().getFullYear();
    await query(`UPDATE dbo.Mod29Sequence SET last_num=last_num+1, last_year=@y WHERE seq_key='QUALIFICATION'`,
      [{ name: 'y', type: sql.Int, value: year }]);
    const [seq] = await query(`SELECT last_num FROM dbo.Mod29Sequence WHERE seq_key='QUALIFICATION'`);
    const ref = `QUAL-${year}-${String(seq.last_num).padStart(4,'0')}`;
    const [ins] = await query(`
      INSERT INTO dbo.CustomerQualification
        (qual_ref, customer_id, customer_name, capability_id, process_name, specification, lead_id, audit_interval_months, notes, created_by)
      OUTPUT INSERTED.qual_id
      VALUES (@ref,@cid,@cname,@capid,@proc,@spec,@lead,@interval,@notes,@by)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: ref },
      { name: 'cid',   type: sql.Int,           value: b.customer_id || null },
      { name: 'cname', type: sql.NVarChar(200), value: b.customer_name },
      { name: 'capid', type: sql.Int,           value: b.capability_id || null },
      { name: 'proc',  type: sql.NVarChar(120), value: b.process_name },
      { name: 'spec',  type: sql.NVarChar(300), value: b.specification },
      { name: 'lead',  type: sql.Int,           value: b.lead_id || null },
      { name: 'interval', type: sql.Int,        value: b.audit_interval_months || 12 },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: b.notes || null },
      { name: 'by',    type: sql.Int,           value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'CustomerQualification', recordId: ref, moduleId: 'MOD-29', newValue: ref });
    res.status(201).json({ qual_id: ins.qual_id, qual_ref: ref });
  } catch (err) {
    console.error('[mod29/qualifications POST]', err.message);
    res.status(500).json({ message: 'Error creating qualification.' });
  }
});

/* ── GET /qualifications/:id ─────────────────────────────────── */
router.get('/qualifications/:id', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [q] = await query(`SELECT * FROM dbo.CustomerQualification WHERE qual_id=@id AND is_active=1`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!q) return res.status(404).json({ message: 'Qualification not found.' });
    const gaps = await query(`
      SELECT g.*, p.full_name AS owner_name FROM dbo.QualGap g
      LEFT JOIN dbo.Personnel p ON p.personnel_id=g.owner_id
      WHERE g.qual_id=@id ORDER BY g.gap_no`, [{ name: 'id', type: sql.Int, value: id }]);
    const activities = await query(`SELECT * FROM dbo.QualActivity WHERE qual_id=@id ORDER BY activity_date DESC, activity_id DESC`,
      [{ name: 'id', type: sql.Int, value: id }]);
    const audits = await query(`SELECT * FROM dbo.QualPeriodicAudit WHERE qual_id=@id ORDER BY audit_no DESC`,
      [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ ...q, gaps, activities, periodic_audits: audits });
  } catch (err) {
    console.error('[mod29/qualifications/:id]', err.message);
    res.status(500).json({ message: 'Error fetching qualification.' });
  }
});

/* ── POST /:id/gaps ──────────────────────────────────────────── */
router.post('/qualifications/:id/gaps', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body || {};
  if (!b.requirement || !b.gap_desc) return res.status(400).json({ message: 'requirement and gap_desc are required.' });
  try {
    const [c] = await query(`SELECT ISNULL(MAX(gap_no),0)+1 AS n FROM dbo.QualGap WHERE qual_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await query(`
      INSERT INTO dbo.QualGap (qual_id, gap_no, requirement, current_state, gap_desc, severity, action, owner_id, due_date)
      VALUES (@id,@no,@req,@cur,@desc,@sev,@act,@owner,@due)
    `, [
      { name: 'id',  type: sql.Int, value: id },
      { name: 'no',  type: sql.Int, value: c.n },
      { name: 'req', type: sql.NVarChar(sql.MAX), value: b.requirement },
      { name: 'cur', type: sql.NVarChar(sql.MAX), value: b.current_state || null },
      { name: 'desc',type: sql.NVarChar(sql.MAX), value: b.gap_desc },
      { name: 'sev', type: sql.NVarChar(10), value: b.severity || 'MEDIUM' },
      { name: 'act', type: sql.NVarChar(sql.MAX), value: b.action || null },
      { name: 'owner', type: sql.Int, value: b.owner_id || null },
      { name: 'due', type: sql.Date, value: b.due_date || null },
    ]);
    res.status(201).json({ message: 'Gap added.', gap_no: c.n });
  } catch (err) {
    console.error('[mod29/gaps POST]', err.message);
    res.status(500).json({ message: 'Error adding gap.' });
  }
});

/* ── PUT /gaps/:gid (update / close) ─────────────────────────── */
router.put('/gaps/:gid', requireMinRole('ENGINEER'), async (req, res) => {
  const gid = parseInt(req.params.gid);
  const b = req.body || {};
  try {
    await query(`
      UPDATE dbo.QualGap SET
        action = COALESCE(@act, action),
        owner_id = COALESCE(@owner, owner_id),
        due_date = COALESCE(@due, due_date),
        evidence_ref = COALESCE(@ev, evidence_ref),
        severity = COALESCE(@sev, severity),
        status = COALESCE(@status, status),
        closed_date = CASE WHEN @status='CLOSED' THEN CAST(GETUTCDATE() AS DATE) ELSE closed_date END
      WHERE gap_id=@gid
    `, [
      { name: 'act', type: sql.NVarChar(sql.MAX), value: b.action ?? null },
      { name: 'owner', type: sql.Int, value: b.owner_id ?? null },
      { name: 'due', type: sql.Date, value: b.due_date ?? null },
      { name: 'ev', type: sql.NVarChar(200), value: b.evidence_ref ?? null },
      { name: 'sev', type: sql.NVarChar(10), value: b.severity ?? null },
      { name: 'status', type: sql.NVarChar(12), value: b.status ?? null },
      { name: 'gid', type: sql.Int, value: gid },
    ]);
    res.json({ message: 'Gap updated.' });
  } catch (err) {
    console.error('[mod29/gaps PUT]', err.message);
    res.status(500).json({ message: 'Error updating gap.' });
  }
});

/* ── POST /:id/advance — state machine with entry guards ─────── */
router.post('/qualifications/:id/advance', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [q] = await query(`SELECT * FROM dbo.CustomerQualification WHERE qual_id=@id AND is_active=1`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!q) return res.status(404).json({ message: 'Not found.' });
    const idx = STAGES.indexOf(q.status);
    if (idx < 0 || idx >= STAGES.length - 1) {
      return res.status(400).json({ message: `Cannot advance from status ${q.status}.` });
    }
    const next = STAGES[idx + 1];

    // Guards
    if (q.status === 'GAP_ANALYSIS' || q.status === 'GAP_CLOSURE') {
      const [g] = await query(`SELECT COUNT(*) AS open FROM dbo.QualGap WHERE qual_id=@id AND status<>'CLOSED'`,
        [{ name: 'id', type: sql.Int, value: id }]);
      // To leave GAP_CLOSURE (i.e. enter QUALIFICATION) all gaps must be closed
      if (q.status === 'GAP_CLOSURE' && g.open > 0) {
        return res.status(400).json({ message: `Cannot start qualification: ${g.open} gap(s) still open.` });
      }
    }
    if (q.status === 'QUALIFICATION') {
      const [a] = await query(`SELECT COUNT(*) AS pass FROM dbo.QualActivity WHERE qual_id=@id AND result='PASS'`,
        [{ name: 'id', type: sql.Int, value: id }]);
      if (a.pass === 0) {
        return res.status(400).json({ message: 'Cannot award: no qualification activity with a PASS result.' });
      }
    }
    // AWARD must use POST /award (sets certificate); advancing into AWARD just opens the award stage
    await query(`UPDATE dbo.CustomerQualification SET status=@s, updated_at=GETUTCDATE() WHERE qual_id=@id`,
      [{ name: 's', type: sql.NVarChar(20), value: next }, { name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'CustomerQualification', recordId: q.qual_ref, moduleId: 'MOD-29', newValue: `status:${next}` });
    res.json({ message: `Advanced to ${next}.`, status: next });
  } catch (err) {
    console.error('[mod29/advance]', err.message);
    res.status(500).json({ message: 'Error advancing qualification.' });
  }
});

/* ── POST /:id/activities ────────────────────────────────────── */
router.post('/qualifications/:id/activities', requireMinRole('ENGINEER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body || {};
  if (!b.activity_type) return res.status(400).json({ message: 'activity_type is required.' });
  try {
    await query(`
      INSERT INTO dbo.QualActivity (qual_id, activity_type, activity_date, performed_by, result, report_ref, notes)
      VALUES (@id,@type,@date,@by,@result,@ref,@notes)
    `, [
      { name: 'id',   type: sql.Int, value: id },
      { name: 'type', type: sql.NVarChar(20), value: b.activity_type },
      { name: 'date', type: sql.Date, value: b.activity_date || null },
      { name: 'by',   type: sql.NVarChar(120), value: b.performed_by || null },
      { name: 'result', type: sql.NVarChar(12), value: b.result || null },
      { name: 'ref',  type: sql.NVarChar(200), value: b.report_ref || null },
      { name: 'notes',type: sql.NVarChar(sql.MAX), value: b.notes || null },
    ]);
    res.status(201).json({ message: 'Activity recorded.' });
  } catch (err) {
    console.error('[mod29/activities POST]', err.message);
    res.status(500).json({ message: 'Error recording activity.' });
  }
});

/* ── POST /:id/award (QA_MANAGER+) ───────────────────────────── */
router.post('/qualifications/:id/award', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body || {};
  if (!b.certificate_no || !b.valid_from || !b.valid_to) {
    return res.status(400).json({ message: 'certificate_no, valid_from and valid_to are required to award.' });
  }
  try {
    const [q] = await query(`SELECT * FROM dbo.CustomerQualification WHERE qual_id=@id AND is_active=1`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!q) return res.status(404).json({ message: 'Not found.' });
    const [a] = await query(`SELECT COUNT(*) AS pass FROM dbo.QualActivity WHERE qual_id=@id AND result='PASS'`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (a.pass === 0) return res.status(400).json({ message: 'Cannot award without a PASS qualification activity.' });

    const interval = b.audit_interval_months || q.audit_interval_months || 12;
    await query(`
      UPDATE dbo.CustomerQualification SET
        status='PERIODIC_AUDIT', certificate_no=@cert, approval_authority=@auth,
        valid_from=@vf, valid_to=@vt, audit_interval_months=@interval,
        next_audit_due=DATEADD(month,@interval,@vf), updated_at=GETUTCDATE()
      WHERE qual_id=@id
    `, [
      { name: 'cert', type: sql.NVarChar(60), value: b.certificate_no },
      { name: 'auth', type: sql.NVarChar(120), value: b.approval_authority || null },
      { name: 'vf', type: sql.Date, value: b.valid_from },
      { name: 'vt', type: sql.Date, value: b.valid_to },
      { name: 'interval', type: sql.Int, value: interval },
      { name: 'id', type: sql.Int, value: id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'CustomerQualification', recordId: q.qual_ref, moduleId: 'MOD-29',
      newValue: `AWARDED:${b.certificate_no}` });
    res.json({ message: 'Qualification awarded.', certificate_no: b.certificate_no });
  } catch (err) {
    console.error('[mod29/award]', err.message);
    res.status(500).json({ message: 'Error awarding qualification.' });
  }
});

/* ── POST /:id/periodic-audits (SUPERVISOR+) ─────────────────── */
router.post('/qualifications/:id/periodic-audits', requireMinRole('SUPERVISOR'), async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body || {};
  try {
    const [c] = await query(`SELECT ISNULL(MAX(audit_no),0)+1 AS n FROM dbo.QualPeriodicAudit WHERE qual_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    const [q] = await query(`SELECT audit_interval_months FROM dbo.CustomerQualification WHERE qual_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    const interval = q ? (q.audit_interval_months || 12) : 12;
    await query(`
      INSERT INTO dbo.QualPeriodicAudit (qual_id, audit_no, scheduled_date, actual_date, auditor, result, findings, next_due)
      VALUES (@id,@no,@sched,@actual,@auditor,@result,@findings,
              CASE WHEN @actual IS NOT NULL THEN DATEADD(month,@interval,@actual) ELSE NULL END)
    `, [
      { name: 'id', type: sql.Int, value: id },
      { name: 'no', type: sql.Int, value: c.n },
      { name: 'sched', type: sql.Date, value: b.scheduled_date || null },
      { name: 'actual', type: sql.Date, value: b.actual_date || null },
      { name: 'auditor', type: sql.NVarChar(120), value: b.auditor || null },
      { name: 'result', type: sql.NVarChar(12), value: b.result || null },
      { name: 'findings', type: sql.NVarChar(sql.MAX), value: b.findings || null },
      { name: 'interval', type: sql.Int, value: interval },
    ]);
    // roll next_audit_due on the qualification when an audit is completed
    if (b.actual_date) {
      await query(`UPDATE dbo.CustomerQualification
        SET next_audit_due=DATEADD(month,@interval,@actual), updated_at=GETUTCDATE() WHERE qual_id=@id`,
        [{ name: 'interval', type: sql.Int, value: interval }, { name: 'actual', type: sql.Date, value: b.actual_date }, { name: 'id', type: sql.Int, value: id }]);
    }
    res.status(201).json({ message: 'Periodic audit logged.', audit_no: c.n });
  } catch (err) {
    console.error('[mod29/periodic-audits POST]', err.message);
    res.status(500).json({ message: 'Error logging periodic audit.' });
  }
});

module.exports = router;
