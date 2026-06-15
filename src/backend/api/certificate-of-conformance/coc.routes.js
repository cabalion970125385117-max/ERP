'use strict';
const router  = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// GET /api/v1/mod24/cocs
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    let where = 'WHERE c.is_active = 1';
    const params = [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ];
    if (status) { where += ' AND c.status = @status'; params.push({ name: 'status', type: sql.NVarChar(20), value: status }); }

    const rows = await query(`
      SELECT c.*, pi.full_name AS issued_by_name, pa.full_name AS approved_by_name
      FROM dbo.CertificateOfConformance c
      LEFT JOIN dbo.Personnel pi ON pi.personnel_id = c.issued_by_id
      LEFT JOIN dbo.Personnel pa ON pa.personnel_id = c.approved_by_id
      ${where}
      ORDER BY c.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[mod24/cocs GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// GET /api/v1/mod24/cocs/:id
router.get('/:id', async (req, res) => {
  try {
    const cocs = await query(`
      SELECT c.*, pi.full_name AS issued_by_name, pa.full_name AS approved_by_name
      FROM dbo.CertificateOfConformance c
      LEFT JOIN dbo.Personnel pi ON pi.personnel_id = c.issued_by_id
      LEFT JOIN dbo.Personnel pa ON pa.personnel_id = c.approved_by_id
      WHERE c.coc_id = @id AND c.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!cocs.length) return res.status(404).json({ message: 'CoC not found.' });

    const lines = await query(`
      SELECT * FROM dbo.CocLineItem WHERE coc_id = @id ORDER BY line_seq
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);

    res.json({ ...cocs[0], line_items: lines });
  } catch (err) {
    console.error('[mod24/cocs GET/:id]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod24/cocs  — create draft CoC
router.post('/', requireMinRole('ENGINEER'), async (req, res) => {
  const { work_order_id, customer_id, customer_name, customer_po, part_number,
          part_description, part_serial_no, quantity_certified,
          process_fpi, process_mpt, process_chem_bath, process_other,
          specification_refs, purchase_order_requirement, material_cert_ref,
          inspection_report_ref, conformance_statement, exceptions_noted,
          delivery_order_id, line_items = [] } = req.body;
  if (!customer_name || !part_number) {
    return res.status(400).json({ message: 'customer_name and part_number required.' });
  }
  try {
    const year = new Date().getFullYear();
    await query(`
      UPDATE dbo.Mod24Sequence SET last_num = last_num + 1, last_year = @yr WHERE seq_key = 'COC'
    `, [{ name: 'yr', type: sql.Int, value: year }]);
    const seq = await query(`SELECT last_num FROM dbo.Mod24Sequence WHERE seq_key = 'COC'`);
    const coc_number = `COC-${year}-${String(seq[0].last_num).padStart(4, '0')}`;

    const result = await query(`
      INSERT INTO dbo.CertificateOfConformance
        (coc_number, work_order_id, customer_id, customer_name, customer_po, part_number,
         part_description, part_serial_no, quantity_certified, process_fpi, process_mpt,
         process_chem_bath, process_other, specification_refs, purchase_order_requirement,
         material_cert_ref, inspection_report_ref, conformance_statement, exceptions_noted,
         delivery_order_id, created_by)
      OUTPUT INSERTED.coc_id
      VALUES (@num,@wid,@cid,@cname,@cpo,@pnum,@pdesc,@pser,@qty,@pfpi,@pmpt,@pchem,@pother,
              @specref,@poreq,@matref,@inpref,@stmt,@exc,@doid,@by)
    `, [
      { name: 'num',    type: sql.NVarChar(20),  value: coc_number },
      { name: 'wid',    type: sql.Int,           value: work_order_id || null },
      { name: 'cid',    type: sql.Int,           value: customer_id || null },
      { name: 'cname',  type: sql.NVarChar(200), value: customer_name },
      { name: 'cpo',    type: sql.NVarChar(100), value: customer_po || null },
      { name: 'pnum',   type: sql.NVarChar(100), value: part_number },
      { name: 'pdesc',  type: sql.NVarChar(200), value: part_description || null },
      { name: 'pser',   type: sql.NVarChar(100), value: part_serial_no || null },
      { name: 'qty',    type: sql.Int,           value: quantity_certified || 1 },
      { name: 'pfpi',   type: sql.Bit,           value: process_fpi ? 1 : 0 },
      { name: 'pmpt',   type: sql.Bit,           value: process_mpt ? 1 : 0 },
      { name: 'pchem',  type: sql.Bit,           value: process_chem_bath ? 1 : 0 },
      { name: 'pother', type: sql.NVarChar(200), value: process_other || null },
      { name: 'specref',type: sql.NVarChar(500), value: specification_refs || null },
      { name: 'poreq',  type: sql.NVarChar(sql.MAX), value: purchase_order_requirement || null },
      { name: 'matref', type: sql.NVarChar(200), value: material_cert_ref || null },
      { name: 'inpref', type: sql.NVarChar(200), value: inspection_report_ref || null },
      { name: 'stmt',   type: sql.NVarChar(sql.MAX), value: conformance_statement || null },
      { name: 'exc',    type: sql.NVarChar(sql.MAX), value: exceptions_noted || null },
      { name: 'doid',   type: sql.Int,           value: delivery_order_id || null },
      { name: 'by',     type: sql.Int,           value: req.user.userId },
    ]);
    const cocId = result[0].coc_id;

    for (let i = 0; i < line_items.length; i++) {
      const li = line_items[i];
      await query(`
        INSERT INTO dbo.CocLineItem (coc_id, line_seq, process_module, reference_id, reference_number, process_description, result, notes)
        VALUES (@cid,@seq,@pmod,@ref,@refnum,@pdesc,@res,@notes)
      `, [
        { name: 'cid',    type: sql.Int,           value: cocId },
        { name: 'seq',    type: sql.Int,           value: i + 1 },
        { name: 'pmod',   type: sql.NVarChar(10),  value: li.process_module },
        { name: 'ref',    type: sql.Int,           value: li.reference_id },
        { name: 'refnum', type: sql.NVarChar(50),  value: li.reference_number },
        { name: 'pdesc',  type: sql.NVarChar(200), value: li.process_description },
        { name: 'res',    type: sql.NVarChar(20),  value: li.result },
        { name: 'notes',  type: sql.NVarChar(sql.MAX), value: li.notes || null },
      ]);
    }

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'CertificateOfConformance', recordId: cocId,
      moduleId: 'MOD-24', newValue: coc_number });
    res.status(201).json({ coc_id: cocId, coc_number });
  } catch (err) {
    console.error('[mod24/cocs POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod24/cocs/:id/issue  — approve and issue CoC (QA_MANAGER only)
router.patch('/:id/issue', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const cocId = parseInt(req.params.id);

    // GAP-03: Explicit status check — prevent re-issue of VOID/ISSUED CoC (AS9100D §8.6 / SoR §6)
    const existing = await query(
      `SELECT status FROM dbo.CertificateOfConformance WHERE coc_id = @id AND is_active = 1`,
      [{ name: 'id', type: sql.Int, value: cocId }]
    );
    if (!existing.recordset.length) return res.status(404).json({ message: 'CoC not found.' });
    const currentStatus = existing.recordset[0].status;
    if (currentStatus === 'VOID')   return res.status(400).json({ message: 'Voided CoC cannot be re-issued. Create a new CoC.' });
    if (currentStatus === 'ISSUED') return res.status(400).json({ message: 'CoC is already issued.' });

    await query(`
      UPDATE dbo.CertificateOfConformance
      SET status='ISSUED', approved_by_id=@apid, approved_at=GETUTCDATE(),
          issued_by_id=@apid, issued_at=GETUTCDATE(), updated_at=GETUTCDATE()
      WHERE coc_id=@id AND status='DRAFT' AND is_active=1
    `, [
      { name: 'apid', type: sql.Int, value: req.user.userId },
      { name: 'id',   type: sql.Int, value: cocId },
    ]);

    // Mark linked WO as coc_issued
    await query(`
      UPDATE dbo.WorkOrder SET coc_issued=1, coc_id=@cid, updated_at=GETUTCDATE()
      WHERE work_order_id = (SELECT work_order_id FROM dbo.CertificateOfConformance WHERE coc_id=@cid)
        AND is_active=1
    `, [{ name: 'cid', type: sql.Int, value: cocId }]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'ISSUE', tableName: 'CertificateOfConformance', recordId: cocId,
      moduleId: 'MOD-24', newValue: 'ISSUED' });
    res.json({ message: 'CoC issued.' });
  } catch (err) {
    console.error('[mod24/cocs issue]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /api/v1/mod24/cocs/:id/void
router.patch('/:id/void', requireMinRole('QA_MANAGER'), async (req, res) => {
  const { void_reason } = req.body;
  if (!void_reason) return res.status(400).json({ message: 'void_reason required.' });
  try {
    await query(`
      UPDATE dbo.CertificateOfConformance SET status='VOID', void_reason=@vr, updated_at=GETUTCDATE()
      WHERE coc_id=@id AND is_active=1
    `, [
      { name: 'vr', type: sql.NVarChar(sql.MAX), value: void_reason },
      { name: 'id', type: sql.Int,               value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'VOID', tableName: 'CertificateOfConformance', recordId: parseInt(req.params.id),
      moduleId: 'MOD-24', newValue: 'VOID' });
    res.json({ message: 'CoC voided.' });
  } catch (err) {
    console.error('[mod24/cocs void]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
