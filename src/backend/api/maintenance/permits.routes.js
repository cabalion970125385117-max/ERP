'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/permits', async (req, res) => {
  try {
    const { status } = req.query;
    let where = 'WHERE p.is_active = 1';
    const params = [];
    if (status) { where += ' AND p.status = @status'; params.push({ name: 'status', type: sql.NVarChar, value: status }); }
    const r = await query(`
      SELECT p.*, a.name AS asset_name, a.asset_code, u.full_name AS authorised_by_name
      FROM WorkPermit p
      JOIN MaintenanceAsset a ON a.asset_id = p.asset_id
      LEFT JOIN Users u ON u.user_id = p.authorised_by
      ${where} ORDER BY p.created_at DESC
    `, params);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/permits', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const { asset_id, hazard_type, description, safety_precautions, ppe_required } = req.body;
    const yr = new Date().getFullYear();
    await query('UPDATE Mod11Sequence SET last_num = CASE WHEN year = @yr THEN last_num + 1 ELSE 1 END, year = @yr', [{ name: 'yr', type: sql.Int, value: yr }]);
    const seq = await query('SELECT last_num FROM Mod11Sequence', []);
    const num = `WP-${yr}-${String(seq.recordset[0].last_num).padStart(4, '0')}`;
    const r = await query(`
      INSERT INTO WorkPermit (permit_number, asset_id, hazard_type, description, safety_precautions, ppe_required, created_by)
      OUTPUT INSERTED.permit_id
      VALUES (@num, @aid, @ht, @desc, @sp, @ppe, @uid)
    `, [
      { name: 'num', type: sql.NVarChar, value: num },
      { name: 'aid', type: sql.Int, value: asset_id },
      { name: 'ht', type: sql.NVarChar, value: hazard_type },
      { name: 'desc', type: sql.NVarChar, value: description },
      { name: 'sp', type: sql.NVarChar, value: safety_precautions || null },
      { name: 'ppe', type: sql.NVarChar, value: ppe_required || null },
      { name: 'uid', type: sql.Int, value: req.user.userId },
    ]);
    const id = r.recordset[0].permit_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'WorkPermit', recordId: id, moduleId: 'MOD-11', newValue: JSON.stringify({ num, hazard_type }) });
    res.status(201).json({ permit_id: id, permit_number: num });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/permits/:id/status', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const { status } = req.body;
    const setAuth = (status === 'ACTIVE') ? ', authorised_by = @uid, authorised_at = GETUTCDATE()' : '';
    await query(`UPDATE WorkPermit SET status = @status${setAuth}, updated_at = GETUTCDATE() WHERE permit_id = @id AND is_active = 1`, [
      { name: 'status', type: sql.NVarChar, value: status },
      { name: 'uid', type: sql.Int, value: req.user.userId },
      { name: 'id', type: sql.Int, value: +req.params.id },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'STATUS_CHANGE', tableName: 'WorkPermit', recordId: +req.params.id, moduleId: 'MOD-11', newValue: status });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
