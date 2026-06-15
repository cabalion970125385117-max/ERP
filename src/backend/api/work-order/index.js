'use strict';
const router = require('express').Router();
const { requireAuth, requireMinRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use('/work-orders', require('./work-orders.routes'));

// GET /api/v1/mod13/alerts/summary
router.get('/alerts/summary', async (req, res) => {
  const { query, sql } = require('../../config/database');
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status IN ('ISSUED','IN_PROGRESS') AND is_active=1) AS active_jobs,
        (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status='IN_PROGRESS' AND planned_end < CAST(GETUTCDATE() AS DATE) AND is_active=1) AS overdue_jobs,
        (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status='PENDING_QA' AND is_active=1) AS pending_qa,
        (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status='COMPLETE' AND coc_issued=0 AND is_active=1) AS coc_pending
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[mod13/alerts]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
