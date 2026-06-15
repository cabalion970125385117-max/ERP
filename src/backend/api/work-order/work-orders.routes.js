'use strict';
const router  = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// GET /api/v1/mod13/work-orders
router.get('/', async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE wo.is_active = 1';
    const params = [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ];
    if (status)   { where += ' AND wo.status = @status'; params.push({ name: 'status', type: sql.NVarChar(20), value: status }); }
    if (priority) { where += ' AND wo.priority = @prio';  params.push({ name: 'prio', type: sql.NVarChar(10), value: priority }); }

    const rows = await query(`
      SELECT wo.*, p.full_name AS supervisor_name,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id) AS total_steps,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id AND s.status = 'COMPLETE') AS done_steps
      FROM dbo.WorkOrder wo
      LEFT JOIN dbo.Personnel p ON p.personnel_id = wo.assigned_supervisor_id
      ${where}
      ORDER BY
        CASE wo.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END,
        wo.planned_end ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[mod13/work-orders GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// GET /api/v1/mod13/work-orders/:id
router.get('/:id', async (req, res) => {
  try {
    const wos = await query(`
      SELECT wo.*, p.full_name AS supervisor_name
      FROM dbo.WorkOrder wo
      LEFT JOIN dbo.Personnel p ON p.personnel_id = wo.assigned_supervisor_id
      WHERE wo.work_order_id = @id AND wo.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!wos.length) return res.status(404).json({ message: 'Work order not found.' });

    const steps = await query(`
      SELECT s.*, p.full_name AS assigned_name, pb.full_name AS completed_name
      FROM dbo.WoStep s
      LEFT JOIN dbo.Personnel p  ON p.personnel_id = s.assigned_to_id
      LEFT JOIN dbo.Personnel pb ON pb.personnel_id = s.completed_by_id
      WHERE s.work_order_id = @id
      ORDER BY s.step_seq
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    const docs = await query(`
      SELECT * FROM dbo.WoDocument WHERE work_order_id = @id ORDER BY attached_at
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    const notes = await query(`
      SELECT * FROM dbo.WoNote WHERE work_order_id = @id ORDER BY created_at DESC
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    res.json({ ...wos[0], steps, documents: docs, notes });
  } catch (err) {
    console.error('[mod13/work-orders GET/:id]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod13/work-orders
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const { job_title, customer_id, customer_name, part_number, part_description,
          quantity, order_reference, contract_review_id, priority, planned_start,
          planned_end, assigned_supervisor_id, special_instructions, steps = [] } = req.body;
  if (!job_title || !customer_name) {
    return res.status(400).json({ message: 'job_title and customer_name required.' });
  }
  try {
    const year = new Date().getFullYear();
    await query(`
      UPDATE dbo.Mod13Sequence SET last_num = last_num + 1, last_year = @yr WHERE seq_key = 'WORK_ORDER'
    `, [{ name: 'yr', type: sql.Int, value: year }]);
    const seq = await query(`SELECT last_num FROM dbo.Mod13Sequence WHERE seq_key = 'WORK_ORDER'`);
    const wo_number = `WO-${year}-${String(seq[0].last_num).padStart(4, '0')}`;

    const result = await query(`
      INSERT INTO dbo.WorkOrder
        (wo_number, job_title, customer_id, customer_name, part_number, part_description,
         quantity, order_reference, contract_review_id, priority, planned_start, planned_end,
         assigned_supervisor_id, special_instructions, created_by)
      OUTPUT INSERTED.work_order_id
      VALUES (@num,@title,@cid,@cname,@pnum,@pdesc,@qty,@oref,@crid,@pri,@ps,@pe,@sup,@si,@by)
    `, [
      { name: 'num',   type: sql.NVarChar(20),  value: wo_number },
      { name: 'title', type: sql.NVarChar(200), value: job_title },
      { name: 'cid',   type: sql.Int,           value: customer_id || null },
      { name: 'cname', type: sql.NVarChar(200), value: customer_name },
      { name: 'pnum',  type: sql.NVarChar(100), value: part_number || null },
      { name: 'pdesc', type: sql.NVarChar(200), value: part_description || null },
      { name: 'qty',   type: sql.Int,           value: quantity || 1 },
      { name: 'oref',  type: sql.NVarChar(100), value: order_reference || null },
      { name: 'crid',  type: sql.Int,           value: contract_review_id || null },
      { name: 'pri',   type: sql.NVarChar(10),  value: priority || 'NORMAL' },
      { name: 'ps',    type: sql.Date,          value: planned_start || null },
      { name: 'pe',    type: sql.Date,          value: planned_end || null },
      { name: 'sup',   type: sql.Int,           value: assigned_supervisor_id || null },
      { name: 'si',    type: sql.NVarChar(sql.MAX), value: special_instructions || null },
      { name: 'by',    type: sql.Int,           value: req.user.userId },
    ]);
    const woId = result[0].work_order_id;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await query(`
        INSERT INTO dbo.WoStep (work_order_id, step_seq, step_name, process_type, instruction, standard_ref, is_mandatory)
        VALUES (@wid,@seq,@name,@ptype,@inst,@std,@mand)
      `, [
        { name: 'wid',   type: sql.Int,           value: woId },
        { name: 'seq',   type: sql.Int,           value: i + 1 },
        { name: 'name',  type: sql.NVarChar(200), value: s.step_name },
        { name: 'ptype', type: sql.NVarChar(20),  value: s.process_type || null },
        { name: 'inst',  type: sql.NVarChar(sql.MAX), value: s.instruction || null },
        { name: 'std',   type: sql.NVarChar(100), value: s.standard_ref || null },
        { name: 'mand',  type: sql.Bit,           value: s.is_mandatory !== false ? 1 : 0 },
      ]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'WorkOrder', recordId: woId, moduleId: 'MOD-13', newValue: wo_number });
    res.status(201).json({ work_order_id: woId, wo_number });
  } catch (err) {
    console.error('[mod13/work-orders POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod13/work-orders/:id/status
router.patch('/:id/status', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { status, actual_start, actual_end } = req.body;
  const allowed = ['DRAFT','ISSUED','IN_PROGRESS','PENDING_QA','COMPLETE','CANCELLED'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  try {
    await query(`
      UPDATE dbo.WorkOrder SET status=@s,
        actual_start = CASE WHEN @s='IN_PROGRESS' AND actual_start IS NULL THEN CAST(GETUTCDATE() AS DATE) ELSE actual_start END,
        actual_end   = CASE WHEN @s IN ('COMPLETE','CANCELLED') AND actual_end IS NULL THEN CAST(GETUTCDATE() AS DATE) ELSE actual_end END,
        updated_at=GETUTCDATE()
      WHERE work_order_id=@id AND is_active=1
    `, [
      { name: 's',  type: sql.NVarChar(20), value: status },
      { name: 'id', type: sql.Int,          value: parseInt(req.params.id) },
    ]);
    // Log note
    await query(`
      INSERT INTO dbo.WoNote (work_order_id, note_type, note_text, created_by)
      VALUES (@wid, 'STATUS_CHANGE', @txt, @by)
    `, [
      { name: 'wid', type: sql.Int,           value: parseInt(req.params.id) },
      { name: 'txt', type: sql.NVarChar(sql.MAX), value: `Status changed to ${status}` },
      { name: 'by',  type: sql.Int,           value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'STATUS_CHANGE', tableName: 'WorkOrder', recordId: parseInt(req.params.id),
      moduleId: 'MOD-13', newValue: status });
    res.json({ message: 'Status updated.' });
  } catch (err) {
    console.error('[mod13/work-orders status]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod13/work-orders/:id/steps/:stepId/complete
router.patch('/:id/steps/:stepId/complete', requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  const { sign_off_notes, status = 'COMPLETE' } = req.body;
  const allowed = ['COMPLETE','SKIPPED','FAILED'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid step status.' });
  try {
    await query(`
      UPDATE dbo.WoStep SET status=@s, completed_by_id=@by, completed_at=GETUTCDATE(), sign_off_notes=@notes
      WHERE step_id=@sid AND work_order_id=@wid
    `, [
      { name: 's',     type: sql.NVarChar(20),      value: status },
      { name: 'by',    type: sql.Int,               value: req.user.userId },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: sign_off_notes || null },
      { name: 'sid',   type: sql.Int,               value: parseInt(req.params.stepId) },
      { name: 'wid',   type: sql.Int,               value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'STEP_COMPLETE', tableName: 'WoStep', recordId: parseInt(req.params.stepId),
      moduleId: 'MOD-13', newValue: status });
    res.json({ message: 'Step updated.' });
  } catch (err) {
    console.error('[mod13/steps complete]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
