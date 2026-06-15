'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT p.part_id, p.part_number, p.part_description, p.part_type, p.process_area,
             p.unit_of_measure, p.standard_price, p.revision, p.is_active,
             c.company_name AS customer_name
      FROM dbo.PartMaster p
      LEFT JOIN dbo.Customer c ON c.customer_id=p.customer_id
      WHERE p.is_active=1
        AND (@search='' OR p.part_number LIKE '%'+@search+'%' OR p.part_description LIKE '%'+@search+'%')
      ORDER BY p.part_number
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'search', type: sql.NVarChar(200), value: search },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.PartMaster WHERE is_active=1 AND (@search='' OR part_number LIKE '%'+@search+'%' OR part_description LIKE '%'+@search+'%')`,
      [{ name: 'search', type: sql.NVarChar(200), value: search }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    console.error('[mod09/parts GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { part_number, part_description, part_type, process_area, material_spec, unit_of_measure, standard_price, customer_id, revision, notes } = req.body;
    if (!part_number || !part_description) return res.status(400).json({ message: 'part_number and part_description required.' });
    const ins = await query(`
      INSERT INTO dbo.PartMaster (part_number,part_description,part_type,process_area,material_spec,unit_of_measure,standard_price,customer_id,revision,notes,created_by)
      OUTPUT INSERTED.part_id
      VALUES (@pn,@pd,@pt,@pa,@ms,@uom,@price,@cid,@rev,@notes,@uid)
    `, [
      { name: 'pn',    type: sql.NVarChar(100), value: part_number },
      { name: 'pd',    type: sql.NVarChar(300), value: part_description },
      { name: 'pt',    type: sql.NVarChar(30),  value: part_type || 'SERVICE' },
      { name: 'pa',    type: sql.NVarChar(50),  value: process_area || null },
      { name: 'ms',    type: sql.NVarChar(100), value: material_spec || null },
      { name: 'uom',   type: sql.NVarChar(20),  value: unit_of_measure || 'EA' },
      { name: 'price', type: sql.Decimal(14,2), value: standard_price || null },
      { name: 'cid',   type: sql.Int,           value: customer_id || null },
      { name: 'rev',   type: sql.NVarChar(10),  value: revision || 'A' },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'uid',   type: sql.Int,           value: req.session.userId },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'PartMaster', recordId: ins[0].part_id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ part_number }) });
    res.status(201).json({ part_id: ins[0].part_id, message: 'Part created.' });
  } catch (err) {
    console.error('[mod09/parts POST]', err.message);
    res.status(500).json({ message: 'Error creating part.' });
  }
});

router.put('/:id', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { part_number, part_description, part_type, process_area, material_spec, unit_of_measure, standard_price, customer_id, revision, notes } = req.body;
    await query(`
      UPDATE dbo.PartMaster
      SET part_number=@pn, part_description=@pd, part_type=@pt, process_area=@pa,
          material_spec=@ms, unit_of_measure=@uom, standard_price=@price,
          customer_id=@cid, revision=@rev, notes=@notes, updated_at=GETUTCDATE()
      WHERE part_id=@id AND is_active=1
    `, [
      { name: 'pn',    type: sql.NVarChar(100), value: part_number },
      { name: 'pd',    type: sql.NVarChar(300), value: part_description },
      { name: 'pt',    type: sql.NVarChar(30),  value: part_type || 'SERVICE' },
      { name: 'pa',    type: sql.NVarChar(50),  value: process_area || null },
      { name: 'ms',    type: sql.NVarChar(100), value: material_spec || null },
      { name: 'uom',   type: sql.NVarChar(20),  value: unit_of_measure || 'EA' },
      { name: 'price', type: sql.Decimal(14,2), value: standard_price || null },
      { name: 'cid',   type: sql.Int,           value: customer_id || null },
      { name: 'rev',   type: sql.NVarChar(10),  value: revision || 'A' },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'id',    type: sql.Int,           value: id },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'PartMaster', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: 'Part updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.delete('/:id', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query(`UPDATE dbo.PartMaster SET is_active=0, updated_at=GETUTCDATE() WHERE part_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'DELETE', tableName: 'PartMaster', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: 'Part deactivated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
