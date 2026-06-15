'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/suppliers', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE s.is_active = 1';
    const params = [];
    if (status) { where += ' AND s.approval_status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`SELECT * FROM Supplier s ${where} ORDER BY s.name`, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/suppliers/:id', async (req, res) => {
  try {
    const r = await query('SELECT * FROM Supplier WHERE supplier_id = @id AND is_active = 1', [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    if (!r.recordset.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/suppliers', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { name, contact_name, email, phone, address, approval_status, avl_scope, accreditation_body, accreditation_ref, accreditation_expiry, notes } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod12Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod12Sequence', []);
    const code = `SUP-${yr}-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO Supplier (supplier_code, name, contact_name, email, phone, address, approval_status, avl_scope, accreditation_body, accreditation_ref, accreditation_expiry, notes, created_by)
      OUTPUT INSERTED.supplier_id
      VALUES (@code, @name, @cn, @email, @phone, @addr, @status, @scope, @ab, @ar, @ae, @notes, @uid)
    `, [
      { name: 'code', type: sql.NVarChar, value: code },
      { name: 'name', type: sql.NVarChar, value: name },
      { name: 'cn', type: sql.NVarChar, value: contact_name || null },
      { name: 'email', type: sql.NVarChar, value: email || null },
      { name: 'phone', type: sql.NVarChar, value: phone || null },
      { name: 'addr', type: sql.NVarChar, value: address || null },
      { name: 'status', type: sql.NVarChar, value: approval_status || 'APPROVED' },
      { name: 'scope', type: sql.NVarChar, value: avl_scope || null },
      { name: 'ab', type: sql.NVarChar, value: accreditation_body || null },
      { name: 'ar', type: sql.NVarChar, value: accreditation_ref || null },
      { name: 'ae', type: sql.Date, value: accreditation_expiry || null },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].supplier_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'Supplier', recordId: id, moduleId: 'MOD-12', newValue: JSON.stringify({ code, name }) });
    res.status(201).json({ supplier_id: id, supplier_code: code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/suppliers/:id/status', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const { approval_status, notes } = req.body;
    await query('UPDATE Supplier SET approval_status = @status, notes = ISNULL(@notes, notes), updated_at = GETUTCDATE() WHERE supplier_id = @id AND is_active = 1', [
      { name: 'status', type: sql.NVarChar, value: approval_status },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'STATUS_CHANGE', tableName: 'Supplier', recordId: +req.params.id, moduleId: 'MOD-12', newValue: approval_status });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
