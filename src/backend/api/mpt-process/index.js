'use strict';
const router = require('express').Router();
const { requireAuth, requireMinRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use('/jobs',    require('./mpt-jobs.routes'));
router.use('/results', require('./mpt-results.routes'));

// GET /api/v1/mod17/alerts/summary
router.get('/alerts/summary', async (req, res) => {
  const { query } = require('../../config/database');
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.MptJob WHERE status IN ('RECEIVED','IN_PROGRESS') AND is_active=1) AS active_jobs,
        (SELECT COUNT(*) FROM dbo.MptJob WHERE status='PENDING_REVIEW' AND is_active=1)              AS pending_review,
        (SELECT COUNT(*) FROM dbo.MptJob WHERE status='IN_PROGRESS' AND planned_date < CAST(GETUTCDATE() AS DATE) AND is_active=1) AS overdue,
        (SELECT COUNT(*) FROM dbo.MptJob WHERE status='REJECTED' AND is_active=1)                   AS rejected_this_month
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[mod17/alerts]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
