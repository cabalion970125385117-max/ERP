'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/requisitions', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE pr.is_active = 1';
    const params = [];
    if (status) { where += ' AND pr.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`
      SELECT pr.*, u.full_name AS raised_by_name, s.name AS supplier_name
      FROM PurchaseRequisition pr
      LEFT JOIN Users u ON u.user_id = pr.raised_by
      LEFT JOIN Supplier s ON s.supplier_id = pr.supplier_id
      ${where} ORDER BY pr.required_date, pr.created_at DESC
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/requisitions', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { item_description, qty, unit, required_date, supplier_id, estimated_cost, justification } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod12Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod12Sequence', []);
    const num = `PR-${yr}-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO PurchaseRequisition (pr_number, raised_by, item_description, qty, unit, required_date, supplier_id, estimated_cost, justification, created_by)
      OUTPUT INSERTED.pr_id
      VALUES (@num, @uid, @desc, @qty, @unit, @rd, @sid, @cost, @just, @uid)
    `, [
      { name: 'num', type: sql.NVarChar, value: num },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'desc', type: sql.NVarChar, value: item_description },
      { name: 'qty', type: sql.Decimal, value: qty },
      { name: 'unit', type: sql.NVarChar, value: unit },
      { name: 'rd', type: sql.Date, value: required_date },
      { name: 'sid', type: sql.Int, value: supplier_id || null },
      { name: 'cost', type: sql.Decimal, value: estimated_cost || null },
      { name: 'just', type: sql.NVarChar, value: justification || null },
    ]);
    const id = r.recordset[0].pr_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'PurchaseRequisition', recordId: id, moduleId: 'MOD-12', newValue: JSON.stringify({ num, item_description }) });
    res.status(201).json({ pr_id: id, pr_number: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/requisitions/:id/approve', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    await query(`UPDATE PurchaseRequisition SET status = 'APPROVED', approved_by = @uid, approved_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE pr_id = @id AND is_active = 1`, [
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'APPROVE', tableName: 'PurchaseRequisition', recordId: +req.params.id, moduleId: 'MOD-12', newValue: 'APPROVED' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
