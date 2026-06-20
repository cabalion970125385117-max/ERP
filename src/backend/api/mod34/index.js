'use strict';
const router  = require('express').Router();
const sql     = require('mssql');
const { requireAuth, requireMinRole, auditLog } = require('../../middleware/auth');

router.use(requireAuth);

// ── Alerts Summary ────────────────────────────────────────────
router.get('/alerts/summary', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const r = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM ChemicalSDS    WHERE status='ACTIVE')                         AS sds_active,
        (SELECT COUNT(*) FROM vw_SDSExpiry   WHERE expiry_rag IN ('OVERDUE','DUE_SOON'))    AS sds_expiring_30d,
        (SELECT COUNT(*) FROM ChemicalSDS    WHERE is_controlled=1 AND status='ACTIVE')     AS controlled_substances,
        (SELECT COUNT(*) FROM BathReplenishment WHERE status IN ('PENDING','IN_PROGRESS'))  AS replenishment_pending,
        (SELECT COUNT(*) FROM EscalationRule WHERE is_active=1)                             AS escalation_rules_active,
        (SELECT COUNT(*) FROM EscalationLog  WHERE acknowledged_at IS NULL
                                             AND triggered_at > DATEADD(DAY,-1,GETDATE())) AS unacknowledged_alerts,
        (SELECT COUNT(*) FROM ChemicalInventory
          WHERE quantity <= min_stock_kg AND is_active=1)                                   AS low_stock_chemicals,
        (SELECT COUNT(*) FROM ChemicalSDS WHERE status='ACTIVE')                            AS total
    `);
    res.json(r.recordset[0]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── SDS Register ──────────────────────────────────────────────
router.get('/sds', async (req, res) => {
  try {
    const pool   = req.app.locals.db;
    const { hazard_class, is_controlled, status } = req.query;
    const conditions = [];
    const params     = [];
    if (hazard_class) {
      conditions.push('s.hazard_class = @hc');
      params.push({ name: 'hc', type: sql.NVarChar, value: hazard_class });
    }
    if (is_controlled !== undefined) {
      conditions.push('s.is_controlled = @ctrl');
      params.push({ name: 'ctrl', type: sql.Bit, value: parseInt(is_controlled) });
    }
    const statusVal = status || 'ACTIVE';
    conditions.push('s.status = @st');
    params.push({ name: 'st', type: sql.NVarChar, value: statusVal });

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const req2  = pool.request();
    params.forEach(p => req2.input(p.name, p.type, p.value));
    const result = await req2.query(`
      SELECT s.*, v.days_to_expiry, v.expiry_rag
      FROM ChemicalSDS s
      LEFT JOIN vw_SDSExpiry v ON s.sds_id = v.sds_id
      ${where}
      ORDER BY s.is_controlled DESC, s.chemical_name
    `);
    res.json(result.recordset);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/sds', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const {
      chemical_name, common_name, un_number, cas_number, hazard_class,
      supplier, sds_version, issue_date, expiry_date, review_interval_months,
      is_controlled, special_handling, ppe_required,
      storage_conditions, disposal_method
    } = req.body;
    if (!chemical_name || !hazard_class) {
      return res.status(400).json({ message: 'chemical_name and hazard_class required' });
    }
    const r = await pool.request()
      .input('nm',  sql.NVarChar, chemical_name)
      .input('cn',  sql.NVarChar, common_name || null)
      .input('un',  sql.NVarChar, un_number || null)
      .input('cas', sql.NVarChar, cas_number || null)
      .input('hc',  sql.NVarChar, hazard_class)
      .input('sup', sql.NVarChar, supplier || null)
      .input('ver', sql.NVarChar, sds_version || null)
      .input('iss', sql.Date,     issue_date || null)
      .input('exp', sql.Date,     expiry_date || null)
      .input('ri',  sql.Int,      review_interval_months || 12)
      .input('ctrl',sql.Bit,      is_controlled ? 1 : 0)
      .input('sh',  sql.NVarChar, special_handling || null)
      .input('ppe', sql.NVarChar, ppe_required || null)
      .input('sc',  sql.NVarChar, storage_conditions || null)
      .input('dm',  sql.NVarChar, disposal_method || null)
      .input('uid', sql.Int,      req.session.user.id)
      .query(`
        INSERT INTO ChemicalSDS
          (chemical_name, common_name, un_number, cas_number, hazard_class,
           supplier, sds_version, issue_date, expiry_date, review_interval_months,
           is_controlled, special_handling, ppe_required, storage_conditions,
           disposal_method, created_by)
        OUTPUT INSERTED.sds_id
        VALUES (@nm,@cn,@un,@cas,@hc,@sup,@ver,@iss,@exp,@ri,@ctrl,@sh,@ppe,@sc,@dm,@uid)
      `);
    const sds_id = r.recordset[0].sds_id;
    await auditLog(req, { action: 'CREATE_SDS', tableName: 'ChemicalSDS', recordId: sds_id, moduleId: 'MOD34', newValue: { chemical_name } });
    res.status(201).json({ ok: true, sds_id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/sds/:id', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const [sds, inventory] = await Promise.all([
      pool.request().input('id', sql.Int, parseInt(req.params.id)).query(`
        SELECT s.*, v.days_to_expiry, v.expiry_rag
        FROM ChemicalSDS s
        LEFT JOIN vw_SDSExpiry v ON s.sds_id = v.sds_id
        WHERE s.sds_id = @id`),
      pool.request().input('id', sql.Int, parseInt(req.params.id)).query(`
        SELECT * FROM ChemicalInventory WHERE sds_id=@id AND is_active=1`)
    ]);
    if (!sds.recordset.length) return res.status(404).json({ message: 'SDS not found' });
    res.json({ ...sds.recordset[0], inventory: inventory.recordset });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/sds/:id', requireMinRole('ENGINEER'), async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { sds_version, issue_date, expiry_date, status, supplier,
            special_handling, ppe_required, storage_conditions, disposal_method } = req.body;
    await pool.request()
      .input('id',  sql.Int,      parseInt(req.params.id))
      .input('ver', sql.NVarChar, sds_version || null)
      .input('iss', sql.Date,     issue_date || null)
      .input('exp', sql.Date,     expiry_date || null)
      .input('st',  sql.NVarChar, status || 'ACTIVE')
      .input('sup', sql.NVarChar, supplier || null)
      .input('sh',  sql.NVarChar, special_handling || null)
      .input('ppe', sql.NVarChar, ppe_required || null)
      .input('sc',  sql.NVarChar, storage_conditions || null)
      .input('dm',  sql.NVarChar, disposal_method || null)
      .query(`
        UPDATE ChemicalSDS SET
          sds_version=@ver, issue_date=@iss, expiry_date=@exp, status=@st,
          supplier=@sup, special_handling=@sh, ppe_required=@ppe,
          storage_conditions=@sc, disposal_method=@dm, updated_at=GETDATE()
        WHERE sds_id=@id`);
    await auditLog(req, { action: 'UPDATE_SDS', tableName: 'ChemicalSDS', recordId: parseInt(req.params.id), moduleId: 'MOD34' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Chemical Inventory ────────────────────────────────────────
router.get('/inventory', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const r = await pool.request().query(`
      SELECT i.*, s.chemical_name, s.hazard_class, s.is_controlled, s.un_number,
             CASE WHEN i.quantity <= i.min_stock_kg THEN 'LOW' ELSE 'OK' END AS stock_rag,
             CASE WHEN i.expiry_date < GETDATE() THEN 'EXPIRED'
                  WHEN i.expiry_date < DATEADD(DAY,30,GETDATE()) THEN 'EXPIRING' ELSE 'OK' END AS inv_expiry_rag
      FROM ChemicalInventory i
      JOIN ChemicalSDS s ON i.sds_id = s.sds_id
      WHERE i.is_active=1
      ORDER BY s.is_controlled DESC, s.chemical_name
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/inventory', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { sds_id, location, quantity, quantity_unit, batch_number, received_date, expiry_date, min_stock_kg, notes } = req.body;
    if (!sds_id || !location) return res.status(400).json({ message: 'sds_id and location required' });
    const r = await pool.request()
      .input('sid',  sql.Int,      parseInt(sds_id))
      .input('loc',  sql.NVarChar, location)
      .input('qty',  sql.Decimal,  quantity || 0)
      .input('unit', sql.NVarChar, quantity_unit || 'kg')
      .input('bn',   sql.NVarChar, batch_number || null)
      .input('rd',   sql.Date,     received_date || null)
      .input('ed',   sql.Date,     expiry_date || null)
      .input('min',  sql.Decimal,  min_stock_kg || 0)
      .input('n',    sql.NVarChar, notes || null)
      .query(`INSERT INTO ChemicalInventory (sds_id,location,quantity,quantity_unit,batch_number,received_date,expiry_date,min_stock_kg,notes)
              OUTPUT INSERTED.inventory_id
              VALUES (@sid,@loc,@qty,@unit,@bn,@rd,@ed,@min,@n)`);
    await auditLog(req, { action: 'ADD_INVENTORY', tableName: 'ChemicalInventory', recordId: r.recordset[0].inventory_id, moduleId: 'MOD34', newValue: { sds_id, location, quantity } });
    res.status(201).json({ ok: true, inventory_id: r.recordset[0].inventory_id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Bath Make-up Formulas ─────────────────────────────────────
router.get('/formulas', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { bath_type } = req.query;
    const r = await pool.request()
      .input('bt', sql.NVarChar, bath_type || null)
      .query(`
        SELECT f.*, s.chemical_name AS sds_chemical_name, s.hazard_class, s.is_controlled
        FROM BathMakeupFormula f
        LEFT JOIN ChemicalSDS s ON f.sds_id = s.sds_id
        WHERE f.is_active=1 AND (@bt IS NULL OR f.bath_type_code=@bt)
        ORDER BY f.bath_type_code, f.add_sequence
      `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Bath Replenishment ────────────────────────────────────────
router.get('/replenishment', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const r = await pool.request().query(`
      SELECT * FROM vw_ReplenishmentQueue
      WHERE status IN ('PENDING','IN_PROGRESS')
      ORDER BY initiated_at
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/replenishment', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { bath_id, sds_id, trigger_type, param_name,
            current_value, target_value, quantity_to_add, add_unit, notes } = req.body;
    if (!sds_id) return res.status(400).json({ message: 'sds_id required' });
    const r = await pool.request()
      .input('bid',  sql.Int,      bath_id ? parseInt(bath_id) : null)
      .input('sid',  sql.Int,      parseInt(sds_id))
      .input('tt',   sql.NVarChar, trigger_type || 'MANUAL')
      .input('pn',   sql.NVarChar, param_name || null)
      .input('cv',   sql.Decimal,  current_value || null)
      .input('tv',   sql.Decimal,  target_value || null)
      .input('qa',   sql.Decimal,  quantity_to_add || 0)
      .input('au',   sql.NVarChar, add_unit || 'kg')
      .input('n',    sql.NVarChar, notes || null)
      .input('by',   sql.Int,      req.session.user.id)
      .query(`INSERT INTO BathReplenishment
                (bath_id,sds_id,trigger_type,param_name,current_value,target_value,quantity_to_add,add_unit,notes,initiated_by)
              OUTPUT INSERTED.replenishment_id
              VALUES (@bid,@sid,@tt,@pn,@cv,@tv,@qa,@au,@n,@by)`);
    const id = r.recordset[0].replenishment_id;
    await auditLog(req, { action: 'CREATE_REPLENISHMENT', tableName: 'BathReplenishment', recordId: id, moduleId: 'MOD34' });
    res.status(201).json({ ok: true, replenishment_id: id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/replenishment/:id', requireMinRole('SUPERVISOR'), async (req, res) => {
  try {
    const pool   = req.app.locals.db;
    const { status, notes } = req.body;
    const userId = req.session.user.id;
    await pool.request()
      .input('id',  sql.Int,      parseInt(req.params.id))
      .input('st',  sql.NVarChar, status)
      .input('n',   sql.NVarChar, notes || null)
      .input('by',  sql.Int,      status === 'COMPLETED' ? userId : null)
      .input('at',  sql.DateTime2,status === 'COMPLETED' ? new Date() : null)
      .query(`UPDATE BathReplenishment SET
                status=@st, notes=COALESCE(@n,notes),
                completed_by=COALESCE(@by,completed_by),
                completed_at=COALESCE(@at,completed_at)
              WHERE replenishment_id=@id`);
    await auditLog(req, { action: 'UPDATE_REPLENISHMENT', tableName: 'BathReplenishment', recordId: parseInt(req.params.id), moduleId: 'MOD34', newValue: { status } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Escalation Rules ──────────────────────────────────────────
router.get('/escalation/rules', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const r = await pool.request().query(`
      SELECT * FROM EscalationRule ORDER BY level DESC, module_id, rule_name
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/escalation/rules', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { rule_name, module_id, alert_field, threshold_value, operator,
            level, notify_roles, escalation_delay_hours, message_template } = req.body;
    if (!rule_name || !module_id || !alert_field) {
      return res.status(400).json({ message: 'rule_name, module_id, alert_field required' });
    }
    const r = await pool.request()
      .input('nm',  sql.NVarChar, rule_name)
      .input('mid', sql.NVarChar, module_id)
      .input('af',  sql.NVarChar, alert_field)
      .input('tv',  sql.Decimal,  threshold_value || 0)
      .input('op',  sql.NVarChar, operator || 'GT')
      .input('lv',  sql.NVarChar, level || 'WARNING')
      .input('nr',  sql.NVarChar, notify_roles || null)
      .input('dh',  sql.Int,      escalation_delay_hours || 0)
      .input('mt',  sql.NVarChar, message_template || null)
      .input('uid', sql.Int,      req.session.user.id)
      .query(`INSERT INTO EscalationRule
                (rule_name,module_id,alert_field,threshold_value,operator,level,notify_roles,escalation_delay_hours,message_template,created_by)
              OUTPUT INSERTED.rule_id
              VALUES (@nm,@mid,@af,@tv,@op,@lv,@nr,@dh,@mt,@uid)`);
    const rule_id = r.recordset[0].rule_id;
    await auditLog(req, { action: 'CREATE_ESCALATION_RULE', tableName: 'EscalationRule', recordId: rule_id, moduleId: 'MOD34', newValue: { rule_name, level } });
    res.status(201).json({ ok: true, rule_id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/escalation/rules/:id', requireMinRole('QA_MANAGER'), async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const { is_active, threshold_value, level, notify_roles, escalation_delay_hours } = req.body;
    await pool.request()
      .input('id',  sql.Int,     parseInt(req.params.id))
      .input('act', sql.Bit,     is_active !== undefined ? (is_active ? 1 : 0) : null)
      .input('tv',  sql.Decimal, threshold_value !== undefined ? threshold_value : null)
      .input('lv',  sql.NVarChar,level || null)
      .input('nr',  sql.NVarChar,notify_roles || null)
      .input('dh',  sql.Int,     escalation_delay_hours !== undefined ? escalation_delay_hours : null)
      .query(`UPDATE EscalationRule SET
                is_active=COALESCE(@act,is_active),
                threshold_value=COALESCE(@tv,threshold_value),
                level=COALESCE(@lv,level),
                notify_roles=COALESCE(@nr,notify_roles),
                escalation_delay_hours=COALESCE(@dh,escalation_delay_hours)
              WHERE rule_id=@id`);
    await auditLog(req, { action: 'UPDATE_ESCALATION_RULE', tableName: 'EscalationRule', recordId: parseInt(req.params.id), moduleId: 'MOD34' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Escalation Log ────────────────────────────────────────────
router.get('/escalation/log', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    const r = await pool.request().query(`
      SELECT l.*, r.rule_name, r.module_id, r.level AS rule_level
      FROM EscalationLog l
      JOIN EscalationRule r ON l.rule_id = r.rule_id
      ORDER BY l.triggered_at DESC
    `);
    res.json(r.recordset);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/escalation/log/:id/acknowledge', async (req, res) => {
  try {
    const pool = req.app.locals.db;
    await pool.request()
      .input('id',  sql.Int,      parseInt(req.params.id))
      .input('uid', sql.Int,      req.session.user.id)
      .query(`UPDATE EscalationLog SET
                acknowledged_by=@uid, acknowledged_at=GETDATE()
              WHERE log_id=@id AND acknowledged_at IS NULL`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
