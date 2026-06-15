'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/database');

router.use('/personnel',      require('./ndt-personnel.routes'));
router.use('/certifications', require('./ndt-certifications.routes'));

// GET /api/v1/mod04/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.NdtCertification
          WHERE is_active=1 AND status='ACTIVE'
            AND expiry_date BETWEEN GETDATE() AND DATEADD(DAY,90,GETDATE())) AS certs_expiring_90d,
        (SELECT COUNT(*) FROM dbo.NdtCertification
          WHERE is_active=1 AND (status='EXPIRED' OR (status='ACTIVE' AND expiry_date < GETDATE()))) AS certs_expired,
        (SELECT COUNT(*) FROM dbo.EyeExam ey
          WHERE is_active=1 AND result='PASS'
            AND ey.exam_id = (SELECT TOP 1 exam_id FROM dbo.EyeExam
                              WHERE personnel_id = ey.personnel_id AND is_active=1
                              ORDER BY exam_date DESC)
            AND expiry_date BETWEEN GETDATE() AND DATEADD(DAY,60,GETDATE())) AS eye_expiring_60d,
        (SELECT COUNT(*) FROM dbo.EyeExam ey
          WHERE is_active=1
            AND ey.exam_id = (SELECT TOP 1 exam_id FROM dbo.EyeExam
                              WHERE personnel_id = ey.personnel_id AND is_active=1
                              ORDER BY exam_date DESC)
            AND expiry_date < GETDATE()) AS eye_expired
    `);
    const r = rows[0];
    res.json({
      certs_expiring_90d: r.certs_expiring_90d,
      expired_certs:      r.certs_expired,
      eye_expiring_60d:   r.eye_expiring_60d,
      expired_eye_exams:  r.eye_expired,
      total: r.certs_expired + r.eye_expired,
    });
  } catch (err) {
    console.error('[mod04/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-04 alerts.' });
  }
});

module.exports = router;
