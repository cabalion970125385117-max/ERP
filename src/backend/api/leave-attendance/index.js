'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

router.get('/alerts/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await query(`
      SELECT
        (SELECT COUNT(*) FROM LeaveRequest WHERE status = 'PENDING' AND is_active = 1) AS pending_requests,
        (SELECT COUNT(*) FROM LeaveRequest WHERE status = 'APPROVED' AND start_date <= @today AND end_date >= @today AND is_active = 1) AS on_leave_today,
        (SELECT COUNT(*) FROM AttendanceRecord WHERE date = @today AND status = 'ABSENT' AND is_active = 1) AS absent_today,
        (SELECT COUNT(DISTINCT lr.staff_id) FROM LeaveRequest lr WHERE lr.status = 'APPROVED' AND lr.is_active = 1
          GROUP BY lr.staff_id, lr.leave_type_id
          HAVING SUM(lr.days_taken) >= (SELECT days_per_year * 0.8 FROM LeaveType WHERE type_id = lr.leave_type_id)) AS low_balance_staff
    `, [{ name: 'today', type: sql.Date, value: today }]);
    res.json(r.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leave-requests', async (req, res) => {
  try {
    const { status, staff_id } = req.query;
    let where = 'WHERE lr.is_active = 1';
    const params = [];
    if (status) { where += ' AND lr.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    if (staff_id) { where += ' AND lr.staff_id = @sid'; params.push({ name: 'sid', type: sql.Int, value: +staff_id }); }
    const r = await query(`
      SELECT lr.*, s.full_name AS staff_name, lt.name AS leave_type_name, u.full_name AS approved_by_name
      FROM LeaveRequest lr
      JOIN StaffRecord s ON s.staff_id = lr.staff_id
      JOIN LeaveType lt ON lt.type_id = lr.leave_type_id
      LEFT JOIN Users u ON u.user_id = lr.approved_by
      ${where} ORDER BY lr.start_date DESC
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leave-requests', async (req, res) => {
  try {
    const { staff_id, leave_type_id, start_date, end_date, days_taken, reason } = req.body;
    const r = await query(`
      INSERT INTO LeaveRequest (staff_id, leave_type_id, start_date, end_date, days_taken, reason, created_by)
      OUTPUT INSERTED.request_id
      VALUES (@sid, @ltid, @sd, @ed, @dt, @reason, @uid)
    `, [
      { name: 'sid', type: sql.Int, value: staff_id },
      { name: 'ltid', type: sql.Int, value: leave_type_id },
      { name: 'sd', type: sql.Date, value: start_date },
      { name: 'ed', type: sql.Date, value: end_date },
      { name: 'dt', type: sql.Decimal, value: days_taken },
      { name: 'reason', type: sql.NVarChar, value: reason || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'LeaveRequest', recordId: r.recordset[0].request_id, moduleId: 'MOD-22', newValue: JSON.stringify({ staff_id, start_date, end_date }) });
    res.status(201).json({ request_id: r.recordset[0].request_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/leave-requests/:id/approve', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await query(`UPDATE LeaveRequest SET status = @status, approved_by = @uid, approved_at = GETUTCDATE(), notes = ISNULL(@notes, notes), updated_at = GETUTCDATE() WHERE request_id = @id AND is_active = 1`, [
      { name: 'status', type: sql.NVarChar, value: status },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'notes', type: sql.NVarChar, value: notes || null },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: status, tableName: 'LeaveRequest', recordId: +req.params.id, moduleId: 'MOD-22', newValue: status });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/leave-types', async (req, res) => {
  try {
    const r = await query('SELECT * FROM LeaveType WHERE is_active = 1 ORDER BY name', []);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
