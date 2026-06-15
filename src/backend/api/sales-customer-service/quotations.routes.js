'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT q.quotation_id, q.quotation_ref, q.quotation_date, q.valid_until,
             q.currency, q.total_amount, q.status,
             c.company_name AS customer_name,
             u.full_name AS prepared_by_name
      FROM dbo.Quotation q
      JOIN dbo.Customer c ON c.customer_id=q.customer_id
      JOIN dbo.Users u ON u.user_id=q.prepared_by
      WHERE q.is_active=1
        AND (@status='' OR q.status=@status)
      ORDER BY q.quotation_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.Quotation WHERE is_active=1 AND (@status='' OR status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    console.error('[mod09/quotations GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await query(`
      SELECT q.*, c.company_name AS customer_name, u.full_name AS prepared_by_name
      FROM dbo.Quotation q
      JOIN dbo.Customer c ON c.customer_id=q.customer_id
      JOIN dbo.Users u ON u.user_id=q.prepared_by
      WHERE q.quotation_id=@id AND q.is_active=1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Quotation not found.' });
    const lines = await query(`
      SELECT ql.*, p.part_number FROM dbo.QuotationLine ql
      LEFT JOIN dbo.PartMaster p ON p.part_id=ql.part_id
      WHERE ql.quotation_id=@id ORDER BY ql.line_seq
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ ...rows[0], lines });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { customer_id, valid_until, currency, gst_pct, terms_conditions, notes, lines = [] } = req.body;
    if (!customer_id) return res.status(400).json({ message: 'customer_id required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod09Sequence SET last_num=last_num+1 WHERE seq_key='QUOTATION';
      SELECT last_num FROM dbo.Mod09Sequence WHERE seq_key='QUOTATION';
    `);
    const quotation_ref = `QT-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    let subtotal = 0;
    for (const l of lines) subtotal += (l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount_pct || 0) / 100);
    const gst = subtotal * ((gst_pct || 9) / 100);
    const total = subtotal + gst;

    const ins = await query(`
      INSERT INTO dbo.Quotation (quotation_ref,customer_id,valid_until,currency,subtotal,gst_pct,gst_amount,total_amount,terms_conditions,notes,prepared_by)
      OUTPUT INSERTED.quotation_id
      VALUES (@ref,@cid,@valid,@cur,@sub,@gst,@gsta,@tot,@tc,@notes,@uid)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: quotation_ref },
      { name: 'cid',   type: sql.Int,           value: parseInt(customer_id) },
      { name: 'valid', type: sql.Date,          value: valid_until || null },
      { name: 'cur',   type: sql.NVarChar(5),   value: currency || 'SGD' },
      { name: 'sub',   type: sql.Decimal(14,2), value: subtotal },
      { name: 'gst',   type: sql.Decimal(5,2),  value: gst_pct || 9 },
      { name: 'gsta',  type: sql.Decimal(14,2), value: gst },
      { name: 'tot',   type: sql.Decimal(14,2), value: total },
      { name: 'tc',    type: sql.NVarChar(sql.MAX), value: terms_conditions || null },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
    ]);
    const quotation_id = ins[0].quotation_id;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const line_total = (l.quantity || 0) * (l.unit_price || 0) * (1 - (l.discount_pct || 0) / 100);
      await query(`
        INSERT INTO dbo.QuotationLine (quotation_id,line_seq,part_id,description,unit_of_measure,quantity,unit_price,discount_pct,line_total)
        VALUES (@qid,@seq,@pid,@desc,@uom,@qty,@price,@disc,@lt)
      `, [
        { name: 'qid',   type: sql.Int,           value: quotation_id },
        { name: 'seq',   type: sql.Int,           value: i + 1 },
        { name: 'pid',   type: sql.Int,           value: l.part_id || null },
        { name: 'desc',  type: sql.NVarChar(300), value: l.description },
        { name: 'uom',   type: sql.NVarChar(20),  value: l.unit_of_measure || 'EA' },
        { name: 'qty',   type: sql.Decimal(12,3), value: l.quantity || 1 },
        { name: 'price', type: sql.Decimal(14,2), value: l.unit_price || 0 },
        { name: 'disc',  type: sql.Decimal(5,2),  value: l.discount_pct || 0 },
        { name: 'lt',    type: sql.Decimal(14,2), value: line_total },
      ]);
    }

    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'Quotation', recordId: quotation_id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ quotation_ref, total }) });
    res.status(201).json({ quotation_id, quotation_ref, message: 'Quotation created.' });
  } catch (err) {
    console.error('[mod09/quotations POST]', err.message);
    res.status(500).json({ message: 'Error creating quotation.' });
  }
});

// PATCH status
router.patch('/:id/status', requireAuth, requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const valid = ['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CONVERTED'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    await query(`UPDATE dbo.Quotation SET status=@s, updated_at=GETUTCDATE() WHERE quotation_id=@id AND is_active=1`,
      [{ name: 's', type: sql.NVarChar(20), value: status }, { name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `STATUS_${status}`, tableName: 'Quotation', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: `Quotation status set to ${status}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
