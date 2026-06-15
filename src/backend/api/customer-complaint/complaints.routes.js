'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status = '', severity = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT cc.complaint_id, cc.complaint_ref, cc.received_date, cc.complaint_type,
             cc.severity, cc.subject, cc.status, cc.target_close_date,
             cc.customer_name, c.company_name AS customer_company,
             u.full_name AS created_by_name,
             o.full_name AS owned_by_name,
             (SELECT COUNT(*) FROM dbo.EightDReport r WHERE r.complaint_id=cc.complaint_id) AS has_8d
      FROM dbo.CustomerComplaint cc
      LEFT JOIN dbo.Customer c ON c.customer_id=cc.customer_id
      JOIN dbo.Users u ON u.user_id=cc.created_by
      LEFT JOIN dbo.Users o ON o.user_id=cc.owned_by
      WHERE cc.is_active=1
        AND (@status='' OR cc.status=@status)
        AND (@severity='' OR cc.severity=@severity)
      ORDER BY cc.received_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status',   type: sql.NVarChar(30), value: status },
      { name: 'severity', type: sql.NVarChar(10), value: severity },
      { name: 'offset',   type: sql.Int, value: offset },
      { name: 'limit',    type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.CustomerComplaint WHERE is_active=1 AND (@status='' OR status=@status) AND (@severity='' OR severity=@severity)`,
      [{ name: 'status', type: sql.NVarChar(30), value: status }, { name: 'severity', type: sql.NVarChar(10), value: severity }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    console.error('[mod20/complaints GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await query(`
      SELECT cc.*, c.company_name AS customer_company, u.full_name AS created_by_name, o.full_name AS owned_by_name
      FROM dbo.CustomerComplaint cc
      LEFT JOIN dbo.Customer c ON c.customer_id=cc.customer_id
      JOIN dbo.Users u ON u.user_id=cc.created_by
      LEFT JOIN dbo.Users o ON o.user_id=cc.owned_by
      WHERE cc.complaint_id=@id AND cc.is_active=1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Complaint not found.' });
    const logs = await query(`
      SELECT al.*, u.full_name FROM dbo.ComplaintActivityLog al
      LEFT JOIN dbo.Users u ON u.user_id=al.performed_by
      WHERE al.complaint_id=@id ORDER BY al.performed_at DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ ...rows[0], activity_log: logs });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { customer_id, customer_name, contact_name, contact_email, received_date,
            complaint_type, severity, subject, description, part_number, job_ref,
            po_number, ncr_id, target_close_date, owned_by } = req.body;
    if (!subject || !description) return res.status(400).json({ message: 'subject and description required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod20Sequence SET last_num=last_num+1 WHERE seq_key='COMPLAINT';
      SELECT last_num FROM dbo.Mod20Sequence WHERE seq_key='COMPLAINT';
    `);
    const complaint_ref = `CC-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.CustomerComplaint (complaint_ref,customer_id,customer_name,contact_name,contact_email,
        received_date,complaint_type,severity,subject,description,part_number,job_ref,po_number,ncr_id,
        target_close_date,owned_by,created_by)
      OUTPUT INSERTED.complaint_id
      VALUES (@ref,@cid,@cname,@con,@cemail,@rd,@ct,@sev,@sub,@desc,@pn,@jr,@po,@ncr,@tcd,@ob,@uid)
    `, [
      { name: 'ref',    type: sql.NVarChar(20),  value: complaint_ref },
      { name: 'cid',    type: sql.Int,           value: customer_id || null },
      { name: 'cname',  type: sql.NVarChar(200), value: customer_name || null },
      { name: 'con',    type: sql.NVarChar(100), value: contact_name || null },
      { name: 'cemail', type: sql.NVarChar(150), value: contact_email || null },
      { name: 'rd',     type: sql.Date,          value: received_date || null },
      { name: 'ct',     type: sql.NVarChar(30),  value: complaint_type || 'QUALITY' },
      { name: 'sev',    type: sql.NVarChar(10),  value: severity || 'MEDIUM' },
      { name: 'sub',    type: sql.NVarChar(300), value: subject },
      { name: 'desc',   type: sql.NVarChar(sql.MAX), value: description },
      { name: 'pn',     type: sql.NVarChar(100), value: part_number || null },
      { name: 'jr',     type: sql.NVarChar(50),  value: job_ref || null },
      { name: 'po',     type: sql.NVarChar(100), value: po_number || null },
      { name: 'ncr',    type: sql.Int,           value: ncr_id || null },
      { name: 'tcd',    type: sql.Date,          value: target_close_date || null },
      { name: 'ob',     type: sql.Int,           value: owned_by || null },
      { name: 'uid',    type: sql.Int,           value: req.session.userId },
    ]);
    const complaint_id = ins[0].complaint_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'CustomerComplaint', recordId: complaint_id, moduleId: 'MOD-20',
      newValue: JSON.stringify({ complaint_ref, severity: severity || 'MEDIUM' }) });
    res.status(201).json({ complaint_id, complaint_ref, message: 'Complaint logged.' });
  } catch (err) {
    console.error('[mod20/complaints POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/status', requireAuth, requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes } = req.body;
    const valid = ['OPEN','UNDER_REVIEW','8D_IN_PROGRESS','CLOSED','WITHDRAWN'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const extra = status === 'CLOSED' ? ', closed_date=CAST(GETUTCDATE() AS DATE)' : '';
    await query(`UPDATE dbo.CustomerComplaint SET status=@s${extra}, updated_at=GETUTCDATE() WHERE complaint_id=@id AND is_active=1`,
      [{ name: 's', type: sql.NVarChar(30), value: status }, { name: 'id', type: sql.Int, value: id }]);
    await query(`INSERT INTO dbo.ComplaintActivityLog (complaint_id,action_type,action_notes,performed_by) VALUES (@id,@at,@notes,@uid)`, [
      { name: 'id',    type: sql.Int,           value: id },
      { name: 'at',    type: sql.NVarChar(50),  value: `STATUS_${status}` },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `COMPLAINT_${status}`, tableName: 'CustomerComplaint', recordId: id, moduleId: 'MOD-20' });
    res.json({ message: `Complaint status: ${status}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
