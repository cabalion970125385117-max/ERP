'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { pass_fail = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT j.ext_job_id, j.ext_job_ref, j.submitted_date, j.expected_by, j.received_date,
             j.sample_desc, j.pass_fail, j.cert_number,
             l.lab_name, l.lab_code,
             u.full_name AS submitted_by_name
      FROM dbo.ExternalLabJob j
      JOIN dbo.ExternalLab l ON l.lab_id=j.lab_id
      JOIN dbo.Users u ON u.user_id=j.submitted_by
      WHERE j.is_active=1 AND (@pf='' OR j.pass_fail=@pf)
      ORDER BY j.submitted_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'pf',     type: sql.NVarChar(15), value: pass_fail },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.ExternalLabJob WHERE is_active=1 AND (@pf='' OR pass_fail=@pf)`,
      [{ name: 'pf', type: sql.NVarChar(15), value: pass_fail }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { lab_id, schedule_id, submitted_date, sample_desc, tests_requested, expected_by } = req.body;
    if (!lab_id || !sample_desc) return res.status(400).json({ message: 'lab_id and sample_desc required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod19Sequence SET last_num=last_num+1 WHERE seq_key='EXT_LAB_JOB';
      SELECT last_num FROM dbo.Mod19Sequence WHERE seq_key='EXT_LAB_JOB';
    `);
    const ext_job_ref = `ELJ-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.ExternalLabJob (ext_job_ref,lab_id,schedule_id,submitted_date,sample_desc,tests_requested,expected_by,submitted_by,pass_fail)
      OUTPUT INSERTED.ext_job_id
      VALUES (@ref,@lid,@sid,@sd,@desc,@tr,@eb,@uid,'PENDING')
    `, [
      { name: 'ref',  type: sql.NVarChar(20),  value: ext_job_ref },
      { name: 'lid',  type: sql.Int,           value: parseInt(lab_id) },
      { name: 'sid',  type: sql.Int,           value: schedule_id || null },
      { name: 'sd',   type: sql.Date,          value: submitted_date || null },
      { name: 'desc', type: sql.NVarChar(300), value: sample_desc },
      { name: 'tr',   type: sql.NVarChar(sql.MAX), value: tests_requested || null },
      { name: 'eb',   type: sql.Date,          value: expected_by || null },
      { name: 'uid',  type: sql.Int,           value: req.session.userId },
    ]);
    const ext_job_id = ins[0].ext_job_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'ExternalLabJob', recordId: ext_job_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ ext_job_ref }) });
    res.status(201).json({ ext_job_id, ext_job_ref, message: 'External lab job submitted.' });
  } catch (err) {
    console.error('[mod19/ext-lab-jobs POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/result', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { received_date, cert_number, result_summary, pass_fail } = req.body;
    const valid = ['PASS','FAIL','INCONCLUSIVE'];
    if (!valid.includes(pass_fail)) return res.status(400).json({ message: 'Invalid pass_fail.' });
    await query(`
      UPDATE dbo.ExternalLabJob
      SET received_date=@rd, cert_number=@cn, result_summary=@rs, pass_fail=@pf, updated_at=GETUTCDATE()
      WHERE ext_job_id=@id AND is_active=1
    `, [
      { name: 'rd', type: sql.Date,          value: received_date || null },
      { name: 'cn', type: sql.NVarChar(100), value: cert_number || null },
      { name: 'rs', type: sql.NVarChar(sql.MAX), value: result_summary || null },
      { name: 'pf', type: sql.NVarChar(15),  value: pass_fail },
      { name: 'id', type: sql.Int,           value: id },
    ]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `ELJ_RESULT_${pass_fail}`, tableName: 'ExternalLabJob', recordId: id, moduleId: 'MOD-19' });
    res.json({ message: 'External lab result recorded.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
