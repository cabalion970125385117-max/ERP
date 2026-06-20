/**
 * ATCA-ERP v1.0 — MOD-30 Pyrometry & Heat-Treat
 * NADCAP AC7102 / AMS 2750H | AS9100D §7.1.5
 *
 * GET  /mod30/alerts/summary
 * GET  /mod30/ovens
 * GET  /mod30/ovens/:id            (+ pyrometry tests + thermocouples)
 * POST /mod30/pyrometry-tests      (ENGINEER+)  — record TUS/SAT/SAT
 * GET  /mod30/thermocouples
 * POST /mod30/thermocouples        (ENGINEER+)
 * GET  /mod30/routing?temp=&aerospace=   — eligible ovens for a process temperature
 */
'use strict';

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const [r] = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.HeatTreatOven WHERE is_active=1) AS total_ovens,
        (SELECT COUNT(*) FROM dbo.vw_OvenStatus WHERE rag_status='RED')   AS overdue_pyrometry,
        (SELECT COUNT(*) FROM dbo.vw_OvenStatus WHERE rag_status='AMBER') AS due_soon,
        (SELECT COUNT(*) FROM dbo.Thermocouple WHERE is_active=1 AND status='IN_USE'
            AND expiry_date IS NOT NULL AND expiry_date <= DATEADD(day,30,CAST(GETUTCDATE() AS DATE))) AS tc_expiring,
        (SELECT COUNT(*) FROM dbo.HeatTreatOven WHERE is_active=1 AND aerospace_only=1) AS aerospace_ovens
    `);
    res.json({ ...r, total: r.overdue_pyrometry + r.due_soon });
  } catch (err) {
    console.error('[mod30/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching pyrometry summary.' });
  }
});

/* ── GET /ovens ──────────────────────────────────────────────── */
router.get('/ovens', async (req, res) => {
  try {
    const rows = await query(`
      SELECT oven_id, oven_code, oven_name, function_type, standard_ref, furnace_class, instrument_type,
             temp_min_c, temp_max_c, aerospace_only, area, max_len_cm, max_wid_cm, max_dep_cm,
             tus_interval_days, sat_interval_days, last_tus, last_sat, rag_status
      FROM dbo.vw_OvenStatus ORDER BY oven_code
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod30/ovens]', err.message);
    res.status(500).json({ message: 'Error fetching ovens.' });
  }
});

/* ── GET /ovens/:id ──────────────────────────────────────────── */
router.get('/ovens/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [oven] = await query(`SELECT * FROM dbo.vw_OvenStatus WHERE oven_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    if (!oven) return res.status(404).json({ message: 'Oven not found.' });
    const tests = await query(`SELECT * FROM dbo.PyrometryTest WHERE oven_id=@id ORDER BY test_date DESC`,
      [{ name: 'id', type: sql.Int, value: id }]);
    const tcs = await query(`SELECT * FROM dbo.Thermocouple WHERE oven_id=@id AND is_active=1 ORDER BY tc_code`,
      [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ ...oven, tests, thermocouples: tcs });
  } catch (err) {
    console.error('[mod30/ovens/:id]', err.message);
    res.status(500).json({ message: 'Error fetching oven.' });
  }
});

/* ── POST /pyrometry-tests ───────────────────────────────────── */
router.post('/pyrometry-tests', requireMinRole('ENGINEER'), async (req, res) => {
  const b = req.body || {};
  if (!b.oven_id || !b.test_type || !b.test_date || !b.result) {
    return res.status(400).json({ message: 'oven_id, test_type, test_date and result are required.' });
  }
  try {
    await query(`UPDATE dbo.Mod30Sequence SET last_num=last_num+1 WHERE seq_key='PYR'`);
    const [seq] = await query(`SELECT last_num FROM dbo.Mod30Sequence WHERE seq_key='PYR'`);
    const ref = `PYR-${new Date().getFullYear()}-${String(seq.last_num).padStart(4,'0')}`;
    // compute next_due from the oven interval for this test type
    const [oven] = await query(`SELECT tus_interval_days, sat_interval_days FROM dbo.HeatTreatOven WHERE oven_id=@id`,
      [{ name: 'id', type: sql.Int, value: b.oven_id }]);
    const interval = b.test_type === 'TUS' ? (oven ? oven.tus_interval_days : 90) : (oven ? oven.sat_interval_days : 30);
    await query(`
      INSERT INTO dbo.PyrometryTest (test_ref, oven_id, test_type, test_date, set_point_c, max_dev_c, tolerance_c, result, performed_by, cert_ref, next_due, notes)
      VALUES (@ref,@oid,@type,@date,@sp,@dev,@tol,@result,@by,@cert,DATEADD(day,@interval,@date),@notes)
    `, [
      { name: 'ref', type: sql.NVarChar(30), value: ref },
      { name: 'oid', type: sql.Int, value: b.oven_id },
      { name: 'type', type: sql.NVarChar(20), value: b.test_type },
      { name: 'date', type: sql.Date, value: b.test_date },
      { name: 'sp', type: sql.Decimal(6,1), value: b.set_point_c ?? null },
      { name: 'dev', type: sql.Decimal(5,2), value: b.max_dev_c ?? null },
      { name: 'tol', type: sql.Decimal(5,2), value: b.tolerance_c ?? null },
      { name: 'result', type: sql.NVarChar(10), value: b.result },
      { name: 'by', type: sql.NVarChar(120), value: b.performed_by || null },
      { name: 'cert', type: sql.NVarChar(120), value: b.cert_ref || null },
      { name: 'interval', type: sql.Int, value: interval },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: b.notes || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'PyrometryTest', recordId: ref, moduleId: 'MOD-30', newValue: `${b.test_type}:${b.result}` });
    res.status(201).json({ test_ref: ref });
  } catch (err) {
    console.error('[mod30/pyrometry-tests POST]', err.message);
    res.status(500).json({ message: 'Error recording pyrometry test.' });
  }
});

/* ── GET /thermocouples ──────────────────────────────────────── */
router.get('/thermocouples', async (req, res) => {
  try {
    const rows = await query(`
      SELECT t.*, o.oven_code,
        CASE WHEN t.expiry_date < CAST(GETUTCDATE() AS DATE) THEN 'EXPIRED'
             WHEN t.expiry_date <= DATEADD(day,30,CAST(GETUTCDATE() AS DATE)) THEN 'EXPIRING'
             ELSE 'OK' END AS expiry_status
      FROM dbo.Thermocouple t
      LEFT JOIN dbo.HeatTreatOven o ON o.oven_id=t.oven_id
      WHERE t.is_active=1 ORDER BY t.tc_code
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod30/thermocouples]', err.message);
    res.status(500).json({ message: 'Error fetching thermocouples.' });
  }
});

/* ── POST /thermocouples ─────────────────────────────────────── */
router.post('/thermocouples', requireMinRole('ENGINEER'), async (req, res) => {
  const b = req.body || {};
  if (!b.tc_code) return res.status(400).json({ message: 'tc_code is required.' });
  try {
    await query(`
      INSERT INTO dbo.Thermocouple (tc_code, oven_id, tc_type, tc_class, install_date, expiry_date, uses_count, uses_max, cal_cert_ref)
      VALUES (@code,@oid,@type,@class,@inst,@exp,@uc,@um,@cert)
    `, [
      { name: 'code', type: sql.NVarChar(30), value: b.tc_code },
      { name: 'oid', type: sql.Int, value: b.oven_id || null },
      { name: 'type', type: sql.NVarChar(10), value: b.tc_type || null },
      { name: 'class', type: sql.NVarChar(20), value: b.tc_class || null },
      { name: 'inst', type: sql.Date, value: b.install_date || null },
      { name: 'exp', type: sql.Date, value: b.expiry_date || null },
      { name: 'uc', type: sql.Int, value: b.uses_count ?? null },
      { name: 'um', type: sql.Int, value: b.uses_max ?? null },
      { name: 'cert', type: sql.NVarChar(120), value: b.cal_cert_ref || null },
    ]);
    res.status(201).json({ message: 'Thermocouple added.' });
  } catch (err) {
    if ((err.message || '').includes('UNIQUE')) return res.status(409).json({ message: 'TC code already exists.' });
    console.error('[mod30/thermocouples POST]', err.message);
    res.status(500).json({ message: 'Error adding thermocouple.' });
  }
});

/* ── GET /routing?temp=&aerospace= ───────────────────────────── */
/* Aerospace-only routing gate: which qualified ovens can run a process at temp. */
router.get('/routing', async (req, res) => {
  try {
    const temp = req.query.temp != null ? parseFloat(req.query.temp) : null;
    const aerospace = req.query.aerospace === '1' || req.query.aerospace === 'true';
    const rows = await query(`
      SELECT oven_id, oven_code, oven_name, temp_min_c, temp_max_c, aerospace_only, rag_status
      FROM dbo.vw_OvenStatus
      WHERE (@temp IS NULL OR (@temp >= temp_min_c AND @temp <= temp_max_c))
        AND (@aero = 0 OR aerospace_only = 1)
      ORDER BY aerospace_only DESC, oven_code
    `, [
      { name: 'temp', type: sql.Decimal(6,1), value: temp },
      { name: 'aero', type: sql.Bit, value: aerospace ? 1 : 0 },
    ]);
    res.json({ items: rows, eligible: rows.filter(r => r.rag_status !== 'RED').length, total: rows.length });
  } catch (err) {
    console.error('[mod30/routing]', err.message);
    res.status(500).json({ message: 'Error computing routing.' });
  }
});

module.exports = router;
