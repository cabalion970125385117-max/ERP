/**
 * ATCA-ERP v1.0 — MOD-02 Document & Record Control Router
 * AS9100D §7.5 Documented Information
 * Mounts under /api/v1/mod02
 */

'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/db');

router.use('/documents',  require('./documents.routes'));
router.use('/retention',  require('./retention.routes'));

// GET /api/v1/mod02/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.vw_DocumentCurrent
          WHERE days_until_review BETWEEN 0 AND 30) AS review_due_soon,
        (SELECT COUNT(*) FROM dbo.vw_DocumentCurrent
          WHERE days_until_review < 0)              AS review_overdue,
        (SELECT COUNT(*) FROM dbo.DocumentRevision
          WHERE status IN ('DRAFT','REVIEW'))        AS pending_approval,
        (SELECT COUNT(*) FROM dbo.vw_DocumentCurrent
          WHERE revision_id IS NULL)                AS no_approved_rev
    `);
    const r = rows[0];
    res.json({
      review_due_soon:  r.review_due_soon,
      review_overdue:   r.review_overdue,
      pending_approval: r.pending_approval,
      no_approved_rev:  r.no_approved_rev,
      total: r.review_overdue + r.pending_approval,
    });
  } catch (err) {
    console.error('[mod02/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-02 alert summary.' });
  }
});

module.exports = router;
