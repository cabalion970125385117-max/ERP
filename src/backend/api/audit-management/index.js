'use strict';
const router = require('express').Router();
const { requireAuth, requireMinRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use('/audit-plans',  require('./audit-plans.routes'));
router.use('/findings',     require('./findings.routes'));

// GET /api/v1/mod08/alerts/summary
router.get('/alerts/summary', async (req, res) => {
  const { query, sql } = require('../../config/database');
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AuditPlan  WHERE status IN ('PLANNED','IN_PROGRESS') AND is_active=1) AS planned_audits,
        (SELECT COUNT(*) FROM dbo.AuditFinding WHERE status = 'OPEN' AND is_active=1)                  AS open_findings,
        (SELECT COUNT(*) FROM dbo.AuditFinding WHERE status = 'OPEN' AND due_date < CAST(GETUTCDATE() AS DATE) AND is_active=1) AS overdue_findings,
        (SELECT COUNT(*) FROM dbo.AuditFinding WHERE status IN ('OPEN','RESPONSE_SUBMITTED') AND is_active=1) AS pending_verification
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[mod08/alerts]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
