'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status = '', priority = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT rc.route_id, rc.route_ref, rc.part_number, rc.part_description,
             rc.quantity, rc.job_type, rc.priority, rc.status, rc.required_by_date,
             c.company_name AS customer_name,
             u.full_name AS created_by_name,
             (SELECT COUNT(*) FROM dbo.RouteCardOperation o WHERE o.route_id=rc.route_id) AS total_ops,
             (SELECT COUNT(*) FROM dbo.RouteCardOperation o WHERE o.route_id=rc.route_id AND o.status='COMPLETE') AS done_ops
      FROM dbo.RouteCard rc
      LEFT JOIN dbo.Customer c ON c.customer_id=rc.customer_id
      JOIN dbo.Users u ON u.user_id=rc.created_by
      WHERE rc.is_active=1
        AND (@status='' OR rc.status=@status)
        AND (@priority='' OR rc.priority=@priority)
      ORDER BY rc.required_by_date ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status',   type: sql.NVarChar(20), value: status },
      { name: 'priority', type: sql.NVarChar(10), value: priority },
      { name: 'offset',   type: sql.Int, value: offset },
      { name: 'limit',    type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.RouteCard WHERE is_active=1 AND (@status='' OR status=@status) AND (@priority='' OR priority=@priority)`, [
      { name: 'status',   type: sql.NVarChar(20), value: status },
      { name: 'priority', type: sql.NVarChar(10), value: priority },
    ]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    console.error('[mod10/route-cards GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await query(`
      SELECT rc.*, c.company_name AS customer_name, u.full_name AS created_by_name
      FROM dbo.RouteCard rc
      LEFT JOIN dbo.Customer c ON c.customer_id=rc.customer_id
      JOIN dbo.Users u ON u.user_id=rc.created_by
      WHERE rc.route_id=@id AND rc.is_active=1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Route card not found.' });
    const ops = await query(`
      SELECT o.*, p.full_name AS assigned_to_name FROM dbo.RouteCardOperation o
      LEFT JOIN dbo.Personnel p ON p.personnel_id=o.assigned_to
      WHERE o.route_id=@id ORDER BY o.op_seq
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ ...rows[0], operations: ops });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { customer_id, po_number, part_number, part_description, quantity,
            material_spec, job_type, priority, required_by_date, operations = [] } = req.body;
    if (!part_number) return res.status(400).json({ message: 'part_number required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod10Sequence SET last_num=last_num+1 WHERE seq_key='ROUTE_CARD';
      SELECT last_num FROM dbo.Mod10Sequence WHERE seq_key='ROUTE_CARD';
    `);
    const route_ref = `RC-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.RouteCard (route_ref,customer_id,po_number,part_number,part_description,
        quantity,material_spec,job_type,priority,required_by_date,created_by)
      OUTPUT INSERTED.route_id
      VALUES (@ref,@cid,@po,@pn,@pd,@qty,@ms,@jt,@pri,@rbd,@uid)
    `, [
      { name: 'ref', type: sql.NVarChar(20),  value: route_ref },
      { name: 'cid', type: sql.Int,           value: customer_id || null },
      { name: 'po',  type: sql.NVarChar(100), value: po_number || null },
      { name: 'pn',  type: sql.NVarChar(100), value: part_number },
      { name: 'pd',  type: sql.NVarChar(300), value: part_description || null },
      { name: 'qty', type: sql.Int,           value: quantity || 1 },
      { name: 'ms',  type: sql.NVarChar(100), value: material_spec || null },
      { name: 'jt',  type: sql.NVarChar(30),  value: job_type || 'FPI' },
      { name: 'pri', type: sql.NVarChar(10),  value: priority || 'NORMAL' },
      { name: 'rbd', type: sql.Date,          value: required_by_date || null },
      { name: 'uid', type: sql.Int,           value: req.session.userId },
    ]);
    const route_id = ins[0].route_id;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      await query(`
        INSERT INTO dbo.RouteCardOperation (route_id,op_seq,op_name,work_center,process_spec,std_time_min,assigned_to)
        VALUES (@rid,@seq,@name,@wc,@spec,@time,@pid)
      `, [
        { name: 'rid',  type: sql.Int,           value: route_id },
        { name: 'seq',  type: sql.Int,           value: i + 1 },
        { name: 'name', type: sql.NVarChar(100), value: op.op_name },
        { name: 'wc',   type: sql.NVarChar(50),  value: op.work_center || null },
        { name: 'spec', type: sql.NVarChar(100), value: op.process_spec || null },
        { name: 'time', type: sql.Int,           value: op.std_time_min || null },
        { name: 'pid',  type: sql.Int,           value: op.assigned_to || null },
      ]);
    }

    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'RouteCard', recordId: route_id, moduleId: 'MOD-10',
      newValue: JSON.stringify({ route_ref, part_number }) });
    res.status(201).json({ route_id, route_ref, message: 'Route card created.' });
  } catch (err) {
    console.error('[mod10/route-cards POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/status', requireAuth, requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ['OPEN','IN_PROGRESS','PENDING_REVIEW','COMPLETE','CANCELLED','ON_HOLD'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    await query(`UPDATE dbo.RouteCard SET status=@s, updated_at=GETUTCDATE() WHERE route_id=@id AND is_active=1`,
      [{ name: 's', type: sql.NVarChar(20), value: status }, { name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `RC_STATUS_${status}`, tableName: 'RouteCard', recordId: id, moduleId: 'MOD-10' });
    res.json({ message: `Route card ${status}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

// Sign off an operation
router.patch('/:id/ops/:seq/complete', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const route_id = parseInt(req.params.id);
    const seq = parseInt(req.params.seq);
    const { result, op_notes } = req.body;
    await query(`
      UPDATE dbo.RouteCardOperation
      SET status='COMPLETE', result=@res, completed_at=GETUTCDATE(), op_notes=@notes
      WHERE route_id=@rid AND op_seq=@seq
    `, [
      { name: 'res',   type: sql.NVarChar(10), value: result || 'PASS' },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: op_notes || null },
      { name: 'rid',   type: sql.Int, value: route_id },
      { name: 'seq',   type: sql.Int, value: seq },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `OP_COMPLETE_SEQ${seq}`, tableName: 'RouteCardOperation', recordId: route_id, moduleId: 'MOD-10' });
    res.json({ message: `Operation ${seq} completed.` });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
