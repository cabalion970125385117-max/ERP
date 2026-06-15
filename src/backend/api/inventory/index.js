'use strict';
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);
router.use(require('./inventory-items.routes'));
router.use(require('./movements.routes'));

router.get('/alerts/summary', async (req, res) => {
  const { query } = require('../../config/database');
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM InventoryItem WHERE current_stock <= reorder_level AND current_stock > 0 AND is_active = 1) AS low_stock,
        (SELECT COUNT(*) FROM InventoryItem WHERE current_stock = 0 AND is_active = 1) AS out_of_stock,
        (SELECT COUNT(*) FROM InventoryItem WHERE hazardous_flag = 1 AND shelf_life_days IS NOT NULL
          AND EXISTS (SELECT 1 FROM InventoryMovement m WHERE m.item_id = InventoryItem.item_id AND m.movement_type = 'RECEIPT'
            AND DATEADD(day, InventoryItem.shelf_life_days, m.moved_at) <= DATEADD(day, 30, GETUTCDATE()))
          AND is_active = 1) AS expiring_chemicals,
        (SELECT COUNT(*) FROM InventoryItem WHERE is_active = 1) AS total_items
    `, []);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
