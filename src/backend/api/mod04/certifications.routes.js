'use strict';

/**
 * MOD-04 NDT Certification Routes
 * GET  /api/v1/mod04/certifications              — list (with filters)
 * GET  /api/v1/mod04/certifications/:id          — single
 * POST /api/v1/mod04/certifications              — create (SUPERVISOR+)
 * PUT  /api/v1/mod04/certifications/:id          — update (SUPERVISOR+)
 * DELETE /api/v1/mod04/certifications/:id        — soft-delete (QA_MANAGER+)
 */

const express = require('express');
const router  = express.Router();
const { query, sql } = require('../../config/db');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);

/* ---- GET / ---- */
router.get('/', async (req, res) => {
  const { method, ndt_level, status, expiring_days } = req.query;
  let where = 'WHERE c.is_active = 1';
  const params = [];

  if (method)    { where += ' AND c.method = @method';         params.push({ name: 'method',    type: sql.NVarChar(5),  value: method }); }
  if (ndt_level) { where += ' AND c.ndt_level = @ndt_level';  params.push({ name: 'ndt_level', type: sql.NVarChar(5),  value: ndt_level }); }
  if (status)    { where += ' AND c.status = @status';         params.push({ name: 'status',    type: sql.NVarChar(10), value: status }); }
  if (expiring_days) {
    where += ' AND c.expiry_date BETWEEN GETDATE() AND DATEADD(DAY, @expdays, GETDATE())';
    params.push({ name: 'expdays', type: sql.Int, value: parseInt(expiring_days, 10) });
  }

  try {
    const rows = await query(`
      SELECT c.*,
        p.full_name AS personnel_name,
        p.employee_id,
        p.designation,
        DATEDIFF(DAY, GETUTCDATE(), c.expiry_date) AS days_until_expiry
      FROM dbo.NdtCertification c
      JOIN dbo.Personnel p ON p.personnel_id = c.personnel_id
      ${where}
      ORDER BY c.expiry_date, p.full_name
    `, params);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[certs/list]', err.message);
    res.status(500).json({ message: 'Error fetching certifications.' });
  }
});

/* ---- GET /:id ---- */
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT c.*, p.full_name AS personnel_name, p.employee_id,
        DATEDIFF(DAY, GETUTCDATE(), c.expiry_date) AS days_until_expiry
      FROM dbo.NdtCertification c
      JOIN dbo.Personnel p ON p.personnel_id = c.personnel_id
      WHERE c.cert_id = @id AND c.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: 'Certification not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[certs/get]', err.message);
    res.status(500).json({ message: 'Error fetching certification.' });
  }
});

/* ---- POST / ---- */
router.post('/', requireMinRole('SUPERVISOR'), async (req, res) => {
  const {
    personnel_id, method, ndt_level, cert_scheme, cert_number,
    issuing_authority, issue_date, expiry_date, notes,
  } = req.body;

  if (!personnel_id || !method || !ndt_level || !issue_date || !expiry_date) {
    return res.status(400).json({
      message: 'personnel_id, method, ndt_level, issue_date, expiry_date required.',
    });
  }

  const issueDt  = new Date(issue_date);
  const expiryDt = new Date(expiry_date);
  const visionDue = new Date(issueDt);
  visionDue.setFullYear(visionDue.getFullYear() + 1);

  try {
    const result = await query(`
      INSERT INTO dbo.NdtCertification
        (personnel_id, method, ndt_level, cert_scheme, cert_number,
         issuing_authority, issue_date, expiry_date, vision_exam_due, notes, created_by)
      OUTPUT INSERTED.cert_id
      VALUES (@pid, @method, @level, @scheme, @certno,
              @issuer, @issued, @expiry, @vision_due, @notes, @creator)
    `, [
      { name: 'pid',        type: sql.Int,           value: parseInt(personnel_id, 10) },
      { name: 'method',     type: sql.NVarChar(5),   value: method },
      { name: 'level',      type: sql.NVarChar(5),   value: ndt_level },
      { name: 'scheme',     type: sql.NVarChar(10),  value: cert_scheme || 'NAS410' },
      { name: 'certno',     type: sql.NVarChar(50),  value: cert_number || null },
      { name: 'issuer',     type: sql.NVarChar(100), value: issuing_authority || null },
      { name: 'issued',     type: sql.Date,          value: issueDt },
      { name: 'expiry',     type: sql.Date,          value: expiryDt },
      { name: 'vision_due', type: sql.Date,          value: visionDue },
      { name: 'notes',      type: sql.NVarChar(500), value: notes || null },
      { name: 'creator',    type: sql.Int,           value: req.user.userId },
    ]);
    const newId = result[0].cert_id;
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'INSERT', tableName: 'NdtCertification',
      recordId: String(newId), moduleId: 'MOD-04', newValue: req.body });
    res.status(201).json({ cert_id: newId, message: 'Certification recorded.' });
  } catch (err) {
    console.error('[certs/create]', err.message);
    res.status(500).json({ message: 'Error creating certification.' });
  }
});

/* ---- PUT /:id ---- */
router.put('/:id', requireMinRole('SUPERVISOR'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const {
    method, ndt_level, cert_scheme, cert_number,
    issuing_authority, issue_date, expiry_date, status, notes,
  } = req.body;
  try {
    await query(`
      UPDATE dbo.NdtCertification SET
        method            = @method,
        ndt_level         = @level,
        cert_scheme       = @scheme,
        cert_number       = @certno,
        issuing_authority = @issuer,
        issue_date        = @issued,
        expiry_date       = @expiry,
        status            = @status,
        notes             = @notes,
        updated_at        = GETUTCDATE()
      WHERE cert_id = @id AND is_active = 1
    `, [
      { name: 'id',      type: sql.Int,           value: id },
      { name: 'method',  type: sql.NVarChar(5),   value: method },
      { name: 'level',   type: sql.NVarChar(5),   value: ndt_level },
      { name: 'scheme',  type: sql.NVarChar(10),  value: cert_scheme || 'NAS410' },
      { name: 'certno',  type: sql.NVarChar(50),  value: cert_number || null },
      { name: 'issuer',  type: sql.NVarChar(100), value: issuing_authority || null },
      { name: 'issued',  type: sql.Date,          value: new Date(issue_date) },
      { name: 'expiry',  type: sql.Date,          value: new Date(expiry_date) },
      { name: 'status',  type: sql.NVarChar(10),  value: status || 'ACTIVE' },
      { name: 'notes',   type: sql.NVarChar(500), value: notes || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'UPDATE', tableName: 'NdtCertification',
      recordId: String(id), moduleId: 'MOD-04', newValue: req.body });
    res.json({ message: 'Certification updated.' });
  } catch (err) {
    console.error('[certs/update]', err.message);
    res.status(500).json({ message: 'Error updating certification.' });
  }
});

/* ---- DELETE /:id ---- */
router.delete('/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`UPDATE dbo.NdtCertification SET is_active = 0, updated_at = GETUTCDATE() WHERE cert_id = @id`,
      [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username,
      lanIp: getLanIp(req), action: 'SOFT_DELETE', tableName: 'NdtCertification',
      recordId: String(id), moduleId: 'MOD-04' });
    res.json({ message: 'Certification deactivated.' });
  } catch (err) {
    console.error('[certs/delete]', err.message);
    res.status(500).json({ message: 'Error deactivating certification.' });
  }
});

module.exports = router;
