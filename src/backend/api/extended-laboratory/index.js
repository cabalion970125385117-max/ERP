'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/database');

router.use('/analysis-schedules', require('./analysis-schedules.routes'));
router.use('/analysis-results',   require('./analysis-results.routes'));
router.use('/chemical-inventory', require('./chemical-inventory.routes'));
router.use('/lab-validations',    require('./lab-validations.routes'));
router.use('/external-labs',      require('./external-labs.routes'));
router.use('/external-lab-jobs',  require('./external-lab-jobs.routes'));

// GET /api/v1/mod19/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AnalysisSchedule WHERE is_active=1 AND next_due_date < GETDATE()) AS overdue_analyses,
        (SELECT COUNT(*) FROM dbo.AnalysisSchedule WHERE is_active=1 AND next_due_date BETWEEN GETDATE() AND DATEADD(day,7,GETDATE())) AS due_soon,
        (SELECT COUNT(*) FROM dbo.ChemicalInventory WHERE is_active=1 AND qty_on_hand < qty_minimum) AS low_stock,
        (SELECT COUNT(*) FROM dbo.ExternalLab WHERE is_active=1 AND approved_status='APPROVED' AND accreditation_expiry < DATEADD(day,90,GETDATE())) AS lab_accred_expiring,
        (SELECT COUNT(*) FROM dbo.LabValidationRecord WHERE is_active=1 AND next_review_date < GETDATE()) AS validation_overdue
    `);
    const r = rows[0];
    res.json({
      overdue_analyses:    r.overdue_analyses,
      due_soon:            r.due_soon,
      low_stock:           r.low_stock,
      lab_accred_expiring: r.lab_accred_expiring,
      validation_overdue:  r.validation_overdue,
      total: r.overdue_analyses + r.low_stock + r.validation_overdue,
    });
  } catch (err) {
    console.error('[mod19/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-19 alerts.' });
  }
});

module.exports = router;
