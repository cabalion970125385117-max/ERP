'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { result = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT tp.test_piece_id, tp.test_piece_ref, tp.test_piece_type, tp.serial_number,
             tp.check_date, tp.result, tp.standard_ref,
             p.full_name AS checked_by_name, rc.route_ref
      FROM dbo.TestPiece tp
      LEFT JOIN dbo.Personnel p ON p.personnel_id=tp.checked_by
      LEFT JOIN dbo.RouteCard rc ON rc.route_id=tp.route_id
      WHERE tp.is_active=1 AND (@result='' OR tp.result=@result)
      ORDER BY tp.check_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'result', type: sql.NVarChar(20), value: result },
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.TestPiece WHERE is_active=1 AND (@result='' OR result=@result)`,
      [{ name: 'result', type: sql.NVarChar(20), value: result }]);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const { test_piece_type, route_id, serial_number, check_date, checked_by,
            standard_ref, result, findings, corrective_action } = req.body;
    if (!checked_by || !result) return res.status(400).json({ message: 'checked_by and result required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod10Sequence SET last_num=last_num+1 WHERE seq_key='TEST_PIECE';
      SELECT last_num FROM dbo.Mod10Sequence WHERE seq_key='TEST_PIECE';
    `);
    const test_piece_ref = `TP-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const ins = await query(`
      INSERT INTO dbo.TestPiece (test_piece_ref,test_piece_type,route_id,serial_number,check_date,checked_by,standard_ref,result,findings,corrective_action)
      OUTPUT INSERTED.test_piece_id
      VALUES (@ref,@type,@rid,@sn,@cd,@cb,@std,@res,@find,@ca)
    `, [
      { name: 'ref',  type: sql.NVarChar(20),  value: test_piece_ref },
      { name: 'type', type: sql.NVarChar(30),  value: test_piece_type || 'TAM_PANEL' },
      { name: 'rid',  type: sql.Int,           value: route_id || null },
      { name: 'sn',   type: sql.NVarChar(100), value: serial_number || null },
      { name: 'cd',   type: sql.DateTime2,     value: check_date || null },
      { name: 'cb',   type: sql.Int,           value: parseInt(checked_by) },
      { name: 'std',  type: sql.NVarChar(100), value: standard_ref || null },
      { name: 'res',  type: sql.NVarChar(10),  value: result },
      { name: 'find', type: sql.NVarChar(sql.MAX), value: findings || null },
      { name: 'ca',   type: sql.NVarChar(sql.MAX), value: corrective_action || null },
    ]);
    const test_piece_id = ins[0].test_piece_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'TestPiece', recordId: test_piece_id, moduleId: 'MOD-10',
      newValue: JSON.stringify({ test_piece_ref, result }) });
    res.status(201).json({ test_piece_id, test_piece_ref, message: 'Test piece recorded.' });
  } catch (err) {
    console.error('[mod10/test-pieces POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
