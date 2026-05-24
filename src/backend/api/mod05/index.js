'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/db');

router.use('/equipment',     require('./equipment.routes'));
router.use('/calibrations',  require('./calibrations.routes'));

// GET /api/v1/mod05/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Equipment e
          WHERE e.is_active=1 AND e.cal_required=1
            AND (SELECT TOP 1 cal_due_date FROM dbo.CalibrationRecord
                 WHERE equipment_id = e.equipment_id ORDER BY cal_date DESC)
                 < GETDATE()) AS cal_overdue,
        (SELECT COUNT(*) FROM dbo.Equipment e
          WHERE e.is_active=1 AND e.cal_required=1
            AND (SELECT TOP 1 cal_due_date FROM dbo.CalibrationRecord
                 WHERE equipment_id = e.equipment_id ORDER BY cal_date DESC)
                 BETWEEN GETDATE() AND DATEADD(DAY,30,GETDATE())) AS cal_due_30d,
        (SELECT COUNT(*) FROM dbo.Equipment e
          WHERE e.is_active=1 AND e.cal_required=1
            AND NOT EXISTS (SELECT 1 FROM dbo.CalibrationRecord
                            WHERE equipment_id = e.equipment_id)) AS never_calibrated
    `);
    const r = rows[0];
    res.json({
      cal_overdue:      r.cal_overdue,
      cal_due_30d:      r.cal_due_30d,
      never_calibrated: r.never_calibrated,
      total: r.cal_overdue + r.never_calibrated,
    });
  } catch (err) {
    console.error('[mod05/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-05 alerts.' });
  }
});

module.exports = router;
