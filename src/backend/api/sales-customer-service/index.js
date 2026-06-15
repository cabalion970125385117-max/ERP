'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/database');

router.use('/customers',       require('./customers.routes'));
router.use('/parts',           require('./parts.routes'));
router.use('/quotations',      require('./quotations.routes'));
router.use('/contract-reviews',require('./contract-reviews.routes'));
router.use('/grn',             require('./grn.routes'));
router.use('/delivery-orders', require('./delivery-orders.routes'));

// GET /api/v1/mod09/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.ContractReview WHERE is_active=1 AND status='PENDING') AS pending_reviews,
        (SELECT COUNT(*) FROM dbo.GoodsReceivingNote WHERE is_active=1 AND status='PENDING' AND inspection_reqd=1 AND inspection_done=0) AS pending_grn_inspection,
        (SELECT COUNT(*) FROM dbo.DeliveryOrder WHERE is_active=1 AND status='READY') AS ready_to_ship,
        (SELECT COUNT(*) FROM dbo.Quotation WHERE is_active=1 AND status='SENT' AND valid_until < GETDATE()) AS expired_quotations
    `);
    const r = rows[0];
    res.json({
      pending_reviews:       r.pending_reviews,
      pending_grn_inspection:r.pending_grn_inspection,
      ready_to_ship:         r.ready_to_ship,
      expired_quotations:    r.expired_quotations,
      total: r.pending_reviews + r.pending_grn_inspection,
    });
  } catch (err) {
    console.error('[mod09/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-09 alerts.' });
  }
});

module.exports = router;
