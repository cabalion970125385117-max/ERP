'use strict';

const express         = require('express');
const router          = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { query }       = require('../../config/db');

router.use('/ncr',  require('./ncr.routes'));
router.use('/capa', require('./capa.routes'));

// GET /api/v1/mod07/alerts/summary
router.get('/alerts/summary', requireAuth, async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.NCR  WHERE is_active=1 AND status NOT IN ('CLOSED','CANCELLED')) AS open_ncr,
        (SELECT COUNT(*) FROM dbo.CAPA WHERE is_active=1 AND status NOT IN ('CLOSED','CANCELLED')
            AND target_completion_date < GETDATE()) AS overdue_capa,
        (SELECT COUNT(*) FROM dbo.CAPA WHERE is_active=1 AND status='PENDING_VERIFICATION') AS pending_verify,
        (SELECT COUNT(*) FROM dbo.NCR  WHERE is_active=1 AND status='OPEN') AS ncr_open_only
    `);
    const r = rows[0];
    res.json({
      open_ncr:       r.open_ncr,
      overdue_capa:   r.overdue_capa,
      pending_verify: r.pending_verify,
      ncr_open_only:  r.ncr_open_only,
      total: r.open_ncr + r.overdue_capa,
    });
  } catch (err) {
    console.error('[mod07/alerts]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-07 alerts.' });
  }
});

module.exports = router;
