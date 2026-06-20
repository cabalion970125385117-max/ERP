/**
 * ATCA-ERP v1.0 — MOD-28 Process Capability Master (PCM)
 * Mirrors ATC-PCM-001 Rev A — process × customer × specification capability register.
 *
 * GET  /api/v1/mod28/alerts/summary       — KPI tiles (NDT_INSPECTOR+)
 * GET  /api/v1/mod28/processes            — process families (grouped, + size envelope)
 * GET  /api/v1/mod28/capabilities?process=&customer=&q= — capability rows
 * GET  /api/v1/mod28/capabilities/:id     — full capability record
 * POST /api/v1/mod28/capabilities         — create (ENGINEER+)
 * PUT  /api/v1/mod28/capabilities/:id     — edit (ENGINEER+)
 * GET  /api/v1/mod28/revisions            — PCM document revision history
 */
'use strict';

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireMinRole('NDT_INSPECTOR'));

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const [r] = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.PcmCapability WHERE is_active=1) AS total_capabilities,
        (SELECT COUNT(*) FROM dbo.PcmProcess    WHERE is_active=1) AS processes,
        (SELECT COUNT(DISTINCT customer_category) FROM dbo.PcmCapability WHERE is_active=1) AS customers,
        (SELECT COUNT(*) FROM dbo.PcmCapability WHERE is_active=1 AND is_upcoming=1) AS upcoming_services
    `);
    res.json({ ...r, total: r.total_capabilities });
  } catch (err) {
    console.error('[mod28/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching PCM summary.' });
  }
});

/* ── GET /processes ──────────────────────────────────────────── */
router.get('/processes', async (req, res) => {
  try {
    const rows = await query(`
      SELECT pcm_process_id, process_name, process_group, bay,
             max_len_cm, max_wid_cm, max_dep_cm, is_upcoming,
             (SELECT COUNT(*) FROM dbo.PcmCapability c WHERE c.pcm_process_id=p.pcm_process_id AND c.is_active=1) AS capability_count
      FROM dbo.PcmProcess p
      WHERE is_active=1
      ORDER BY process_group, process_name
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod28/processes]', err.message);
    res.status(500).json({ message: 'Error fetching processes.' });
  }
});

/* ── GET /capabilities?process=&customer=&q= ─────────────────── */
router.get('/capabilities', async (req, res) => {
  try {
    const { process = '', customer = '', q = '' } = req.query;
    const rows = await query(`
      SELECT c.capability_id, c.capability_ref, p.process_name, p.process_group,
             c.customer_category, c.specification,
             c.tier1_class, c.tier2_class, c.tier3_class, c.tier4_class,
             c.max_len_cm, c.max_wid_cm, c.max_dep_cm, c.is_upcoming
      FROM dbo.PcmCapability c
      JOIN dbo.PcmProcess p ON p.pcm_process_id = c.pcm_process_id
      WHERE c.is_active=1
        AND (@process='' OR p.process_name = @process)
        AND (@customer='' OR c.customer_category = @customer)
        AND (@q='' OR c.specification LIKE '%'+@q+'%' OR p.process_name LIKE '%'+@q+'%' OR c.customer_category LIKE '%'+@q+'%')
      ORDER BY p.process_name, c.customer_category, c.capability_ref
    `, [
      { name: 'process',  type: sql.NVarChar(120), value: process },
      { name: 'customer', type: sql.NVarChar(120), value: customer },
      { name: 'q',        type: sql.NVarChar(120), value: q },
    ]);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod28/capabilities]', err.message);
    res.status(500).json({ message: 'Error fetching capabilities.' });
  }
});

/* ── GET /capabilities/:id ───────────────────────────────────── */
router.get('/capabilities/:id', async (req, res) => {
  try {
    const [row] = await query(`
      SELECT c.*, p.process_name, p.process_group, p.bay
      FROM dbo.PcmCapability c
      JOIN dbo.PcmProcess p ON p.pcm_process_id = c.pcm_process_id
      WHERE c.capability_id = @id AND c.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!row) return res.status(404).json({ message: 'Capability not found.' });
    res.json(row);
  } catch (err) {
    console.error('[mod28/capabilities/:id]', err.message);
    res.status(500).json({ message: 'Error fetching capability.' });
  }
});

/* ── POST /capabilities ──────────────────────────────────────── */
router.post('/capabilities', requireMinRole('ENGINEER'), async (req, res) => {
  const b = req.body || {};
  if (!b.pcm_process_id || !b.customer_category || !b.specification) {
    return res.status(400).json({ message: 'pcm_process_id, customer_category and specification are required.' });
  }
  try {
    await query(`UPDATE dbo.Mod28Sequence SET last_num=last_num+1 WHERE seq_key='CAPABILITY'`);
    const [seq] = await query(`SELECT last_num FROM dbo.Mod28Sequence WHERE seq_key='CAPABILITY'`);
    const ref = `PCM-${new Date().getFullYear()}-${String(seq.last_num).padStart(4,'0')}`;
    const [ins] = await query(`
      INSERT INTO dbo.PcmCapability
        (capability_ref, pcm_process_id, customer_category, customer_id, specification,
         tier1_class, tier2_class, tier3_class, tier4_class, max_len_cm, max_wid_cm, max_dep_cm, is_upcoming, notes)
      OUTPUT INSERTED.capability_id
      VALUES (@ref,@pid,@cust,@cid,@spec,@t1,@t2,@t3,@t4,@l,@w,@d,@up,@notes)
    `, [
      { name: 'ref',  type: sql.NVarChar(20),  value: ref },
      { name: 'pid',  type: sql.Int,           value: b.pcm_process_id },
      { name: 'cust', type: sql.NVarChar(120), value: b.customer_category },
      { name: 'cid',  type: sql.Int,           value: b.customer_id || null },
      { name: 'spec', type: sql.NVarChar(300), value: b.specification },
      { name: 't1',   type: sql.NVarChar(sql.MAX), value: b.tier1_class || null },
      { name: 't2',   type: sql.NVarChar(sql.MAX), value: b.tier2_class || null },
      { name: 't3',   type: sql.NVarChar(sql.MAX), value: b.tier3_class || null },
      { name: 't4',   type: sql.NVarChar(sql.MAX), value: b.tier4_class || null },
      { name: 'l',    type: sql.Decimal(6,1),  value: b.max_len_cm ?? null },
      { name: 'w',    type: sql.Decimal(6,1),  value: b.max_wid_cm ?? null },
      { name: 'd',    type: sql.Decimal(6,1),  value: b.max_dep_cm ?? null },
      { name: 'up',   type: sql.Bit,           value: b.is_upcoming ? 1 : 0 },
      { name: 'notes',type: sql.NVarChar(sql.MAX), value: b.notes || null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'CREATE', tableName: 'PcmCapability', recordId: ref, moduleId: 'MOD-28', newValue: ref });
    res.status(201).json({ capability_id: ins.capability_id, capability_ref: ref });
  } catch (err) {
    console.error('[mod28/capabilities POST]', err.message);
    res.status(500).json({ message: 'Error creating capability.' });
  }
});

/* ── PUT /capabilities/:id ───────────────────────────────────── */
router.put('/capabilities/:id', requireMinRole('ENGINEER'), async (req, res) => {
  const b = req.body || {};
  try {
    await query(`
      UPDATE dbo.PcmCapability SET
        customer_category=@cust, specification=@spec,
        tier1_class=@t1, tier2_class=@t2, tier3_class=@t3, tier4_class=@t4,
        max_len_cm=@l, max_wid_cm=@w, max_dep_cm=@d, is_upcoming=@up, notes=@notes,
        updated_at=GETUTCDATE()
      WHERE capability_id=@id AND is_active=1
    `, [
      { name: 'cust', type: sql.NVarChar(120), value: b.customer_category },
      { name: 'spec', type: sql.NVarChar(300), value: b.specification },
      { name: 't1',   type: sql.NVarChar(sql.MAX), value: b.tier1_class || null },
      { name: 't2',   type: sql.NVarChar(sql.MAX), value: b.tier2_class || null },
      { name: 't3',   type: sql.NVarChar(sql.MAX), value: b.tier3_class || null },
      { name: 't4',   type: sql.NVarChar(sql.MAX), value: b.tier4_class || null },
      { name: 'l',    type: sql.Decimal(6,1),  value: b.max_len_cm ?? null },
      { name: 'w',    type: sql.Decimal(6,1),  value: b.max_wid_cm ?? null },
      { name: 'd',    type: sql.Decimal(6,1),  value: b.max_dep_cm ?? null },
      { name: 'up',   type: sql.Bit,           value: b.is_upcoming ? 1 : 0 },
      { name: 'notes',type: sql.NVarChar(sql.MAX), value: b.notes || null },
      { name: 'id',   type: sql.Int,           value: parseInt(req.params.id) },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'PcmCapability', recordId: req.params.id, moduleId: 'MOD-28' });
    res.json({ message: 'Capability updated.' });
  } catch (err) {
    console.error('[mod28/capabilities PUT]', err.message);
    res.status(500).json({ message: 'Error updating capability.' });
  }
});

/* ── GET /revisions ──────────────────────────────────────────── */
router.get('/revisions', async (req, res) => {
  try {
    const rows = await query(`
      SELECT rev_id, document_no, revision, rev_date, originator, change_details, reason
      FROM dbo.PcmRevision ORDER BY rev_date DESC, rev_id DESC
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[mod28/revisions]', err.message);
    res.status(500).json({ message: 'Error fetching revisions.' });
  }
});

module.exports = router;
