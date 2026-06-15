'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/ar-invoices', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE i.is_active = 1';
    const params = [];
    if (status) { where += ' AND i.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`SELECT i.*, u.full_name AS created_by_name FROM ArInvoice i LEFT JOIN Users u ON u.user_id = i.created_by ${where} ORDER BY i.due_date, i.created_at DESC`, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ar-invoices', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { customer_name, customer_id, invoice_date, due_date, amount_sgd, gst_amount, notes } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod16Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod16Sequence', []);
    const num = `INV-${yr}-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const total = (amount_sgd || 0) + (gst_amount || 0);
    const r = await query(`
      INSERT INTO ArInvoice (invoice_number, customer_name, customer_id, invoice_date, due_date, amount_sgd, gst_amount, total_amount, notes, created_by)
      OUTPUT INSERTED.invoice_id
      VALUES (@num, @cn, @cid, @id, @dd, @amt, @gst, @total, @notes, @uid)
    `, [
      { name: 'num', type: sql.NVarChar, value: num },
      { name: 'cn', type: sql.NVarChar, value: customer_name },
      { name: 'cid', type: sql.Int, value: customer_id || null },
      { name: 'id', type: sql.Date, value: invoice_date },
      { name: 'dd', type: sql.Date, value: due_date },
      { name: 'amt', type: sql.Decimal, value: amount_sgd },
      { name: 'gst', type: sql.Decimal, value: gst_amount || 0 },
      { name: 'total', type: sql.Decimal, value: total },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].invoice_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'ArInvoice', recordId: id, moduleId: 'MOD-16', newValue: JSON.stringify({ num, customer_name, total }) });
    res.status(201).json({ invoice_id: id, invoice_number: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/ar-invoices/:id/mark-paid', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    await query(`UPDATE ArInvoice SET status = 'PAID', paid_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE invoice_id = @id AND is_active = 1`, [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'MARK_PAID', tableName: 'ArInvoice', recordId: +req.params.id, moduleId: 'MOD-16', newValue: 'PAID' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
