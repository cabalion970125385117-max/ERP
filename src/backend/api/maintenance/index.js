'use strict';
const router = require('express').Router();
const { requireAuth, requireMinRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(require('./assets.routes'));
router.use(require('./schedules.routes'));
router.use(require('./permits.routes'));

router.get('/alerts/summary', async (req, res) => {
  const { query, sql } = require('../../config/database');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM PmSchedule WHERE next_due_date <= DATEADD(day,7,CAST(GETUTCDATE() AS DATE)) AND is_active=1) AS due_this_week,
        (SELECT COUNT(*) FROM PmSchedule WHERE next_due_date < CAST(GETUTCDATE() AS DATE) AND is_active=1) AS overdue_pm,
        (SELECT COUNT(*) FROM WorkPermit WHERE status IN ('OPEN','ACTIVE') AND is_active=1) AS open_permits,
        (SELECT COUNT(*) FROM MaintenanceRecord WHERE outcome='FAIL' AND end_datetime IS NULL AND is_active=1) AS active_breakdowns
    `, []);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
