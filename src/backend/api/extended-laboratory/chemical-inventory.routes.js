'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { low_stock = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const lowFilter = low_stock === '1' ? 'AND c.qty_on_hand < c.qty_minimum' : '';
    const rows = await query(`
      SELECT c.chem_id, c.chem_code, c.chem_name, c.cas_number, c.supplier_name,
             c.process_use, c.unit_of_measure, c.qty_on_hand, c.qty_minimum,
             c.location, c.sds_version, c.sds_date, c.sds_next_review,
             c.hazard_class, c.is_active,
             CASE WHEN c.qty_minimum IS NOT NULL AND c.qty_on_hand < c.qty_minimum THEN 1 ELSE 0 END AS is_low_stock
      FROM dbo.ChemicalInventory c
      WHERE c.is_active=1 ${lowFilter}
      ORDER BY c.chem_code
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.ChemicalInventory WHERE is_active=1 ${lowFilter}`);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { chem_name, cas_number, supplier_name, grade, process_use, unit_of_measure,
            qty_on_hand, qty_minimum, location, sds_version, sds_date, sds_next_review,
            hazard_class, storage_condition, disposal_notes } = req.body;
    if (!chem_name) return res.status(400).json({ message: 'chem_name required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod19Sequence SET last_num=last_num+1 WHERE seq_key='CHEMICAL';
      SELECT last_num FROM dbo.Mod19Sequence WHERE seq_key='CHEMICAL';
    `);
    const chem_code = `CHEM-${String(seqRows[0].last_num).padStart(3,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.ChemicalInventory (chem_code,chem_name,cas_number,supplier_name,grade,process_use,
        unit_of_measure,qty_on_hand,qty_minimum,location,sds_version,sds_date,sds_next_review,
        hazard_class,storage_condition,disposal_notes,created_by)
      OUTPUT INSERTED.chem_id
      VALUES (@code,@name,@cas,@sup,@grd,@pu,@uom,@qoh,@qmin,@loc,@sdsv,@sdsd,@sdsnr,@hc,@sc,@dn,@uid)
    `, [
      { name: 'code', type: sql.NVarChar(20),  value: chem_code },
      { name: 'name', type: sql.NVarChar(200), value: chem_name },
      { name: 'cas',  type: sql.NVarChar(20),  value: cas_number || null },
      { name: 'sup',  type: sql.NVarChar(200), value: supplier_name || null },
      { name: 'grd',  type: sql.NVarChar(50),  value: grade || null },
      { name: 'pu',   type: sql.NVarChar(100), value: process_use || null },
      { name: 'uom',  type: sql.NVarChar(20),  value: unit_of_measure || 'L' },
      { name: 'qoh',  type: sql.Decimal(12,3), value: qty_on_hand || 0 },
      { name: 'qmin', type: sql.Decimal(12,3), value: qty_minimum || null },
      { name: 'loc',  type: sql.NVarChar(100), value: location || null },
      { name: 'sdsv', type: sql.NVarChar(20),  value: sds_version || null },
      { name: 'sdsd', type: sql.Date,          value: sds_date || null },
      { name: 'sdsnr',type: sql.Date,          value: sds_next_review || null },
      { name: 'hc',   type: sql.NVarChar(100), value: hazard_class || null },
      { name: 'sc',   type: sql.NVarChar(200), value: storage_condition || null },
      { name: 'dn',   type: sql.NVarChar(sql.MAX), value: disposal_notes || null },
      { name: 'uid',  type: sql.Int,           value: req.session.userId },
    ]);
    const chem_id = ins[0].chem_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'ChemicalInventory', recordId: chem_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ chem_code, chem_name }) });
    res.status(201).json({ chem_id, chem_code, message: 'Chemical registered.' });
  } catch (err) {
    console.error('[mod19/chemicals POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST transaction (receipt/issue/disposal)
router.post('/:id/transaction', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const chem_id = parseInt(req.params.id);
    const { txn_type, qty, batch_lot_no, expiry_date, reference_no, txn_notes } = req.body;
    const valid = ['RECEIPT','ISSUE','DISPOSAL','ADJUSTMENT','RETURN'];
    if (!valid.includes(txn_type)) return res.status(400).json({ message: 'Invalid txn_type.' });
    if (!qty || qty <= 0) return res.status(400).json({ message: 'qty must be > 0.' });

    await query(`
      INSERT INTO dbo.ChemicalTransaction (chem_id,txn_type,qty,batch_lot_no,expiry_date,reference_no,performed_by,txn_notes)
      VALUES (@cid,@type,@qty,@lot,@exp,@ref,@uid,@notes)
    `, [
      { name: 'cid',   type: sql.Int,           value: chem_id },
      { name: 'type',  type: sql.NVarChar(20),  value: txn_type },
      { name: 'qty',   type: sql.Decimal(12,3), value: parseFloat(qty) },
      { name: 'lot',   type: sql.NVarChar(100), value: batch_lot_no || null },
      { name: 'exp',   type: sql.Date,          value: expiry_date || null },
      { name: 'ref',   type: sql.NVarChar(100), value: reference_no || null },
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: txn_notes || null },
    ]);

    // Update qty_on_hand
    const sign = ['RECEIPT','RETURN','ADJUSTMENT'].includes(txn_type) ? '+' : '-';
    await query(`UPDATE dbo.ChemicalInventory SET qty_on_hand=qty_on_hand${sign}@qty, updated_at=GETUTCDATE() WHERE chem_id=@cid`,
      [{ name: 'qty', type: sql.Decimal(12,3), value: parseFloat(qty) }, { name: 'cid', type: sql.Int, value: chem_id }]);

    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `CHEM_${txn_type}`, tableName: 'ChemicalInventory', recordId: chem_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ txn_type, qty }) });
    res.status(201).json({ message: `${txn_type} recorded.` });
  } catch (err) {
    console.error('[mod19/chem txn POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
