'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/items', async (req, res) => {
  try {
    const { category } = req.query;
    let where = 'WHERE i.is_active = 1';
    const params = [];
    if (category) { where += ' AND i.category = @category'; params.push({ name: 'category', type: sql.NVarChar, value: category }); }
    const r = await query(`
      SELECT i.*,
        CASE WHEN i.current_stock = 0 THEN 'RED'
             WHEN i.current_stock <= i.reorder_level THEN 'AMBER'
             ELSE 'GREEN' END AS rag_status,
        s.name AS supplier_name
      FROM InventoryItem i
      LEFT JOIN Supplier s ON s.supplier_id = i.supplier_id
      ${where} ORDER BY i.category, i.name
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/items', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { name, description, category, unit, location, reorder_level, storage_conditions, hazardous_flag, incompatible_materials, sds_ref, shelf_life_days, supplier_id, unit_cost } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod14Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod14Sequence', []);
    const code = `INV-${yr}-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO InventoryItem (item_code, name, description, category, unit, location, reorder_level, storage_conditions, hazardous_flag, incompatible_materials, sds_ref, shelf_life_days, supplier_id, unit_cost, created_by)
      OUTPUT INSERTED.item_id
      VALUES (@code, @name, @desc, @cat, @unit, @loc, @rl, @sc, @hf, @im, @sds, @sl, @sid, @uc, @uid)
    `, [
      { name: 'code', type: sql.NVarChar, value: code },
      { name: 'name', type: sql.NVarChar, value: name },
      { name: 'desc', type: sql.NVarChar, value: description || null },
      { name: 'cat', type: sql.NVarChar, value: category },
      { name: 'unit', type: sql.NVarChar, value: unit },
      { name: 'loc', type: sql.NVarChar, value: location || null },
      { name: 'rl', type: sql.Decimal, value: reorder_level || 0 },
      { name: 'sc', type: sql.NVarChar, value: storage_conditions || null },
      { name: 'hf', type: sql.Bit, value: hazardous_flag ? 1 : 0 },
      { name: 'im', type: sql.NVarChar, value: incompatible_materials || null },
      { name: 'sds', type: sql.NVarChar, value: sds_ref || null },
      { name: 'sl', type: sql.Int, value: shelf_life_days || null },
      { name: 'sid', type: sql.Int, value: supplier_id || null },
      { name: 'uc', type: sql.Decimal, value: unit_cost || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].item_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'InventoryItem', recordId: id, moduleId: 'MOD-14', newValue: JSON.stringify({ code, name }) });
    res.status(201).json({ item_id: id, item_code: code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
