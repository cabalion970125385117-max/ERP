'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/ap-invoices', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE i.is_active = 1';
    const params = [];
    if (status) { where += ' AND i.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`SELECT i.*, s.name AS supplier_name FROM ApInvoice i JOIN Supplier s ON s.supplier_id = i.supplier_id ${where} ORDER BY i.due_date`, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ap-invoices', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { supplier_id, po_id, invoice_number, invoice_date, due_date, amount_sgd, gst_amount, notes } = req.body;
    const total = (amount_sgd || 0) + (gst_amount || 0);
    const r = await query(`
      INSERT INTO ApInvoice (invoice_number, supplier_id, po_id, invoice_date, due_date, amount_sgd, gst_amount, total_amount, notes, created_by)
      OUTPUT INSERTED.invoice_id
      VALUES (@num, @sid, @po, @id, @dd, @amt, @gst, @total, @notes, @uid)
    `, [
      { name: 'num', type: sql.NVarChar, value: invoice_number },
      { name: 'sid', type: sql.Int, value: supplier_id },
      { name: 'po', type: sql.Int, value: po_id || null },
      { name: 'id', type: sql.Date, value: invoice_date },
      { name: 'dd', type: sql.Date, value: due_date },
      { name: 'amt', type: sql.Decimal, value: amount_sgd },
      { name: 'gst', type: sql.Decimal, value: gst_amount || 0 },
      { name: 'total', type: sql.Decimal, value: total },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].invoice_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'ApInvoice', recordId: id, moduleId: 'MOD-16', newValue: JSON.stringify({ invoice_number, supplier_id, total }) });
    res.status(201).json({ invoice_id: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/ap-invoices/:id/approve', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    await query(`UPDATE ApInvoice SET status = 'APPROVED', updated_at = GETUTCDATE() WHERE invoice_id = @id AND is_active = 1`, [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'APPROVE', tableName: 'ApInvoice', recordId: +req.params.id, moduleId: 'MOD-16', newValue: 'APPROVED' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
