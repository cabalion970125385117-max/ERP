'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);
router.use(require('./ar.routes'));
router.use(require('./ap.routes'));
router.use(require('./journal.routes'));

router.get('/alerts/summary', async (req, res) => {
  try {
    const r = await query(`
      SELECT
        (SELECT ISNULL(SUM(total_amount),0) FROM ArInvoice WHERE status IN ('SENT','OVERDUE') AND is_active = 1) AS ar_outstanding,
        (SELECT COUNT(*) FROM ArInvoice WHERE status = 'OVERDUE' AND is_active = 1) AS overdue_invoices,
        (SELECT ISNULL(SUM(total_amount),0) FROM ApInvoice WHERE status IN ('PENDING','APPROVED','OVERDUE') AND is_active = 1) AS ap_outstanding,
        (SELECT COUNT(*) FROM PayrollRun WHERE status = 'DRAFT' AND is_active = 1) AS pending_payroll_runs
    `, []);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/accounts', async (req, res) => {
  try {
    const r = await query('SELECT * FROM Account WHERE is_active = 1 ORDER BY account_code', []);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/budget', async (req, res) => {
  try {
    const yr = req.query.year || new Date().getFullYear();
    const r = await query(`
      SELECT b.*, a.name AS account_name, a.type AS account_type
      FROM Budget b JOIN Account a ON a.account_id = b.account_id
      WHERE b.budget_year = @yr AND b.is_active = 1 ORDER BY a.account_code
    `, [{ name: 'yr', type: sql.Int, value: +yr }]);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/fixed-assets', async (req, res) => {
  try {
    const r = await query(`SELECT fa.*, a.name AS account_name FROM FixedAsset fa LEFT JOIN Account a ON a.account_id = fa.account_id WHERE fa.is_active = 1 ORDER BY fa.asset_code`, []);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
