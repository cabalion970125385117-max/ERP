'use strict';
const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.get('/org-entities', async (req, res) => {
  try {
    const r = await query('SELECT * FROM OrgEntity WHERE is_active = 1 ORDER BY entity_name', []);
    res.json(r.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/org-entities', requireMinRole('ADMIN'), async (req, res) => {
  try {
    const { entity_name, division, department, team, parent_entity_id } = req.body;
    const r = await query(`
      INSERT INTO OrgEntity (entity_name, division, department, team, parent_entity_id)
      OUTPUT INSERTED.entity_id
      VALUES (@en, @div, @dept, @team, @pid)
    `, [
      { name: 'en', type: sql.NVarChar, value: entity_name },
      { name: 'div', type: sql.NVarChar, value: division || null },
      { name: 'dept', type: sql.NVarChar, value: department || null },
      { name: 'team', type: sql.NVarChar, value: team || null },
      { name: 'pid', type: sql.Int, value: parent_entity_id || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req), action: 'CREATE', tableName: 'OrgEntity', recordId: r.recordset[0].entity_id, moduleId: 'MOD-18', newValue: entity_name });
    res.status(201).json({ entity_id: r.recordset[0].entity_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
