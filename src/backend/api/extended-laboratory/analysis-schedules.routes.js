'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { overdue = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const overdueFilter = overdue === '1' ? 'AND s.next_due_date < GETDATE()' : '';
    const rows = await query(`
      SELECT s.schedule_id, s.schedule_ref, s.analysis_name, s.analysis_type, s.process_area,
             s.frequency_type, s.next_due_date, s.last_done_date, s.external_lab, s.external_lab_name,
             s.acceptance_criteria, s.is_active,
             p.full_name AS responsible_name,
             DATEDIFF(day, GETDATE(), s.next_due_date) AS days_to_due
      FROM dbo.AnalysisSchedule s
      LEFT JOIN dbo.Personnel p ON p.personnel_id=s.responsible_id
      WHERE s.is_active=1 ${overdueFilter}
      ORDER BY s.next_due_date ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.AnalysisSchedule WHERE is_active=1 ${overdueFilter}`);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    console.error('[mod19/analysis-schedules GET]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { analysis_name, analysis_type, process_area, bath_id, frequency_type,
            frequency_days, next_due_date, responsible_id, method_ref,
            acceptance_criteria, external_lab, external_lab_name } = req.body;
    if (!analysis_name) return res.status(400).json({ message: 'analysis_name required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod19Sequence SET last_num=last_num+1 WHERE seq_key='ANALYSIS_SCHEDULE';
      SELECT last_num FROM dbo.Mod19Sequence WHERE seq_key='ANALYSIS_SCHEDULE';
    `);
    const schedule_ref = `AS-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.AnalysisSchedule (schedule_ref,analysis_name,analysis_type,process_area,bath_id,
        frequency_type,frequency_days,next_due_date,responsible_id,method_ref,
        acceptance_criteria,external_lab,external_lab_name,created_by)
      OUTPUT INSERTED.schedule_id
      VALUES (@ref,@name,@type,@pa,@bid,@freq,@fd,@nd,@resp,@mref,@ac,@el,@eln,@uid)
    `, [
      { name: 'ref',  type: sql.NVarChar(20),  value: schedule_ref },
      { name: 'name', type: sql.NVarChar(200), value: analysis_name },
      { name: 'type', type: sql.NVarChar(30),  value: analysis_type || 'CHEMICAL' },
      { name: 'pa',   type: sql.NVarChar(50),  value: process_area || null },
      { name: 'bid',  type: sql.Int,           value: bath_id || null },
      { name: 'freq', type: sql.NVarChar(20),  value: frequency_type || 'WEEKLY' },
      { name: 'fd',   type: sql.Int,           value: frequency_days || null },
      { name: 'nd',   type: sql.Date,          value: next_due_date || null },
      { name: 'resp', type: sql.Int,           value: responsible_id || null },
      { name: 'mref', type: sql.NVarChar(100), value: method_ref || null },
      { name: 'ac',   type: sql.NVarChar(300), value: acceptance_criteria || null },
      { name: 'el',   type: sql.Bit,           value: external_lab ? 1 : 0 },
      { name: 'eln',  type: sql.NVarChar(200), value: external_lab_name || null },
      { name: 'uid',  type: sql.Int,           value: req.session.userId },
    ]);
    const schedule_id = ins[0].schedule_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'AnalysisSchedule', recordId: schedule_id, moduleId: 'MOD-19',
      newValue: JSON.stringify({ schedule_ref, analysis_name }) });
    res.status(201).json({ schedule_id, schedule_ref, message: 'Analysis schedule created.' });
  } catch (err) {
    console.error('[mod19/analysis-schedules POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
