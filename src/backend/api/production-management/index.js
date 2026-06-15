'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/database');

router.use('/route-cards',           require('./route-cards.routes'));
router.use('/production-conditions', require('./production-conditions.routes'));
router.use('/test-pieces',           require('./test-pieces.routes'));
router.use('/shift-checklists',      require('./shift-checklists.routes'));

// GET /api/v1/mod10/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.RouteCard WHERE is_active=1 AND status='OPEN' AND required_by_date <= DATEADD(day,3,GETDATE())) AS due_soon,
        (SELECT COUNT(*) FROM dbo.RouteCard WHERE is_active=1 AND status IN ('OPEN','IN_PROGRESS') AND required_by_date < GETDATE()) AS overdue_jobs,
        (SELECT COUNT(*) FROM dbo.ShiftChecklist WHERE is_active=1 AND status='DRAFT' AND check_date < CAST(GETDATE() AS DATE)) AS incomplete_checklists,
        (SELECT COUNT(*) FROM dbo.TestPiece WHERE is_active=1 AND result='FAIL') AS failed_test_pieces
    `);
    const r = rows[0];
    res.json({
      due_soon:              r.due_soon,
      overdue_jobs:          r.overdue_jobs,
      incomplete_checklists: r.incomplete_checklists,
      failed_test_pieces:    r.failed_test_pieces,
      total: r.overdue_jobs + r.failed_test_pieces,
    });
  } catch (err) {
    console.error('[mod10/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-10 alerts.' });
  }
});

module.exports = router;
