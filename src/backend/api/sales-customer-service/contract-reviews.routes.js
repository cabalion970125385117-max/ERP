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
      SELECT cr.review_id, cr.review_ref, cr.review_date, cr.po_number, cr.status,
             c.company_name AS customer_name,
             u.full_name AS reviewer_name
      FROM dbo.ContractReview cr
      JOIN dbo.Customer c ON c.customer_id=cr.customer_id
      JOIN dbo.Users u ON u.user_id=cr.reviewer_id
      WHERE cr.is_active=1 AND (@status='' OR cr.status=@status)
      ORDER BY cr.review_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.ContractReview WHERE is_active=1 AND (@status='' OR status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { customer_id, quotation_id, po_number, po_date, spec_reviewed, capability_ok,
            delivery_ok, regulatory_ok, customer_flow_ok, status, review_notes } = req.body;
    if (!customer_id) return res.status(400).json({ message: 'customer_id required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod09Sequence SET last_num=last_num+1 WHERE seq_key='CONTRACT_REVIEW';
      SELECT last_num FROM dbo.Mod09Sequence WHERE seq_key='CONTRACT_REVIEW';
    `);
    const review_ref = `CR-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.ContractReview (review_ref,customer_id,quotation_id,po_number,po_date,
        spec_reviewed,capability_ok,delivery_ok,regulatory_ok,customer_flow_ok,status,reviewer_id,review_notes)
      OUTPUT INSERTED.review_id
      VALUES (@ref,@cid,@qid,@po,@pod,@sr,@co,@do,@ro,@cfo,@st,@rid,@notes)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: review_ref },
      { name: 'cid',   type: sql.Int,           value: parseInt(customer_id) },
      { name: 'qid',   type: sql.Int,           value: quotation_id || null },
      { name: 'po',    type: sql.NVarChar(100), value: po_number || null },
      { name: 'pod',   type: sql.Date,          value: po_date || null },
      { name: 'sr',    type: sql.Bit,           value: spec_reviewed ? 1 : 0 },
      { name: 'co',    type: sql.Bit,           value: capability_ok ? 1 : 0 },
      { name: 'do',    type: sql.Bit,           value: delivery_ok ? 1 : 0 },
      { name: 'ro',    type: sql.Bit,           value: regulatory_ok ? 1 : 0 },
      { name: 'cfo',   type: sql.Bit,           value: customer_flow_ok ? 1 : 0 },
      { name: 'st',    type: sql.NVarChar(20),  value: status || 'PENDING' },
      { name: 'rid',   type: sql.Int,           value: req.session.userId },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: review_notes || null },
    ]);
    const review_id = ins[0].review_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'ContractReview', recordId: review_id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ review_ref, status: status || 'PENDING' }) });
    res.status(201).json({ review_id, review_ref, message: 'Contract review created.' });
  } catch (err) {
    console.error('[mod09/contract-reviews POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/approve', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // APPROVED or REJECTED
    const valid = ['APPROVED','REJECTED','ON_HOLD'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    await query(`UPDATE dbo.ContractReview SET status=@s, updated_at=GETUTCDATE() WHERE review_id=@id AND is_active=1`,
      [{ name: 's', type: sql.NVarChar(20), value: status }, { name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `REVIEW_${status}`, tableName: 'ContractReview', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: `Contract review ${status}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
