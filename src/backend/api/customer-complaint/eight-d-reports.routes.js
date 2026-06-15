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
      SELECT r.report_id, r.report_ref, r.overall_status, r.complaint_id,
             cc.complaint_ref, cc.subject, cc.severity, cc.customer_name,
             r.d1_completed, r.d2_completed, r.d3_completed, r.d4_completed,
             r.d5_completed, r.d6_completed, r.d7_completed, r.d8_completed,
             u.full_name AS created_by_name
      FROM dbo.EightDReport r
      JOIN dbo.CustomerComplaint cc ON cc.complaint_id=r.complaint_id
      JOIN dbo.Users u ON u.user_id=r.created_by
      WHERE r.is_active=1 AND (@status='' OR r.overall_status=@status)
      ORDER BY r.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'status', type: sql.NVarChar(20), value: status },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.EightDReport WHERE is_active=1 AND (@status='' OR overall_status=@status)`,
      [{ name: 'status', type: sql.NVarChar(20), value: status }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await query(`
      SELECT r.*, cc.complaint_ref, cc.subject, cc.severity, cc.customer_name,
             u.full_name AS created_by_name, a.full_name AS approved_by_name
      FROM dbo.EightDReport r
      JOIN dbo.CustomerComplaint cc ON cc.complaint_id=r.complaint_id
      JOIN dbo.Users u ON u.user_id=r.created_by
      LEFT JOIN dbo.Users a ON a.user_id=r.approved_by
      WHERE r.report_id=@id AND r.is_active=1
    `, [{ name: 'id', type: sql.Int, value: id }]);
    if (!rows.length) return res.status(404).json({ message: '8D Report not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { complaint_id, d1_team_leader, d1_team_members } = req.body;
    if (!complaint_id) return res.status(400).json({ message: 'complaint_id required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod20Sequence SET last_num=last_num+1 WHERE seq_key='8D_REPORT';
      SELECT last_num FROM dbo.Mod20Sequence WHERE seq_key='8D_REPORT';
    `);
    const report_ref = `8D-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.EightDReport (report_ref,complaint_id,d1_team_leader,d1_team_members,created_by)
      OUTPUT INSERTED.report_id
      VALUES (@ref,@cid,@tl,@tm,@uid)
    `, [
      { name: 'ref', type: sql.NVarChar(20),  value: report_ref },
      { name: 'cid', type: sql.Int,           value: parseInt(complaint_id) },
      { name: 'tl',  type: sql.NVarChar(100), value: d1_team_leader || null },
      { name: 'tm',  type: sql.NVarChar(sql.MAX), value: d1_team_members || null },
      { name: 'uid', type: sql.Int,           value: req.session.userId },
    ]);
    const report_id = ins[0].report_id;
    await query(`UPDATE dbo.CustomerComplaint SET status='8D_IN_PROGRESS', updated_at=GETUTCDATE() WHERE complaint_id=@id`,
      [{ name: 'id', type: sql.Int, value: parseInt(complaint_id) }]);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'EightDReport', recordId: report_id, moduleId: 'MOD-20',
      newValue: JSON.stringify({ report_ref, complaint_id }) });
    res.status(201).json({ report_id, report_ref, message: '8D Report opened.' });
  } catch (err) {
    console.error('[mod20/8d POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

// PATCH /:id/d/:step — update a specific discipline
router.patch('/:id/d/:step', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const step = parseInt(req.params.step);
    if (step < 1 || step > 8) return res.status(400).json({ message: 'Invalid step (1-8).' });

    const fieldMap = {
      1: ['d1_team_leader','d1_team_members'],
      2: ['d2_problem_stmt','d2_is_what','d2_is_not_what'],
      3: ['d3_containment','d3_effectiveness'],
      4: ['d4_root_cause','d4_method'],
      5: ['d5_actions','d5_responsible','d5_target_date'],
      6: ['d6_implementation','d6_validation'],
      7: ['d7_systemic_actions','d7_procedures_updated','d7_training_done'],
      8: ['d8_lessons_learned','d8_team_recognition'],
    };

    // Build dynamic SET
    const setClauses = [];
    const params = [{ name: 'id', type: sql.Int, value: id }];
    const body = req.body;
    for (const field of (fieldMap[step] || [])) {
      if (body[field] !== undefined) {
        setClauses.push(`${field}=@${field}`);
        const isBit = ['d7_procedures_updated','d7_training_done'].includes(field);
        const isDate = field === 'd5_target_date';
        params.push({
          name: field,
          type: isBit ? sql.Bit : isDate ? sql.Date : sql.NVarChar(sql.MAX),
          value: isBit ? (body[field] ? 1 : 0) : body[field],
        });
      }
    }
    const doneKey = `d${step}_completed`;
    setClauses.push(`${doneKey}=@done`);
    params.push({ name: 'done', type: sql.Bit, value: body.completed ? 1 : 0 });
    if (body.completed) {
      setClauses.push(`d${step}_date=CAST(GETUTCDATE() AS DATE)`);
    }
    setClauses.push('updated_at=GETUTCDATE()');

    // Recalc overall_status
    let overallStatus = 'IN_PROGRESS';
    if (step === 8 && body.completed) overallStatus = 'PENDING_APPROVAL';

    setClauses.push('overall_status=@os');
    params.push({ name: 'os', type: sql.NVarChar(20), value: overallStatus });

    await query(`UPDATE dbo.EightDReport SET ${setClauses.join(',')} WHERE report_id=@id AND is_active=1`, params);
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: `8D_D${step}_UPDATE`, tableName: 'EightDReport', recordId: id, moduleId: 'MOD-20' });
    res.json({ message: `D${step} updated.` });
  } catch (err) {
    console.error('[mod20/8d PATCH D]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

router.patch('/:id/approve', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query(`
      UPDATE dbo.EightDReport
      SET overall_status='APPROVED', approved_by=@uid, approved_at=GETUTCDATE(), updated_at=GETUTCDATE()
      WHERE report_id=@id AND is_active=1
    `, [
      { name: 'uid', type: sql.Int, value: req.session.userId },
      { name: 'id',  type: sql.Int, value: id },
    ]);
    // Close the linked complaint
    const rpt = await query(`SELECT complaint_id FROM dbo.EightDReport WHERE report_id=@id`, [{ name: 'id', type: sql.Int, value: id }]);
    if (rpt.length) {
      await query(`UPDATE dbo.CustomerComplaint SET status='CLOSED', closed_date=CAST(GETUTCDATE() AS DATE), updated_at=GETUTCDATE() WHERE complaint_id=@cid`,
        [{ name: 'cid', type: sql.Int, value: rpt[0].complaint_id }]);
    }
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: '8D_APPROVED', tableName: 'EightDReport', recordId: id, moduleId: 'MOD-20' });
    res.json({ message: '8D Report approved and complaint closed.' });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
