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
      SELECT ar.result_id, ar.result_ref, ar.test_date, ar.result_value, ar.result_unit,
             ar.pass_fail, ar.out_of_spec,
             s.analysis_name, s.process_area,
             p.full_name AS tested_by_name
      FROM dbo.AnalysisResult ar
      JOIN dbo.AnalysisSchedule s ON s.schedule_id=ar.schedule_id
      LEFT JOIN dbo.Personnel p ON p.personnel_id=ar.tested_by
      WHERE ar.is_active=1 AND (@pf='' OR ar.pass_fail=@pf)
      ORDER BY ar.test_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'pf',     type: sql.NVarChar(15), value: pass_fail },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.AnalysisResult WHERE is_active=1 AND (@pf='' OR pass_fail=@pf)`,
      [{ name: 'pf', type: sql.NVarChar(15), value: pass_fail }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const { schedule_id, test_date, tested_by, external_cert_no, result_value,
            result_unit, pass_fail, corrective_action, result_notes } = req.body;
    if (!schedule_id || !pass_fail) return res.status(400).json({ message: 'schedule_id and pass_fail required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod19Sequence SET last_num=last_num+1 WHERE seq_key='ANALYSIS_RESULT';
      SELECT last_num FROM dbo.Mod19Sequence WHERE seq_key='ANALYSIS_RESULT';
    `);
    const result_ref = `AR-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;
    const out_of_spec = pass_fail === 'FAIL';

    const ins = await query(`
      INSERT INTO dbo.AnalysisResult (result_ref,schedule_id,test_date,tested_by,external_cert_no,
        result_value,result_unit,pass_fail,out_of_spec,corrective_action,result_notes)
      OUTPUT INSERTED.result_id
      VALUES (@ref,@sid,@td,@tb,@ecn,@rv,@ru,@pf,@oos,@ca,@notes)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: result_ref },
      { name: 'sid',   type: sql.Int,           value: parseInt(schedule_id) },
      { name: 'td',    type: sql.DateTime2,     value: test_date || null },
      { name: 'tb',    type: sql.Int,           value: tested_by || null },
      { name: 'ecn',   type: sql.NVarChar(100), value: external_cert_no || null },
      { name: 'rv',    type: sql.NVarChar(300), value: result_value || null },
      { name: 'ru',    type: sql.NVarChar(50),  value: result_unit || null },
      { name: 'pf',    type: sql.NVarChar(15),  value: pass_fail },
      { name: 'oos',   type: sql.Bit,           value: out_of_spec ? 1 : 0 },
      { name: 'ca',    type: sql.NVarChar(sql.MAX), value: corrective_action || null },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: result_notes || null },
    ]);

    // Update schedule last_done_date
    await query(`UPDATE dbo.AnalysisSchedule SET last_done_date=CAST(GETDATE() AS DATE), updated_at=GETUTCDATE() WHERE schedule_id=@sid`,
      [{ name: 'sid', type: sql.Int, value: parseInt(schedule_id) }]);

    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'AnalysisResult', recordId: ins[0].result_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ result_ref, pass_fail }) });
    res.status(201).json({ result_id: ins[0].result_id, result_ref, message: 'Analysis result recorded.' });
  } catch (err) {
    console.error('[mod19/analysis-results POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
