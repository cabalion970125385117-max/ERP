'use strict';
const router = require('express').Router();
const { requireAuth, requireMinRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use('/cocs', require('./coc.routes'));

// GET /api/v1/mod24/alerts/summary
router.get('/alerts/summary', async (req, res) => {
  const { query } = require('../../config/database');
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.CertificateOfConformance WHERE status='DRAFT' AND is_active=1)   AS draft_cocs,
        (SELECT COUNT(*) FROM dbo.CertificateOfConformance WHERE status='ISSUED' AND is_active=1)  AS issued_cocs,
        (SELECT COUNT(*) FROM dbo.WorkOrder WHERE status='COMPLETE' AND coc_issued=0 AND is_active=1) AS pending_coc,
        (SELECT COUNT(*) FROM dbo.CertificateOfConformance WHERE status='VOID' AND is_active=1)    AS voided_cocs
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[mod24/alerts]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
