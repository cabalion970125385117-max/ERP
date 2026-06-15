'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/staff', async (req, res) => {
  try {
    const { status, department } = req.query;
    let where = 'WHERE s.is_active = 1';
    const params = [];
    if (status) { where += ' AND s.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    if (department) { where += ' AND s.department = @dept'; params.push({ name: 'dept', type: sql.NVarChar, value: department }); }
    const r = await query(`
      SELECT s.*, e.entity_name, e.division, e.department AS org_department
      FROM StaffRecord s
      JOIN OrgEntity e ON e.entity_id = s.entity_id
      ${where} ORDER BY s.full_name
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/staff/:id', async (req, res) => {
  try {
    const r = await query('SELECT s.*, e.entity_name FROM StaffRecord s JOIN OrgEntity e ON e.entity_id = s.entity_id WHERE s.staff_id = @id AND s.is_active = 1', [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    if (!r.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/staff', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { full_name, job_title, department, employment_type, employment_date, entity_id, user_id, emergency_contact_name, emergency_contact_phone, notes } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod18Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod18Sequence', []);
    const emp_id = `EMP-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO StaffRecord (employee_id, user_id, entity_id, full_name, job_title, department, employment_type, employment_date, emergency_contact_name, emergency_contact_phone, notes, created_by)
      OUTPUT INSERTED.staff_id
      VALUES (@eid, @uid2, @entid, @fn, @jt, @dept, @et, @ed, @ecn, @ecp, @notes, @uid)
    `, [
      { name: 'eid', type: sql.NVarChar, value: emp_id },
      { name: 'uid2', type: sql.Int, value: user_id || null },
      { name: 'entid', type: sql.Int, value: entity_id || 1 },
      { name: 'fn', type: sql.NVarChar, value: full_name },
      { name: 'jt', type: sql.NVarChar, value: job_title },
      { name: 'dept', type: sql.NVarChar, value: department || null },
      { name: 'et', type: sql.NVarChar, value: employment_type || 'PERMANENT' },
      { name: 'ed', type: sql.Date, value: employment_date },
      { name: 'ecn', type: sql.NVarChar, value: emergency_contact_name || null },
      { name: 'ecp', type: sql.NVarChar, value: emergency_contact_phone || null },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].staff_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'StaffRecord', recordId: id, moduleId: 'MOD-18', newValue: JSON.stringify({ emp_id, full_name }) });
    res.status(201).json({ staff_id: id, employee_id: emp_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/staff/:id', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { job_title, department, status, onboarding_complete, conflict_of_interest_declared } = req.body;
    await query(`UPDATE StaffRecord SET
      job_title = ISNULL(@jt, job_title),
      department = ISNULL(@dept, department),
      status = ISNULL(@status, status),
      onboarding_complete = ISNULL(@oc, onboarding_complete),
      conflict_of_interest_declared = ISNULL(@cid, conflict_of_interest_declared),
      conflict_of_interest_date = CASE WHEN @cid = 1 THEN CAST(GETUTCDATE() AS DATE) ELSE conflict_of_interest_date END,
      updated_at = GETUTCDATE()
      WHERE staff_id = @id AND is_active = 1`, [
      { name: 'jt', type: sql.NVarChar, value: job_title || null },
      { name: 'dept', type: sql.NVarChar, value: department || null },
      { name: 'status', type: sql.NVarChar, value: status || null },
      { name: 'oc', type: sql.Bit, value: onboarding_complete != null ? (onboarding_complete ? 1 : 0) : null },
      { name: 'cid', type: sql.Bit, value: conflict_of_interest_declared != null ? (conflict_of_interest_declared ? 1 : 0) : null },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'UPDATE', tableName: 'StaffRecord', recordId: +req.params.id, moduleId: 'MOD-18', newValue: JSON.stringify(req.body) });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
