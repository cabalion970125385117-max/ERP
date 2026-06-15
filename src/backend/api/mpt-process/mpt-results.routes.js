'use strict';
const router  = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// POST /api/v1/mod17/results  — record final result and set job status
router.post('/', requireMinRole('SUPERVISOR'), async (req, res) => {
  const { mpt_job_id, overall_result, acceptance_criteria, number_of_parts_accepted,
          number_of_parts_rejected, findings_summary } = req.body;
  if (!mpt_job_id || !overall_result) {
    return res.status(400).json({ message: 'mpt_job_id and overall_result required.' });
  }
  try {
    const result = await query(`
      INSERT INTO dbo.MptResult
        (mpt_job_id, overall_result, acceptance_criteria, number_of_parts_accepted,
         number_of_parts_rejected, findings_summary, reviewed_by_id, reviewed_at, created_by)
      OUTPUT INSERTED.result_id
      VALUES (@jid,@res,@ac,@npa,@npr,@fs,@rev,GETUTCDATE(),@by)
    `, [
      { name: 'jid',  type: sql.Int,               value: parseInt(mpt_job_id) },
      { name: 'res',  type: sql.NVarChar(10),       value: overall_result },
      { name: 'ac',   type: sql.NVarChar(200),      value: acceptance_criteria || null },
      { name: 'npa',  type: sql.Int,                value: number_of_parts_accepted || null },
      { name: 'npr',  type: sql.Int,                value: number_of_parts_rejected || null },
      { name: 'fs',   type: sql.NVarChar(sql.MAX),  value: findings_summary || null },
      { name: 'rev',  type: sql.Int,                value: req.user.userId },
      { name: 'by',   type: sql.Int,                value: req.user.userId },
    ]);

    const finalStatus = overall_result === 'ACCEPT' ? 'ACCEPTED' : overall_result === 'REJECT' ? 'REJECTED' : 'ACCEPTED';
    await query(`
      UPDATE dbo.MptJob SET status=@s, disposition=@d, updated_at=GETUTCDATE()
      WHERE mpt_job_id=@jid
    `, [
      { name: 's',   type: sql.NVarChar(20), value: finalStatus },
      { name: 'd',   type: sql.NVarChar(20), value: overall_result },
      { name: 'jid', type: sql.Int,          value: parseInt(mpt_job_id) },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE_RESULT', tableName: 'MptResult', recordId: result[0].result_id,
      moduleId: 'MOD-17', newValue: overall_result });
    res.status(201).json({ result_id: result[0].result_id });
  } catch (err) {
    console.error('[mod17/results POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
