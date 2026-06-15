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
      SELECT lab_id, lab_code, lab_name, accreditation_body, accreditation_no,
             accreditation_expiry, scope_summary, contact_person, email,
             approved_status, last_audit_date, next_audit_date,
             DATEDIFF(day, GETDATE(), accreditation_expiry) AS days_to_expiry
      FROM dbo.ExternalLab
      WHERE is_active=1 AND (@status='' OR approved_status=@status)
      ORDER BY lab_name
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.ExternalLab WHERE is_active=1 AND (@status='' OR approved_status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const { lab_name, accreditation_body, accreditation_no, accreditation_expiry,
            scope_summary, contact_person, email, phone, address, approved_status, notes } = req.body;
    if (!lab_name) return res.status(400).json({ message: 'lab_name required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod19Sequence SET last_num=last_num+1 WHERE seq_key='EXTERNAL_LAB';
      SELECT last_num FROM dbo.Mod19Sequence WHERE seq_key='EXTERNAL_LAB';
    `);
    const lab_code = `ELAB-${String(seqRows[0].last_num).padStart(3,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.ExternalLab (lab_code,lab_name,accreditation_body,accreditation_no,accreditation_expiry,
        scope_summary,contact_person,email,phone,address,approved_status,notes,created_by)
      OUTPUT INSERTED.lab_id
      VALUES (@code,@name,@ab,@an,@ae,@scope,@con,@email,@phone,@addr,@status,@notes,@uid)
    `, [
      { name: 'code',   type: sql.NVarChar(20),  value: lab_code },
      { name: 'name',   type: sql.NVarChar(200), value: lab_name },
      { name: 'ab',     type: sql.NVarChar(100), value: accreditation_body || null },
      { name: 'an',     type: sql.NVarChar(100), value: accreditation_no || null },
      { name: 'ae',     type: sql.Date,          value: accreditation_expiry || null },
      { name: 'scope',  type: sql.NVarChar(500), value: scope_summary || null },
      { name: 'con',    type: sql.NVarChar(100), value: contact_person || null },
      { name: 'email',  type: sql.NVarChar(150), value: email || null },
      { name: 'phone',  type: sql.NVarChar(30),  value: phone || null },
      { name: 'addr',   type: sql.NVarChar(500), value: address || null },
      { name: 'status', type: sql.NVarChar(20),  value: approved_status || 'APPROVED' },
      { name: 'notes',  type: sql.NVarChar(sql.MAX), value: notes || null },
      { name: 'uid',    type: sql.Int,           value: req.session.userId },
    ]);
    const lab_id = ins[0].lab_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'ExternalLab', recordId: lab_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ lab_code, lab_name }) });
    res.status(201).json({ lab_id, lab_code, message: 'External lab registered.' });
  } catch (err) {
    console.error('[mod19/external-labs POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
