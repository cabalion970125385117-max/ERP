'use strict';
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);
router.use(require('./suppliers.routes'));
router.use(require('./requisitions.routes'));
router.use(require('./purchase-orders.routes'));

router.get('/alerts/summary', async (req, res) => {
  const { query, sql } = require('../../config/database');
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM Supplier WHERE approval_status = 'APPROVED' AND is_active = 1) AS approved_suppliers,
        (SELECT COUNT(*) FROM PurchaseRequisition WHERE status IN ('DRAFT','APPROVED') AND is_active = 1) AS pending_pr,
        (SELECT COUNT(*) FROM PurchaseOrder WHERE status IN ('DRAFT','ISSUED','ACKNOWLEDGED') AND is_active = 1) AS open_po,
        (SELECT COUNT(*) FROM Supplier WHERE accreditation_expiry <= DATEADD(day,90,CAST(GETUTCDATE() AS DATE)) AND accreditation_expiry IS NOT NULL AND is_active = 1) AS expiring_accreditations
    `, []);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
