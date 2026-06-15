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
      SELECT g.grn_id, g.grn_ref, g.received_date, g.supplier_name, g.delivery_note_no,
             g.status, g.inspection_reqd, g.inspection_done, g.inspect_result,
             c.company_name AS customer_name,
             u.full_name AS received_by_name
      FROM dbo.GoodsReceivingNote g
      LEFT JOIN dbo.Customer c ON c.customer_id=g.customer_id
      JOIN dbo.Users u ON u.user_id=g.received_by
      WHERE g.is_active=1 AND (@status='' OR g.status=@status)
      ORDER BY g.received_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.GoodsReceivingNote WHERE is_active=1 AND (@status='' OR status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const { customer_id, supplier_name, delivery_note_no, received_date, inspection_reqd, grn_notes, lines = [] } = req.body;

    const seqRows = await query(`
      UPDATE dbo.Mod09Sequence SET last_num=last_num+1 WHERE seq_key='GRN';
      SELECT last_num FROM dbo.Mod09Sequence WHERE seq_key='GRN';
    `);
    const grn_ref = `GRN-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.GoodsReceivingNote (grn_ref,customer_id,supplier_name,delivery_note_no,received_date,received_by,inspection_reqd,grn_notes)
      OUTPUT INSERTED.grn_id
      VALUES (@ref,@cid,@sup,@dn,@rd,@uid,@ir,@notes)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: grn_ref },
      { name: 'cid',   type: sql.Int,           value: customer_id || null },
      { name: 'sup',   type: sql.NVarChar(200), value: supplier_name || null },
      { name: 'dn',    type: sql.NVarChar(100), value: delivery_note_no || null },
      { name: 'rd',    type: sql.Date,          value: received_date || null },
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
      { name: 'ir',    type: sql.Bit,           value: inspection_reqd !== false ? 1 : 0 },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: grn_notes || null },
    ]);
    const grn_id = ins[0].grn_id;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await query(`
        INSERT INTO dbo.GrnLine (grn_id,line_seq,part_id,description,qty_ordered,qty_received,qty_accepted,unit_of_measure,batch_lot_no,expiry_date,condition)
        VALUES (@gid,@seq,@pid,@desc,@qo,@qr,@qa,@uom,@lot,@exp,@cond)
      `, [
        { name: 'gid',  type: sql.Int,           value: grn_id },
        { name: 'seq',  type: sql.Int,           value: i + 1 },
        { name: 'pid',  type: sql.Int,           value: l.part_id || null },
        { name: 'desc', type: sql.NVarChar(300), value: l.description },
        { name: 'qo',   type: sql.Decimal(12,3), value: l.qty_ordered || null },
        { name: 'qr',   type: sql.Decimal(12,3), value: l.qty_received || 0 },
        { name: 'qa',   type: sql.Decimal(12,3), value: l.qty_accepted || 0 },
        { name: 'uom',  type: sql.NVarChar(20),  value: l.unit_of_measure || 'EA' },
        { name: 'lot',  type: sql.NVarChar(100), value: l.batch_lot_no || null },
        { name: 'exp',  type: sql.Date,          value: l.expiry_date || null },
        { name: 'cond', type: sql.NVarChar(20),  value: l.condition || 'GOOD' },
      ]);
    }

    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'GoodsReceivingNote', recordId: grn_id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ grn_ref }) });
    res.status(201).json({ grn_id, grn_ref, message: 'GRN created.' });
  } catch (err) {
    console.error('[mod09/grn POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/inspect', requireAuth, requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { inspect_result, grn_notes } = req.body;
    const valid = ['ACCEPT','REJECT','CONDITIONAL'];
    if (!valid.includes(inspect_result)) return res.status(400).json({ message: 'Invalid inspect_result.' });
    const status = inspect_result === 'ACCEPT' ? 'ACCEPTED' : inspect_result === 'REJECT' ? 'REJECTED' : 'QUARANTINE';
    await query(`
      UPDATE dbo.GoodsReceivingNote
      SET inspection_done=1, inspect_by=@uid, inspect_result=@ir, status=@st, grn_notes=@notes, updated_at=GETUTCDATE()
      WHERE grn_id=@id AND is_active=1
    `, [
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
      { name: 'ir',    type: sql.NVarChar(20),  value: inspect_result },
      { name: 'st',    type: sql.NVarChar(20),  value: status },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: grn_notes || null },
      { name: 'id',    type: sql.Int,           value: id },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `GRN_INSPECT_${inspect_result}`, tableName: 'GoodsReceivingNote', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: `GRN inspection: ${inspect_result}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
