'use strict';
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');

router.use(requireAuth);
router.use(require('./staff.routes'));
router.use(require('./org.routes'));

router.get('/alerts/summary', async (req, res) => {
  const { query } = require('../../config/database');
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM StaffRecord WHERE status = 'ACTIVE' AND is_active = 1) AS total_staff,
        (SELECT COUNT(*) FROM StaffRecord WHERE employment_date >= DATEADD(month,-1,GETUTCDATE()) AND is_active = 1) AS new_this_month,
        (SELECT COUNT(*) FROM StaffRecord WHERE onboarding_complete = 0 AND status = 'ACTIVE' AND is_active = 1) AS pending_onboarding,
        (SELECT COUNT(*) FROM StaffRecord WHERE conflict_of_interest_declared = 0 AND status = 'ACTIVE' AND is_active = 1) AS conflict_declarations_due
    `, []);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
