'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/purchase-orders', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE po.is_active = 1';
    const params = [];
    if (status) { where += ' AND po.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`
      SELECT po.*, s.name AS supplier_name, u.full_name AS issued_by_name
      FROM PurchaseOrder po
      JOIN Supplier s ON s.supplier_id = po.supplier_id
      LEFT JOIN Users u ON u.user_id = po.issued_by
      ${where} ORDER BY po.created_at DESC
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/purchase-orders', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { pr_id, supplier_id, line_items, flowdown_requirements, right_of_access, customer_directed_source, total_value } = req.body;
    if (!supplier_id) return res.status(400).json({ message: 'supplier_id is required.' });

    // GAP-02: AVL gate — only APPROVED suppliers may receive POs (AS9100D §8.4 / SoR §9)
    const sup = await query(
      `SELECT status FROM dbo.Supplier WHERE supplier_id = @sid AND is_active = 1`,
      [{ name: 'sid', type: sql.Int, value: supplier_id }]
    );
    if (!sup.recordset.length) return res.status(404).json({ message: 'Supplier not found.' });
    if (sup.recordset[0].status !== 'APPROVED') {
      return res.status(422).json({ message: `PO cannot be raised — supplier status is '${sup.recordset[0].status}'. Only APPROVED suppliers are on the AVL.` });
    }

    const yr = new Date().getFullYear();
    const seqR = await query('UPDATE Mod12Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr OUTPUT INSERTED.last_num', [{ name: 'yr', type: sql.Int, value: yr }]);
    const num = `PO-${yr}-${String(seqR.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO PurchaseOrder (po_number, pr_id, supplier_id, line_items, flowdown_requirements, right_of_access, customer_directed_source, total_value, created_by)
      OUTPUT INSERTED.po_id
      VALUES (@num, @pr, @sid, @li, @fd, @ra, @cds, @tv, @uid)
    `, [
      { name: 'num', type: sql.NVarChar, value: num },
      { name: 'pr', type: sql.Int, value: pr_id || null },
      { name: 'sid', type: sql.Int, value: supplier_id },
      { name: 'li', type: sql.NVarChar, value: JSON.stringify(line_items || []) },
      { name: 'fd', type: sql.NVarChar, value: flowdown_requirements || null },
      { name: 'ra', type: sql.Bit, value: right_of_access ? 1 : 0 },
      { name: 'cds', type: sql.Bit, value: customer_directed_source ? 1 : 0 },
      { name: 'tv', type: sql.Decimal, value: total_value || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].po_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'PurchaseOrder', recordId: id, moduleId: 'MOD-12', newValue: JSON.stringify({ num, supplier_id }) });
    res.status(201).json({ po_id: id, po_number: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/purchase-orders/:id/issue', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    await query(`UPDATE PurchaseOrder SET status = 'ISSUED', issued_by = @uid, issued_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE po_id = @id AND is_active = 1`, [
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    if (req.body.pr_id) {
      await query(`UPDATE PurchaseRequisition SET status = 'PO_RAISED', updated_at = GETUTCDATE() WHERE pr_id = @pr`, [{ name: 'pr', type: sql.Int, value: req.body.pr_id }]);
    }
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'ISSUE', tableName: 'PurchaseOrder', recordId: +req.params.id, moduleId: 'MOD-12', newValue: 'ISSUED' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/purchase-orders/:id/status', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { status } = req.body;
    await query('UPDATE PurchaseOrder SET status = @status, updated_at = GETUTCDATE() WHERE po_id = @id AND is_active = 1', [
      { name: 'status', type: sql.NVarChar, value: status },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'STATUS_CHANGE', tableName: 'PurchaseOrder', recordId: +req.params.id, moduleId: 'MOD-12', newValue: status });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
