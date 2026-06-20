/**
 * ATCA-ERP v1.0 — MOD-31 Operator Competency & PIN Sign-off
 * NAS410 | AS9100D §7.2 | NADCAP operator approval / frozen process.
 * The PIN sign-off IS the electronic signature: non-transferable, timestamped, audit-logged.
 *
 * GET  /mod31/alerts/summary
 * GET  /mod31/competencies?process=&personnel_id=
 * POST /mod31/competencies            (SUPERVISOR+)  approve operator for process×customer×bay
 * PUT  /mod31/competencies/:id        (SUPERVISOR+)  suspend / revoke / renew
 * GET  /mod31/check?personnel_id=&process_area=&customer=   — competency gate (used by other modules)
 * POST /mod31/set-pin                 (self or SUPERVISOR for others)
 * POST /mod31/signoff                 — verify PIN + competency, record e-signature
 * GET  /mod31/signoffs?personnel_id=&record_ref=
 */
'use strict';

const router = require('express').Router();
const bcrypt = require('bcrypt');
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const [r] = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.OperatorCompetency WHERE is_active=1 AND status='ACTIVE') AS total_competencies,
        (SELECT COUNT(DISTINCT personnel_id) FROM dbo.OperatorCompetency WHERE is_active=1 AND status='ACTIVE') AS approved_operators,
        (SELECT COUNT(*) FROM dbo.OperatorCompetency WHERE is_active=1 AND status='ACTIVE'
            AND expiry_date IS NOT NULL AND expiry_date <= DATEADD(day,90,CAST(GETUTCDATE() AS DATE))) AS expiring_90d,
        (SELECT COUNT(*) FROM dbo.OperatorCompetency WHERE is_active=1 AND status IN ('SUSPENDED','EXPIRED','REVOKED')) AS suspended,
        (SELECT COUNT(*) FROM dbo.OperatorSignoff WHERE CAST(signed_at AS DATE)=CAST(GETUTCDATE() AS DATE)) AS signoffs_today
    `);
    res.json({ ...r, total: r.expiring_90d + r.suspended });
  } catch (err) {
    console.error('[mod31/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching competency summary.' });
  }
});

/* ── GET /competencies ───────────────────────────────────────── */
router.get('/competencies', async (req, res) => {
  try {
    const { process = '', personnel_id = '' } = req.query;
    const rows = await query(`
      SELECT c.competency_id, c.personnel_id, p.full_name, p.employee_id,
             c.process_area, c.customer_category, c.bay, c.approval_level,
             c.approved_date, c.expiry_date, c.status,
             a.full_name AS approver_name,
             CASE WHEN c.expiry_date < CAST(GETUTCDATE() AS DATE) THEN 'EXPIRED'
                  WHEN c.expiry_date <= DATEADD(day,90,CAST(GETUTCDATE() AS DATE)) THEN 'EXPIRING'
                  ELSE 'OK' END AS expiry_flag
      FROM dbo.OperatorCompetency c
      JOIN dbo.Personnel p ON p.personnel_id=c.personnel_id
      LEFT JOIN dbo.Personnel a ON a.personnel_id=c.approver_id
      WHERE c.is_active=1
        AND (@process='' OR c.process_area=@process)
        AND (@pid='' OR c.personnel_id=@pid)
      ORDER BY c.process_area, p.full_name
    `, [
      { name: 'process', type: sql.NVarChar(120), value: process },
      { name: 'pid', type: sql.NVarChar(20), value: personnel_id },
    ]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod31/competencies]', err.message);
    res.status(500).json({ message: 'Error fetching competencies.' });
  }
});

/* ── POST /competencies (SUPERVISOR+) ────────────────────────── */
router.post('/competencies', requireMinRole('SUPERVISOR'), async (req, res) => {
  const b = req.body || {};
  if (!b.personnel_id || !b.process_area) {
    return res.status(400).json({ message: 'personnel_id and process_area are required.' });
  }
  try {
    const [ins] = await query(`
      INSERT INTO dbo.OperatorCompetency
        (personnel_id, process_area, customer_category, bay, capability_id, approval_level, approved_date, expiry_date, approver_id, evidence_ref, notes)
      OUTPUT INSERTED.competency_id
      VALUES (@pid,@proc,@cust,@bay,@cap,@level,@appr,@exp,@approver,@ev,@notes)
    `, [
      { name: 'pid', type: sql.Int, value: b.personnel_id },
      { name: 'proc', type: sql.NVarChar(120), value: b.process_area },
      { name: 'cust', type: sql.NVarChar(120), value: b.customer_category || null },
      { name: 'bay', type: sql.NVarChar(20), value: b.bay || null },
      { name: 'cap', type: sql.Int, value: b.capability_id || null },
      { name: 'level', type: sql.NVarChar(20), value: b.approval_level || 'OPERATOR' },
      { name: 'appr', type: sql.Date, value: b.approved_date || new Date().toISOString().slice(0,10) },
      { name: 'exp', type: sql.Date, value: b.expiry_date || null },
      { name: 'approver', type: sql.Int, value: b.approver_id || null },
      { name: 'ev', type: sql.NVarChar(200), value: b.evidence_ref || null },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: b.notes || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'OperatorCompetency', recordId: String(ins.competency_id), moduleId: 'MOD-31',
      newValue: `${b.process_area}/${b.customer_category||'General'}` });
    res.status(201).json({ competency_id: ins.competency_id });
  } catch (err) {
    console.error('[mod31/competencies POST]', err.message);
    res.status(500).json({ message: 'Error adding competency.' });
  }
});

/* ── PUT /competencies/:id (suspend/revoke/renew) ────────────── */
router.put('/competencies/:id', requireMinRole('SUPERVISOR'), async (req, res) => {
  const b = req.body || {};
  try {
    await query(`
      UPDATE dbo.OperatorCompetency SET
        status = COALESCE(@status, status),
        expiry_date = COALESCE(@exp, expiry_date),
        approval_level = COALESCE(@level, approval_level)
      WHERE competency_id=@id
    `, [
      { name: 'status', type: sql.NVarChar(12), value: b.status ?? null },
      { name: 'exp', type: sql.Date, value: b.expiry_date ?? null },
      { name: 'level', type: sql.NVarChar(20), value: b.approval_level ?? null },
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'OperatorCompetency', recordId: req.params.id, moduleId: 'MOD-31', newValue: b.status || '' });
    res.json({ message: 'Competency updated.' });
  } catch (err) {
    console.error('[mod31/competencies PUT]', err.message);
    res.status(500).json({ message: 'Error updating competency.' });
  }
});

/* ── GET /check — competency gate for other modules ──────────── */
router.get('/check', async (req, res) => {
  const { personnel_id, process_area, customer = '' } = req.query;
  if (!personnel_id || !process_area) return res.status(400).json({ message: 'personnel_id and process_area required.' });
  try {
    const rows = await query(`
      SELECT TOP 1 competency_id, approval_level, expiry_date FROM dbo.OperatorCompetency
      WHERE is_active=1 AND status='ACTIVE' AND personnel_id=@pid AND process_area=@proc
        AND (customer_category IS NULL OR @cust='' OR customer_category=@cust)
        AND (expiry_date IS NULL OR expiry_date >= CAST(GETUTCDATE() AS DATE))
      ORDER BY CASE WHEN customer_category=@cust THEN 0 ELSE 1 END
    `, [
      { name: 'pid', type: sql.Int, value: parseInt(personnel_id) },
      { name: 'proc', type: sql.NVarChar(120), value: process_area },
      { name: 'cust', type: sql.NVarChar(120), value: customer },
    ]);
    res.json({ competent: rows.length > 0, competency_id: rows[0]?.competency_id || null, approval_level: rows[0]?.approval_level || null });
  } catch (err) {
    console.error('[mod31/check]', err.message);
    res.status(500).json({ message: 'Error checking competency.' });
  }
});

/* ── POST /set-pin ───────────────────────────────────────────── */
router.post('/set-pin', async (req, res) => {
  const b = req.body || {};
  const targetPid = b.personnel_id;
  if (!targetPid || !b.pin) return res.status(400).json({ message: 'personnel_id and pin are required.' });
  if (!/^\d{4,8}$/.test(String(b.pin))) return res.status(400).json({ message: 'PIN must be 4–8 digits.' });
  // self-set allowed; setting another operator's PIN requires SUPERVISOR+
  if (req.user.personnelId !== targetPid && !['SUPERVISOR','ENGINEER','QA_MANAGER','ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only SUPERVISOR+ may set another operator PIN.' });
  }
  try {
    const hash = await bcrypt.hash(String(b.pin), 10);
    await query(`UPDATE dbo.Personnel SET operator_pin_hash=@h, pin_set_at=GETUTCDATE() WHERE personnel_id=@pid`,
      [{ name: 'h', type: sql.NVarChar(200), value: hash }, { name: 'pid', type: sql.Int, value: targetPid }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'Personnel', recordId: String(targetPid), moduleId: 'MOD-31', newValue: 'pin_set' });
    res.json({ message: 'PIN set.' });
  } catch (err) {
    console.error('[mod31/set-pin]', err.message);
    res.status(500).json({ message: 'Error setting PIN.' });
  }
});

/* ── POST /signoff — PIN-verified electronic signature ───────── */
router.post('/signoff', async (req, res) => {
  const b = req.body || {};
  if (!b.personnel_id || !b.pin || !b.action || !b.process_area) {
    return res.status(400).json({ message: 'personnel_id, pin, action and process_area are required.' });
  }
  try {
    const [p] = await query(`SELECT operator_pin_hash, full_name FROM dbo.Personnel WHERE personnel_id=@id`,
      [{ name: 'id', type: sql.Int, value: b.personnel_id }]);
    if (!p || !p.operator_pin_hash) return res.status(400).json({ message: 'Operator has no PIN set.' });
    const ok = await bcrypt.compare(String(b.pin), p.operator_pin_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid PIN.' });

    // competency gate
    const [c] = await query(`
      SELECT TOP 1 competency_id FROM dbo.OperatorCompetency
      WHERE is_active=1 AND status='ACTIVE' AND personnel_id=@pid AND process_area=@proc
        AND (customer_category IS NULL OR @cust='' OR customer_category=@cust)
        AND (expiry_date IS NULL OR expiry_date >= CAST(GETUTCDATE() AS DATE))
    `, [
      { name: 'pid', type: sql.Int, value: b.personnel_id },
      { name: 'proc', type: sql.NVarChar(120), value: b.process_area },
      { name: 'cust', type: sql.NVarChar(120), value: b.customer_category || '' },
    ]);
    if (!c) return res.status(403).json({ message: `${p.full_name} is not an approved operator for ${b.process_area}.` });

    const lan = getLanIp(req);
    const [ins] = await query(`
      INSERT INTO dbo.OperatorSignoff (personnel_id, competency_id, action, module_id, record_ref, process_area, lan_ip)
      OUTPUT INSERTED.signoff_id, INSERTED.signed_at
      VALUES (@pid,@cid,@action,@mod,@ref,@proc,@ip)
    `, [
      { name: 'pid', type: sql.Int, value: b.personnel_id },
      { name: 'cid', type: sql.Int, value: c.competency_id },
      { name: 'action', type: sql.NVarChar(120), value: b.action },
      { name: 'mod', type: sql.NVarChar(10), value: b.module_id || null },
      { name: 'ref', type: sql.NVarChar(60), value: b.record_ref || null },
      { name: 'proc', type: sql.NVarChar(120), value: b.process_area },
      { name: 'ip', type: sql.NVarChar(45), value: lan },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: lan,
      action: 'SIGNOFF', tableName: 'OperatorSignoff', recordId: String(ins.signoff_id), moduleId: 'MOD-31',
      newValue: `${p.full_name} · ${b.action}` });
    res.status(201).json({ signoff_id: ins.signoff_id, signed_by: p.full_name, signed_at: ins.signed_at, message: 'Signed off.' });
  } catch (err) {
    console.error('[mod31/signoff]', err.message);
    res.status(500).json({ message: 'Error recording sign-off.' });
  }
});

/* ── GET /signoffs ───────────────────────────────────────────── */
router.get('/signoffs', async (req, res) => {
  try {
    const { personnel_id = '', record_ref = '' } = req.query;
    const rows = await query(`
      SELECT TOP 100 s.signoff_id, s.action, s.module_id, s.record_ref, s.process_area, s.signed_at, s.lan_ip,
             p.full_name, p.employee_id
      FROM dbo.OperatorSignoff s JOIN dbo.Personnel p ON p.personnel_id=s.personnel_id
      WHERE (@pid='' OR s.personnel_id=@pid) AND (@ref='' OR s.record_ref=@ref)
      ORDER BY s.signed_at DESC
    `, [
      { name: 'pid', type: sql.NVarChar(20), value: personnel_id },
      { name: 'ref', type: sql.NVarChar(60), value: record_ref },
    ]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod31/signoffs]', err.message);
    res.status(500).json({ message: 'Error fetching sign-offs.' });
  }
});

module.exports = router;
