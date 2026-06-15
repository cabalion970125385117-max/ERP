'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/movements', async (req, res) => {
  try {
    const { item_id } = req.query;
    let where = 'WHERE m.is_active = 1';
    const params = [];
    if (item_id) { where += ' AND m.item_id = @iid'; params.push({ name: 'iid', type: sql.Int, value: +item_id }); }
    const r = await query(`
      SELECT m.*, i.name AS item_name, i.item_code, u.full_name AS moved_by_name
      FROM InventoryMovement m
      JOIN InventoryItem i ON i.item_id = m.item_id
      JOIN Users u ON u.user_id = m.moved_by
      ${where} ORDER BY m.moved_at DESC
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/movements', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { item_id, movement_type, qty, lot_number, batch_ref, linked_wo_id, notes } = req.body;
    const r = await query(`
      INSERT INTO InventoryMovement (item_id, movement_type, qty, lot_number, batch_ref, linked_wo_id, moved_by, notes)
      OUTPUT INSERTED.movement_id
      VALUES (@iid, @mt, @qty, @ln, @br, @wo, @uid, @notes)
    `, [
      { name: 'iid', type: sql.Int, value: item_id },
      { name: 'mt', type: sql.NVarChar, value: movement_type },
      { name: 'qty', type: sql.Decimal, value: qty },
      { name: 'ln', type: sql.NVarChar, value: lot_number || null },
      { name: 'br', type: sql.NVarChar, value: batch_ref || null },
      { name: 'wo', type: sql.Int, value: linked_wo_id || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
    ]);
    // Update stock level
    const delta = ['RECEIPT'].includes(movement_type) ? qty : -Math.abs(qty);
    await query('UPDATE InventoryItem SET current_stock = current_stock + @delta, updated_at = GETUTCDATE() WHERE item_id = @iid', [
      { name: 'delta', type: sql.Decimal, value: delta },
      { name: 'iid', type: sql.Int, value: item_id },
    ]);
    const id = r.recordset[0].movement_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'MOVEMENT', tableName: 'InventoryMovement', recordId: id, moduleId: 'MOD-14', newValue: JSON.stringify({ item_id, movement_type, qty }) });
    res.status(201).json({ movement_id: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
