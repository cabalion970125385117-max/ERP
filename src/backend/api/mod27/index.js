/**
 * ATCA-ERP v1.0 — MOD-27 Value Flow Tracker
 * AS9100D §8.5 (Production & Service Provision) | Process Traceability
 *
 * Read-only module. Visualises the full job lifecycle:
 *   Contract Review -> GRN -> Work Order -> Production -> NDT (FPI/MPT)
 *   -> QA Sign-off -> Certificate of Conformance -> Delivery Order
 *
 * GET /api/v1/mod27/alerts/summary      — KPI tiles (NDT_INSPECTOR+)
 * GET /api/v1/mod27/active-grns         — GRN typeahead list (NDT_INSPECTOR+)
 * GET /api/v1/mod27/flow/:grn_ref       — full value-flow chain for one GRN (NDT_INSPECTOR+)
 */
'use strict';

const router = require('express').Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole } = require('../../middleware/auth');

router.use(requireAuth);
router.use(requireMinRole('NDT_INSPECTOR'));

/* ── GET /alerts/summary ─────────────────────────────────────── */
router.get('/alerts/summary', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.WorkOrder
           WHERE status IN ('ISSUED','IN_PROGRESS','PENDING_QA') AND is_active=1)              AS active_jobs,
        (SELECT COUNT(*) FROM dbo.GoodsReceivingNote
           WHERE status='PENDING' AND is_active=1)                                              AS grn_pending,
        (SELECT COUNT(*) FROM dbo.WorkOrder
           WHERE status='COMPLETE' AND coc_issued=0 AND is_active=1)                            AS coc_pending,
        (SELECT COUNT(*) FROM dbo.DeliveryOrder
           WHERE status='SHIPPED' AND CAST(shipped_date AS DATE)=CAST(GETUTCDATE() AS DATE)
             AND is_active=1)                                                                   AS shipped_today
    `);
    const r = rows[0];
    res.json({
      active_jobs:  r.active_jobs,
      grn_pending:  r.grn_pending,
      coc_pending:  r.coc_pending,
      shipped_today:r.shipped_today,
      total:        r.active_jobs,
    });
  } catch (err) {
    console.error('[mod27/alerts/summary]', err.message);
    res.status(500).json({ message: 'Error fetching MOD-27 alert summary.' });
  }
});

/* ── GET /active-grns?q=&limit= ──────────────────────────────── */
router.get('/active-grns', async (req, res) => {
  try {
    const q     = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const rows = await query(`
      SELECT TOP (@limit)
        g.grn_ref, g.received_date, g.status,
        COALESCE(c.company_name, g.supplier_name) AS customer_name
      FROM dbo.GoodsReceivingNote g
      LEFT JOIN dbo.Customer c ON c.customer_id = g.customer_id
      WHERE g.is_active = 1
        AND (@q = '' OR g.grn_ref LIKE @q + '%')
      ORDER BY g.received_date DESC, g.grn_ref DESC
    `, [
      { name: 'q',     type: sql.NVarChar(20), value: q },
      { name: 'limit', type: sql.Int,          value: limit },
    ]);
    res.json({ items: rows });
  } catch (err) {
    console.error('[mod27/active-grns]', err.message);
    res.status(500).json({ message: 'Error fetching active GRNs.' });
  }
});

/* ── GET /flow/:grn_ref ──────────────────────────────────────── */
router.get('/flow/:grn_ref', async (req, res) => {
  const grnRef = req.params.grn_ref;
  try {
    // 1. GRN + customer
    const grnRows = await query(`
      SELECT g.grn_id, g.grn_ref, g.status, g.received_date, g.inspection_done, g.inspect_result,
             COALESCE(c.company_name, g.supplier_name) AS customer_name
      FROM dbo.GoodsReceivingNote g
      LEFT JOIN dbo.Customer c ON c.customer_id = g.customer_id
      WHERE g.grn_ref = @ref AND g.is_active = 1
    `, [{ name: 'ref', type: sql.NVarChar(20), value: grnRef }]);

    if (!grnRows.length) return res.status(404).json({ message: 'GRN not found or not active.' });
    const grn = grnRows[0];

    // 2. Work Order linked to this GRN (most recent)
    const woRows = await query(`
      SELECT TOP 1
        wo.work_order_id, wo.wo_number, wo.status, wo.planned_end,
        wo.contract_review_id, wo.coc_id, wo.coc_issued,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id) AS steps_total,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id AND s.status='COMPLETE') AS steps_done,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id AND s.route_card_id IS NOT NULL) AS prod_total,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id AND s.route_card_id IS NOT NULL AND s.status='COMPLETE') AS prod_done,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id AND s.process_type='FPI') AS fpi_steps,
        (SELECT COUNT(*) FROM dbo.WoStep s WHERE s.work_order_id = wo.work_order_id AND s.process_type='MPT') AS mpt_steps
      FROM dbo.WorkOrder wo
      WHERE wo.grn_id = @gid AND wo.is_active = 1
      ORDER BY wo.created_at DESC
    `, [{ name: 'gid', type: sql.Int, value: grn.grn_id }]);
    const wo = woRows[0] || null;

    // 3. Contract Review
    let cr = null;
    if (wo && wo.contract_review_id) {
      const crRows = await query(`
        SELECT review_ref, status, review_date
        FROM dbo.ContractReview WHERE review_id = @id AND is_active = 1
      `, [{ name: 'id', type: sql.Int, value: wo.contract_review_id }]);
      cr = crRows[0] || null;
    }

    // 4. FPI (by work_order_ref string)
    let fpi = null;
    if (wo) {
      const fpiRows = await query(`
        SELECT TOP 1 job_ref, status, disposition
        FROM dbo.vw_FpiJob WHERE work_order_ref = @ref
        ORDER BY created_at DESC
      `, [{ name: 'ref', type: sql.NVarChar(30), value: wo.wo_number }]);
      fpi = fpiRows[0] || null;
    }

    // 5. MPT (by work_order_id)
    let mpt = null;
    if (wo) {
      const mptRows = await query(`
        SELECT TOP 1 job_number AS job_ref, status, disposition
        FROM dbo.MptJob WHERE work_order_id = @wid AND is_active = 1
        ORDER BY created_at DESC
      `, [{ name: 'wid', type: sql.Int, value: wo.work_order_id }]);
      mpt = mptRows[0] || null;
    }

    // 6. CoC (by work_order_id)
    let coc = null;
    if (wo) {
      const cocRows = await query(`
        SELECT TOP 1 coc_number, status, issued_at, delivery_order_id
        FROM dbo.CertificateOfConformance
        WHERE work_order_id = @wid AND is_active = 1 AND status <> 'VOID'
        ORDER BY created_at DESC
      `, [{ name: 'wid', type: sql.Int, value: wo.work_order_id }]);
      coc = cocRows[0] || null;
    }

    // 7. Delivery Order (via CoC.delivery_order_id, else via ContractReview)
    let deliv = null;
    if (coc && coc.delivery_order_id) {
      const doRows = await query(`
        SELECT do_ref, status, shipped_date FROM dbo.DeliveryOrder
        WHERE do_id = @id AND is_active = 1
      `, [{ name: 'id', type: sql.Int, value: coc.delivery_order_id }]);
      deliv = doRows[0] || null;
    } else if (wo && wo.contract_review_id) {
      const doRows = await query(`
        SELECT TOP 1 do_ref, status, shipped_date FROM dbo.DeliveryOrder
        WHERE review_id = @rid AND is_active = 1
        ORDER BY created_at DESC
      `, [{ name: 'rid', type: sql.Int, value: wo.contract_review_id }]);
      deliv = doRows[0] || null;
    }

    // 8. Open NCRs linked to this work order
    let ncrOpen = 0;
    if (wo) {
      const ncrRows = await query(`
        SELECT COUNT(*) AS cnt FROM dbo.NCR
        WHERE work_order_ref = @ref AND is_active = 1
          AND status NOT IN ('CLOSED','CANCELLED')
      `, [{ name: 'ref', type: sql.NVarChar(50), value: wo.wo_number }]);
      ncrOpen = ncrRows[0].cnt;
    }

    // ── Assemble stage objects ──────────────────────────────────
    const fpiRequired = !!fpi || (wo && wo.fpi_steps > 0);
    const mptRequired = !!mpt || (wo && wo.mpt_steps > 0);

    const stages = {
      contract_review: cr
        ? { ref: cr.review_ref, status: cr.status, review_date: cr.review_date }
        : { ref: null, status: wo ? 'LINKED' : 'NONE' },
      grn: {
        ref: grn.grn_ref, status: grn.status,
        received_date: grn.received_date,
        inspection_done: !!grn.inspection_done,
        inspect_result: grn.inspect_result,
      },
      work_order: wo
        ? { ref: wo.wo_number, work_order_id: wo.work_order_id, status: wo.status,
            planned_end: wo.planned_end, steps_done: wo.steps_done, steps_total: wo.steps_total }
        : { ref: null, status: 'NOT_STARTED' },
      production: wo
        ? { total: wo.prod_total, done: wo.prod_done,
            complete: wo.prod_total === 0 ? null : wo.prod_done >= wo.prod_total }
        : { total: 0, done: 0, complete: null },
      fpi: fpiRequired
        ? { required: true, ref: fpi ? fpi.job_ref : null,
            status: fpi ? fpi.status : 'NOT_STARTED', disposition: fpi ? fpi.disposition : null }
        : { required: false },
      mpt: mptRequired
        ? { required: true, ref: mpt ? mpt.job_ref : null,
            status: mpt ? mpt.status : 'NOT_STARTED', disposition: mpt ? mpt.disposition : null }
        : { required: false },
      qa_signoff: wo
        ? { status: wo.status }
        : { status: 'NOT_STARTED' },
      coc: coc
        ? { ref: coc.coc_number, status: coc.status, issued_at: coc.issued_at }
        : { ref: null, status: 'NOT_ISSUED' },
      delivery: deliv
        ? { ref: deliv.do_ref, status: deliv.status, shipped_date: deliv.shipped_date }
        : { ref: null, status: 'NOT_READY' },
    };

    // ── Determine completion + current stage ────────────────────
    const ndtComplete =
      (!fpiRequired || (fpi && fpi.status === 'COMPLETE')) &&
      (!mptRequired || (mpt && mpt.status === 'ACCEPTED'));

    const stageComplete = [
      cr ? cr.status === 'APPROVED' : false,                              // 1
      grn.status === 'ACCEPTED',                                          // 2
      wo ? ['PENDING_QA','COMPLETE'].includes(wo.status) : false,         // 3
      stages.production.complete !== false,                               // 4 (null=skipped counts complete)
      ndtComplete && (fpiRequired || mptRequired),                        // 5
      wo ? wo.status === 'COMPLETE' : false,                              // 6
      coc ? coc.status === 'ISSUED' : false,                              // 7
      deliv ? ['SHIPPED','DELIVERED'].includes(deliv.status) : false,     // 8
    ];
    let currentStage = stageComplete.findIndex(s => !s) + 1;
    if (currentStage === 0) currentStage = 8; // all complete

    const blocked =
      ncrOpen > 0 ||
      ['REJECTED','QUARANTINE'].includes(grn.status) ||
      (fpi && fpi.disposition === 'REJECT') ||
      (mpt && (mpt.disposition === 'REJECT' || mpt.status === 'REJECTED'));

    res.json({
      grn_ref: grn.grn_ref,
      customer_name: grn.customer_name,
      stages,
      current_stage: currentStage,
      blocked: !!blocked,
      ncr_open: ncrOpen,
    });
  } catch (err) {
    console.error('[mod27/flow]', err.message);
    res.status(500).json({ message: 'Error building value flow.' });
  }
});

module.exports = router;
