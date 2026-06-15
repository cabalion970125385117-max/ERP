'use strict';
const router  = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// GET /api/v1/mod08/findings
router.get('/', async (req, res) => {
  const { status, type, audit_plan_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE f.is_active = 1';
    const params = [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ];
    if (status)        { where += ' AND f.status = @status'; params.push({ name: 'status', type: sql.NVarChar(20), value: status }); }
    if (type)          { where += ' AND f.finding_type = @type'; params.push({ name: 'type', type: sql.NVarChar(20), value: type }); }
    if (audit_plan_id) { where += ' AND f.audit_plan_id = @apid'; params.push({ name: 'apid', type: sql.Int, value: parseInt(audit_plan_id) }); }

    const rows = await query(`
      SELECT f.*, ap.audit_number, ap.audit_title, p.full_name AS assigned_full_name,
        r.response_id, r.root_cause, r.corrective_action, r.target_date, r.completion_date
      FROM dbo.AuditFinding f
      LEFT JOIN dbo.AuditPlan ap ON ap.audit_plan_id = f.audit_plan_id
      LEFT JOIN dbo.Personnel p  ON p.personnel_id = f.assigned_to_id
      LEFT JOIN dbo.AuditResponse r ON r.finding_id = f.finding_id
      ${where}
      ORDER BY f.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[mod08/findings GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod08/findings  — raise a finding against an audit
router.post('/', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { audit_plan_id, finding_type, clause_reference, description,
          objective_evidence, assigned_to_id, assigned_to_name, due_date, ncr_id } = req.body;
  if (!audit_plan_id || !finding_type || !description) {
    return res.status(400).json({ message: 'audit_plan_id, finding_type, description required.' });
  }
  try {
    const year = new Date().getFullYear();
    await query(`
      UPDATE dbo.Mod08Sequence SET last_num = last_num + 1, last_year = @yr WHERE seq_key = 'AUDIT_FINDING'
    `, [{ name: 'yr', type: sql.Int, value: year }]);
    const seq = await query(`SELECT last_num FROM dbo.Mod08Sequence WHERE seq_key = 'AUDIT_FINDING'`);
    const finding_number = `AF-${year}-${String(seq[0].last_num).padStart(4, '0')}`;

    const result = await query(`
      INSERT INTO dbo.AuditFinding
        (audit_plan_id, finding_number, finding_type, clause_reference, description,
         objective_evidence, assigned_to_id, assigned_to_name, due_date, ncr_id, created_by)
      OUTPUT INSERTED.finding_id
      VALUES (@apid, @num, @ftype, @clause, @desc, @oe, @aid, @aname, @due, @ncr, @by)
    `, [
      { name: 'apid',   type: sql.Int,           value: parseInt(audit_plan_id) },
      { name: 'num',    type: sql.NVarChar(20),  value: finding_number },
      { name: 'ftype',  type: sql.NVarChar(20),  value: finding_type },
      { name: 'clause', type: sql.NVarChar(100), value: clause_reference || null },
      { name: 'desc',   type: sql.NVarChar(sql.MAX), value: description },
      { name: 'oe',     type: sql.NVarChar(sql.MAX), value: objective_evidence || null },
      { name: 'aid',    type: sql.Int,           value: assigned_to_id || null },
      { name: 'aname',  type: sql.NVarChar(100), value: assigned_to_name || null },
      { name: 'due',    type: sql.Date,          value: due_date || null },
      { name: 'ncr',    type: sql.Int,           value: ncr_id || null },
      { name: 'by',     type: sql.Int,           value: req.user.userId },
    ]);
    const findingId = result[0].finding_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'AuditFinding', recordId: findingId, moduleId: 'MOD-08',
      newValue: finding_number });
    res.status(201).json({ finding_id: findingId, finding_number });
  } catch (err) {
    console.error('[mod08/findings POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod08/findings/:id/response  — submit corrective action response
router.post('/:id/response', requireMinRole('ENGINEER'), async (req, res) => {
  const { root_cause, correction, corrective_action, target_date } = req.body;
  try {
    // Upsert response (one per finding)
    const existing = await query(`SELECT response_id FROM dbo.AuditResponse WHERE finding_id = @fid`,
      [{ name: 'fid', type: sql.Int, value: parseInt(req.params.id) }]);

    if (existing.length) {
      await query(`
        UPDATE dbo.AuditResponse SET root_cause=@rc, correction=@cor, corrective_action=@ca,
          target_date=@td, updated_at=GETUTCDATE()
        WHERE finding_id=@fid
      `, [
        { name: 'rc',  type: sql.NVarChar(sql.MAX), value: root_cause || null },
        { name: 'cor', type: sql.NVarChar(sql.MAX), value: correction || null },
        { name: 'ca',  type: sql.NVarChar(sql.MAX), value: corrective_action || null },
        { name: 'td',  type: sql.Date,              value: target_date || null },
        { name: 'fid', type: sql.Int,               value: parseInt(req.params.id) },
      ]);
    } else {
      await query(`
        INSERT INTO dbo.AuditResponse (finding_id, root_cause, correction, corrective_action, target_date, submitted_by)
        VALUES (@fid, @rc, @cor, @ca, @td, @by)
      `, [
        { name: 'fid', type: sql.Int,               value: parseInt(req.params.id) },
        { name: 'rc',  type: sql.NVarChar(sql.MAX), value: root_cause || null },
        { name: 'cor', type: sql.NVarChar(sql.MAX), value: correction || null },
        { name: 'ca',  type: sql.NVarChar(sql.MAX), value: corrective_action || null },
        { name: 'td',  type: sql.Date,              value: target_date || null },
        { name: 'by',  type: sql.Int,               value: req.user.userId },
      ]);
    }
    // Update finding status
    await query(`
      UPDATE dbo.AuditFinding SET status='RESPONSE_SUBMITTED', updated_at=GETUTCDATE()
      WHERE finding_id=@fid AND status='OPEN'
    `, [{ name: 'fid', type: sql.Int, value: parseInt(req.params.id) }]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'RESPONSE', tableName: 'AuditFinding', recordId: parseInt(req.params.id), moduleId: 'MOD-08' });
    res.json({ message: 'Response submitted.' });
  } catch (err) {
    console.error('[mod08/findings response POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod08/findings/:id/verify
router.patch('/:id/verify', requireMinRole('QA_MANAGER'), async (req, res) => {
  const { verification_evidence, verified } = req.body;
  const newStatus = verified ? 'VERIFIED' : 'OPEN';
  try {
    await query(`
      UPDATE dbo.AuditFinding SET status=@s, updated_at=GETUTCDATE()
      WHERE finding_id=@id AND is_active=1
    `, [
      { name: 's',  type: sql.NVarChar(20), value: newStatus },
      { name: 'id', type: sql.Int,          value: parseInt(req.params.id) },
    ]);
    await query(`
      UPDATE dbo.AuditResponse SET verified_by_id=@vid, verified_date=CAST(GETUTCDATE() AS DATE),
        verification_evidence=@ve, updated_at=GETUTCDATE()
      WHERE finding_id=@fid
    `, [
      { name: 'vid', type: sql.Int,               value: req.user.userId },
      { name: 've',  type: sql.NVarChar(sql.MAX), value: verification_evidence || null },
      { name: 'fid', type: sql.Int,               value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'VERIFY', tableName: 'AuditFinding', recordId: parseInt(req.params.id), moduleId: 'MOD-08',
      newValue: newStatus });
    res.json({ message: `Finding ${newStatus}.` });
  } catch (err) {
    console.error('[mod08/findings verify]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
