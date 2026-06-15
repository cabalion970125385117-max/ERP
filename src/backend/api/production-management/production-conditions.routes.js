'use strict';

const express      = require('express');
const router       = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/database');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(`
      SELECT pc.condition_id, pc.condition_ref, pc.process_type, pc.process_spec,
             pc.check_date, pc.overall_ok,
             p.full_name AS checked_by_name,
             rc.route_ref
      FROM dbo.ProductionCondition pc
      LEFT JOIN dbo.Personnel p ON p.personnel_id=pc.checked_by
      LEFT JOIN dbo.RouteCard rc ON rc.route_id=pc.route_id
      WHERE pc.is_active=1
      ORDER BY pc.check_date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, [
      { name: 'offset', type: sql.Int, value: offset },
      { name: 'limit',  type: sql.Int, value: parseInt(limit) },
    ]);
    const total = await query(`SELECT COUNT(*) AS cnt FROM dbo.ProductionCondition WHERE is_active=1`);
    res.json({ items: rows, total: total[0].cnt });
  } catch (err) {
    res.status(500).json({ message: 'Error.' });
  }
});

router.post('/', requireAuth, requireMinRole('NDT_INSPECTOR'), async (req, res) => {
  try {
    const body = req.body;
    if (!body.checked_by || !body.process_spec) return res.status(400).json({ message: 'checked_by and process_spec required.' });

    const seqRows = await query(`
      UPDATE dbo.Mod10Sequence SET last_num=last_num+1 WHERE seq_key='PROD_CONDITION';
      SELECT last_num FROM dbo.Mod10Sequence WHERE seq_key='PROD_CONDITION';
    `);
    const condition_ref = `PC-${new Date().getFullYear()}-${String(seqRows[0].last_num).padStart(4,'0')}`;

    const allOk = [body.bath_temp_ok, body.uv_intensity_ok, body.ambient_light_ok,
                   body.current_ok, body.field_ok].filter(v => v !== null && v !== undefined);
    const overall_ok = allOk.length > 0 ? allOk.every(Boolean) : false;

    const ins = await query(`
      INSERT INTO dbo.ProductionCondition (condition_ref,route_id,process_type,process_spec,bath_id,
        checked_by,penetrant_type,penetrant_conc,bath_temp_c,bath_temp_ok,uv_intensity_fc,uv_intensity_ok,
        ambient_light_fc,ambient_light_ok,current_amps,current_ok,field_strength,field_ok,overall_ok,condition_notes)
      OUTPUT INSERTED.condition_id
      VALUES (@ref,@rid,@pt,@spec,@bid,@cb,@pent,@pc,@btc,@bto,@uv,@uvo,@al,@alo,@ca,@co,@fs,@fo,@ok,@notes)
    `, [
      { name: 'ref',   type: sql.NVarChar(20),  value: condition_ref },
      { name: 'rid',   type: sql.Int,           value: body.route_id || null },
      { name: 'pt',    type: sql.NVarChar(20),  value: body.process_type || 'FPI' },
      { name: 'spec',  type: sql.NVarChar(100), value: body.process_spec },
      { name: 'bid',   type: sql.Int,           value: body.bath_id || null },
      { name: 'cb',    type: sql.Int,           value: parseInt(body.checked_by) },
      { name: 'pent',  type: sql.NVarChar(50),  value: body.penetrant_type || null },
      { name: 'pc',    type: sql.Decimal(8,2),  value: body.penetrant_conc || null },
      { name: 'btc',   type: sql.Decimal(6,2),  value: body.bath_temp_c || null },
      { name: 'bto',   type: sql.Bit,           value: body.bath_temp_ok != null ? (body.bath_temp_ok ? 1 : 0) : null },
      { name: 'uv',    type: sql.Decimal(8,1),  value: body.uv_intensity_fc || null },
      { name: 'uvo',   type: sql.Bit,           value: body.uv_intensity_ok != null ? (body.uv_intensity_ok ? 1 : 0) : null },
      { name: 'al',    type: sql.Decimal(8,1),  value: body.ambient_light_fc || null },
      { name: 'alo',   type: sql.Bit,           value: body.ambient_light_ok != null ? (body.ambient_light_ok ? 1 : 0) : null },
      { name: 'ca',    type: sql.Decimal(8,2),  value: body.current_amps || null },
      { name: 'co',    type: sql.Bit,           value: body.current_ok != null ? (body.current_ok ? 1 : 0) : null },
      { name: 'fs',    type: sql.Decimal(8,2),  value: body.field_strength || null },
      { name: 'fo',    type: sql.Bit,           value: body.field_ok != null ? (body.field_ok ? 1 : 0) : null },
      { name: 'ok',    type: sql.Bit,           value: overall_ok ? 1 : 0 },
      { name: 'notes', type: sql.NVarChar(sql.MAX), value: body.condition_notes || null },
    ]);
    const condition_id = ins[0].condition_id;
    await auditLog({ userId: req.session.userId, username: req.session.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'ProductionCondition', recordId: condition_id, moduleId: 'MOD-10',
      newValue: JSON.stringify({ condition_ref, overall_ok }) });
    res.status(201).json({ condition_id, condition_ref, overall_ok, message: 'Production condition recorded.' });
  } catch (err) {
    console.error('[mod10/prod-conditions POST]', err.message);
    res.status(500).json({ message: 'Error.' });
  }
});

module.exports = router;
