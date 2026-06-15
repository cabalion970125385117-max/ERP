'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

router.get('/alerts/summary', async (req, res) => {
  try {
    const yr = new Date().getFullYear();
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM PayrollRun WHERE status = 'DRAFT' AND is_active = 1) AS pending_runs,
        (SELECT ISNULL(SUM(total_gross),0) FROM PayrollRun WHERE status IN ('APPROVED','DISBURSED')
          AND MONTH(pay_period_start) = MONTH(GETUTCDATE()) AND YEAR(pay_period_start) = YEAR(GETUTCDATE()) AND is_active = 1) AS current_month_gross,
        (SELECT COUNT(DISTINCT pl.staff_id) FROM PayrollLine pl JOIN PayrollRun pr ON pr.run_id = pl.run_id WHERE pr.status = 'DISBURSED' AND MONTH(pr.pay_period_start) = MONTH(GETUTCDATE()) AND pr.is_active = 1) AS staff_paid,
        (SELECT COUNT(*) FROM PayrollRun WHERE status = 'DISBURSED' AND YEAR(pay_period_start) = @yr AND is_active = 1) AS runs_disbursed_ytd
    `, [{ name: 'yr', type: sql.Int, value: yr }]);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/runs', async (req, res) => {
  try {
    const r = await query(`
      SELECT pr.*, u.full_name AS run_by_name, ua.full_name AS approved_by_name,
        (SELECT COUNT(*) FROM PayrollLine pl WHERE pl.run_id = pr.run_id) AS line_count
      FROM PayrollRun pr
      JOIN Users u ON u.user_id = pr.run_by
      LEFT JOIN Users ua ON ua.user_id = pr.approved_by
      WHERE pr.is_active = 1 ORDER BY pr.pay_period_start DESC
    `, []);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/runs/:id', async (req, res) => {
  try {
    const r = await query('SELECT pr.*, u.full_name AS run_by_name FROM PayrollRun pr JOIN Users u ON u.user_id = pr.run_by WHERE pr.run_id = @id AND pr.is_active = 1', [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    if (!r.recordset.length) return res.status(404).json({ error: 'Not found' });
    const run = r.recordset[0];
    const lines = await query(`
      SELECT pl.*, s.full_name AS staff_name, s.employee_id, s.job_title, s.department
      FROM PayrollLine pl JOIN StaffRecord s ON s.staff_id = pl.staff_id
      WHERE pl.run_id = @id ORDER BY s.full_name
    `, [{ name: 'id', type: sql.Int, value: +req.params.id }]);
    run.lines = lines.recordset;
    res.json(run);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/runs', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { pay_period_start, pay_period_end, lines, notes } = req.body;
    const r = await query(`
      INSERT INTO PayrollRun (pay_period_start, pay_period_end, run_by, total_gross, total_net, notes)
      OUTPUT INSERTED.run_id
      VALUES (@pps, @ppe, @uid, @tg, @tn, @notes)
    `, [
      { name: 'pps', type: sql.Date, value: pay_period_start },
      { name: 'ppe', type: sql.Date, value: pay_period_end },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'tg', type: sql.Decimal, value: (lines || []).reduce((s, l) => s + (l.gross_pay || 0), 0) },
      { name: 'tn', type: sql.Decimal, value: (lines || []).reduce((s, l) => s + (l.net_pay || 0), 0) },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
    ]);
    const run_id = r.recordset[0].run_id;
    for (const l of (lines || [])) {
      await query(`INSERT INTO PayrollLine (run_id, staff_id, basic_pay, allowances, overtime_pay, deductions, gross_pay, cpf_employee, cpf_employer, net_pay, days_worked, days_absent, notes)
        VALUES (@rid, @sid, @bp, @al, @op, @ded, @gp, @ce, @cer, @np, @dw, @da, @notes)`, [
        { name: 'rid', type: sql.Int, value: run_id },
        { name: 'sid', type: sql.Int, value: l.staff_id },
        { name: 'bp', type: sql.Decimal, value: l.basic_pay || 0 },
        { name: 'al', type: sql.Decimal, value: l.allowances || 0 },
        { name: 'op', type: sql.Decimal, value: l.overtime_pay || 0 },
        { name: 'ded', type: sql.Decimal, value: l.deductions || 0 },
        { name: 'gp', type: sql.Decimal, value: l.gross_pay || 0 },
        { name: 'ce', type: sql.Decimal, value: l.cpf_employee || 0 },
        { name: 'cer', type: sql.Decimal, value: l.cpf_employer || 0 },
        { name: 'np', type: sql.Decimal, value: l.net_pay || 0 },
        { name: 'dw', type: sql.Decimal, value: l.days_worked || null },
        { name: 'da', type: sql.Decimal, value: l.days_absent || null },
        { name: 'notes', type: sql.NVarChar, value: l.notes || null },
      ]);
    }
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'PayrollRun', recordId: run_id, moduleId: 'MOD-23', newValue: JSON.stringify({ pay_period_start, pay_period_end }) });
    res.status(201).json({ run_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/runs/:id/approve', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    await query(`UPDATE PayrollRun SET status = 'APPROVED', approved_by = @uid, approved_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE run_id = @id AND is_active = 1`, [
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'APPROVE', tableName: 'PayrollRun', recordId: +req.params.id, moduleId: 'MOD-23', newValue: 'APPROVED' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/runs/:id/disburse', requireMinRole('ADMIN'), async (req, res) => {
  try {
    await query(`UPDATE PayrollRun SET status = 'DISBURSED', disbursed_at = GETUTCDATE(), updated_at = GETUTCDATE() WHERE run_id = @id AND status = 'APPROVED' AND is_active = 1`, [
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'DISBURSE', tableName: 'PayrollRun', recordId: +req.params.id, moduleId: 'MOD-23', newValue: 'DISBURSED' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
