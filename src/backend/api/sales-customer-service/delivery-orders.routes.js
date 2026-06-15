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
      SELECT d.do_id, d.do_ref, d.delivery_date, d.status, d.shipping_method, d.tracking_number,
             c.company_name AS customer_name,
             u.full_name AS prepared_by_name
      FROM dbo.DeliveryOrder d
      JOIN dbo.Customer c ON c.customer_id=d.customer_id
      JOIN dbo.Users u ON u.user_id=d.prepared_by
      WHERE d.is_active=1 AND (@status='' OR d.status=@status)
      ORDER BY d.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.DeliveryOrder WHERE is_active=1 AND (@status='' OR status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { customer_id, review_id, delivery_date, shipping_method, delivery_address, do_notes, lines = [] } = req.body;
    if (!customer_id) return res.status(400).json({ message: 'customer_id required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod09Sequence SET last_num=last_num+1 WHERE seq_key='DELIVERY_ORDER';
      SELECT last_num FROM dbo.Mod09Sequence WHERE seq_key='DELIVERY_ORDER';
    `);
    const do_ref = `DO-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.DeliveryOrder (do_ref,customer_id,review_id,delivery_date,shipping_method,delivery_address,do_notes,prepared_by)
      OUTPUT INSERTED.do_id
      VALUES (@ref,@cid,@rid,@dd,@sm,@addr,@notes,@uid)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: do_ref },
      { name: 'cid',   type: sql.Int,           value: parseInt(customer_id) },
      { name: 'rid',   type: sql.Int,           value: review_id || null },
      { name: 'dd',    type: sql.Date,          value: delivery_date || null },
      { name: 'sm',    type: sql.NVarChar(50),  value: shipping_method || null },
      { name: 'addr',  type: sql.NVarChar(500), value: delivery_address || null },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: do_notes || null },
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
    ]);
    const do_id = ins[0].do_id;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      await query(`
        INSERT INTO dbo.DeliveryOrderLine (do_id,line_seq,part_id,description,quantity,unit_of_measure,serial_numbers)
        VALUES (@did,@seq,@pid,@desc,@qty,@uom,@sn)
      `, [
        { name: 'did',  type: sql.Int,           value: do_id },
        { name: 'seq',  type: sql.Int,           value: i + 1 },
        { name: 'pid',  type: sql.Int,           value: l.part_id || null },
        { name: 'desc', type: sql.NVarChar(300), value: l.description },
        { name: 'qty',  type: sql.Decimal(12,3), value: l.quantity || 1 },
        { name: 'uom',  type: sql.NVarChar(20),  value: l.unit_of_measure || 'EA' },
        { name: 'sn',   type: sql.NVarChar(500), value: l.serial_numbers || null },
      ]);
    }

    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'DeliveryOrder', recordId: do_id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ do_ref }) });
    res.status(201).json({ do_id, do_ref, message: 'Delivery order created.' });
  } catch (err) {
    console.error('[mod09/do POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/ship', requireAuth, requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tracking_number, shipping_method } = req.body;
    await query(`
      UPDATE dbo.DeliveryOrder
      SET status='SHIPPED', shipped_date=GETUTCDATE(), tracking_number=@tn, shipping_method=@sm,
          released_by=@uid, released_at=GETUTCDATE(), updated_at=GETUTCDATE()
      WHERE do_id=@id AND is_active=1
    `, [
      { name: 'tn',  type: sql.NVarChar(100), value: tracking_number || null },
      { name: 'sm',  type: sql.NVarChar(50),  value: shipping_method || null },
      { name: 'uid', type: sql.Int,           value: req.session.userId },
      { name: 'id',  type: sql.Int,           value: id },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'DO_SHIPPED', tableName: 'DeliveryOrder', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: 'Delivery order marked as SHIPPED.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
