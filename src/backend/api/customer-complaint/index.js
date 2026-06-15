'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/database');

router.use('/complaints', require('./complaints.routes'));
router.use('/8d-reports',  require('./eight-d-reports.routes'));

// GET /api/v1/mod20/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.CustomerComplaint WHERE is_active=1 AND status NOT IN ('CLOSED','WITHDRAWN')) AS open_complaints,
        (SELECT COUNT(*) FROM dbo.CustomerComplaint WHERE is_active=1 AND severity='CRITICAL' AND status NOT IN ('CLOSED','WITHDRAWN')) AS critical_open,
        (SELECT COUNT(*) FROM dbo.CustomerComplaint WHERE is_active=1 AND status NOT IN ('CLOSED','WITHDRAWN') AND target_close_date < GETDATE()) AS overdue_complaints,
        (SELECT COUNT(*) FROM dbo.EightDReport WHERE is_active=1 AND overall_status IN ('DRAFT','IN_PROGRESS')) AS open_8d
    `);
    const r = rows[0];
    res.json({
      open_complaints:    r.open_complaints,
      critical_open:      r.critical_open,
      overdue_complaints: r.overdue_complaints,
      open_8d:            r.open_8d,
      total: r.open_complaints + r.critical_open,
    });
  } catch (err) {
    console.error('[mod20/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-20 alerts.' });
  }
});

module.exports = router;
