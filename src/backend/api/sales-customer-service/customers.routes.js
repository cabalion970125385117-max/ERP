'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

// GET /api/v1/mod09/customers
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT c.customer_id, c.customer_code, c.company_name, c.contact_person,
             c.email, c.phone, c.customer_type, c.approved_vendor, c.is_active,
             (SELECT COUNT(*) FROM dbo.Quotation q WHERE q.customer_id=c.customer_id AND q.is_active=1) AS quotation_count
      FROM dbo.Customer c
      WHERE c.is_active=1
        AND (@search='' OR c.company_name LIKE '%'+@search+'%' OR c.customer_code LIKE '%'+@search+'%')
      ORDER BY c.company_name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'search', type: sql.NVarChar(200), value: search },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`
      SELECT COUNT(*) AS cnt FROM dbo.Customer
      WHERE is_active=1 AND (@search='' OR company_name LIKE '%'+@search+'%' OR customer_code LIKE '%'+@search+'%')
    `, [{ name: 'search', type: sql.NVarChar(200), value: search }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    console.error('[mod09/customers GET]', err.message);
    res.status(500).json({ message: 'Error fetching customers.' });
  }
});

// GET /api/v1/mod09/customers/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM dbo.Customer WHERE customer_id=@id AND is_active=1`,
      [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!rows.length) return res.status(404).json({ message: 'Customer not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

// POST /api/v1/mod09/customers
router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, address, customer_type, industry, credit_limit, credit_terms_days, notes } = req.body;
    if (!company_name) return res.status(400).json({ message: 'company_name required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod09Sequence SET last_num=last_num+1 WHERE seq_key='CUSTOMER';
      SELECT last_num FROM dbo.Mod09Sequence WHERE seq_key='CUSTOMER';
    `);
    const num = seqRows[0].last_num;
    const customer_code = `CUST-${String(num).padStart(4, '0')}`;

    const ins = await query(`
      INSERT INTO dbo.Customer (customer_code,company_name,contact_person,email,phone,address,customer_type,industry,credit_limit,credit_terms_days,notes,created_by)
      OUTPUT INSERTED.customer_id
      VALUES (@code,@name,@contact,@email,@phone,@addr,@type,@industry,@credit,@terms,@notes,@uid)
    `, [
      { name: 'code',     type: sql.NVarChar(20),  value: customer_code },
      { name: 'name',     type: sql.NVarChar(200), value: company_name },
      { name: 'contact',  type: sql.NVarChar(100), value: contact_person || null },
      { name: 'email',    type: sql.NVarChar(150), value: email || null },
      { name: 'phone',    type: sql.NVarChar(30),  value: phone || null },
      { name: 'addr',     type: sql.NVarChar(500), value: address || null },
      { name: 'type',     type: sql.NVarChar(20),  value: customer_type || 'REGULAR' },
      { name: 'industry', type: sql.NVarChar(100), value: industry || null },
      { name: 'credit',   type: sql.Decimal(14,2), value: credit_limit || null },
      { name: 'terms',    type: sql.Int,           value: credit_terms_days || 30 },
      { name: 'notes',    type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'uid',      type: sql.Int,           value: req.session.userId },
    ]);
    const customer_id = ins[0].customer_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'Customer', recordId: customer_id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ customer_code, company_name }) });
    res.status(201).json({ customer_id, customer_code, message: 'Customer created.' });
  } catch (err) {
    console.error('[mod09/customers POST]', err.message);
    res.status(500).json({ message: 'Error creating customer.' });
  }
});

// PUT /api/v1/mod09/customers/:id
router.put('/:id', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { company_name, contact_person, email, phone, address, customer_type, industry, approved_vendor, credit_limit, credit_terms_days, notes } = req.body;
    await query(`
      UPDATE dbo.Customer
      SET company_name=@name, contact_person=@contact, email=@email, phone=@phone,
          address=@addr, customer_type=@type, industry=@industry, approved_vendor=@av,
          credit_limit=@credit, credit_terms_days=@terms, notes=@notes, updated_at=GETUTCDATE()
      WHERE customer_id=@id AND is_active=1
    `, [
      { name: 'name',    type: sql.NVarChar(200), value: company_name },
      { name: 'contact', type: sql.NVarChar(100), value: contact_person || null },
      { name: 'email',   type: sql.NVarChar(150), value: email || null },
      { name: 'phone',   type: sql.NVarChar(30),  value: phone || null },
      { name: 'addr',    type: sql.NVarChar(500), value: address || null },
      { name: 'type',    type: sql.NVarChar(20),  value: customer_type || 'REGULAR' },
      { name: 'industry',type: sql.NVarChar(100), value: industry || null },
      { name: 'av',      type: sql.Bit,           value: approved_vendor ? 1 : 0 },
      { name: 'credit',  type: sql.Decimal(14,2), value: credit_limit || null },
      { name: 'terms',   type: sql.Int,           value: credit_terms_days || 30 },
      { name: 'notes',   type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'id',      type: sql.Int,           value: id },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'Customer', recordId: id, moduleId: 'MOD-09',
      newValue: JSON.stringify({ company_name }) });
    res.json({ message: 'Customer updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating customer.' });
  }
});

// DELETE /api/v1/mod09/customers/:id (soft)
router.delete('/:id', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query(`UPDATE dbo.Customer SET is_active=0, updated_at=GETUTCDATE() WHERE customer_id=@id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'DELETE', tableName: 'Customer', recordId: id, moduleId: 'MOD-09' });
    res.json({ message: 'Customer deactivated.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
