/**
 * ATCA-ERP v1.0 — MOD-01 QMS Core Router
 * Aggregates all MOD-01 sub-routes under /api/v1/mod01
 */

'use strict';

const express  = require('express');
const router   = express.Router();

router.use('/policy',     require('./quality-policy.routes'));
router.use('/objectives', require('./objectives.routes'));
router.use('/risks',      require('./risk-register.routes'));
router.use('/reviews',    require('./management-reviews.routes'));

// GET /api/v1/mod01/alerts/summary — compliance alert counts for MOD-01 dashboard badges
const { requireAuth } = require('../../middleware/auth');
const { query, sql }  = require('../../config/database');

router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AlertLog WHERE acknowledged = 0 AND module_id = 'MOD-01') AS mod01_alerts,
        (SELECT COUNT(*) FROM dbo.AlertLog WHERE acknowledged = 0) AS total_alerts,
        (SELECT COUNT(*) FROM dbo.MgmtReviewAction WHERE status IN ('OPEN','IN_PROGRESS') AND due_date < GETDATE()) AS overdue_actions,
        (SELECT COUNT(*) FROM dbo.RiskRegister WHERE is_active = 1 AND status = 'OPEN'
          AND (likelihood_pre * severity_pre) >= 15) AS high_risks_open
    `);
    const r = rows[0];
    res.json({
      total:          r.total_alerts,
      mod01:          r.mod01_alerts,
      overdue_actions: r.overdue_actions,
      high_risks:     r.high_risks_open,
    });
  } catch (err) {
    console.error('[mod01/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching alert summary.' });
  }
});

module.exports = router;
