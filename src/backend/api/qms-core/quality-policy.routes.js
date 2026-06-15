/**
 * ATCA-ERP v1.0 — MOD-01 Quality Policy Routes
 * AS9100D §5.2 — Quality Policy
 * GET  /api/v1/mod01/policy/current   — active approved policy
 * GET  /api/v1/mod01/policy           — all policies (history)
 * POST /api/v1/mod01/policy           — create draft policy (QA_MANAGER+)
 * PUT  /api/v1/mod01/policy/:id/approve — approve policy (QA_MANAGER+)
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { query, sql } = require('../../config/database');
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');

// All routes require auth
router.use(requireAuth);

/* ----------------------------------------------------------
   GET /current — Return active approved policy
---------------------------------------------------------- */
router.get('/current', async (req, res) => {
  try {
    const rows = await query(`
      SELECT TOP 1
        p.policy_id, p.revision, p.issue_date, p.effective_date,
        p.policy_text, p.status, p.created_at, p.updated_at,
        u.full_name AS approved_by_name
      FROM dbo.QmsPolicy p
      LEFT JOIN dbo.Users u ON u.user_id = p.approved_by
      WHERE p.is_active = 1 AND p.status = 'APPROVED'
      ORDER BY p.effective_date DESC
    `);
    if (!rows.length) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    console.error('[policy/current]', err.message);
    res.status(500).json({ message: 'Error fetching policy.' });
  }
});

/* ----------------------------------------------------------
   GET / — All policy versions
---------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        p.policy_id, p.revision, p.issue_date, p.effective_date,
        p.status, p.created_at,
        u_approved.full_name AS approved_by_name,
        u_created.full_name  AS created_by_name
      FROM dbo.QmsPolicy p
      LEFT JOIN dbo.Users u_approved ON u_approved.user_id = p.approved_by
      LEFT JOIN dbo.Users u_created  ON u_created.user_id  = p.created_by
      WHERE p.is_active = 1
      ORDER BY p.issue_date DESC
    `);
    res.json({ items: rows, total: rows.length });
  } catch (err) {
    console.error('[policy/list]', err.message);
    res.status(500).json({ message: 'Error fetching policies.' });
  }
});

/* ----------------------------------------------------------
   POST / — Create new draft policy
   Body: { revision, issue_date, effective_date, policy_text }
   Requires: QA_MANAGER or ADMIN
---------------------------------------------------------- */
router.post('/', requireMinRole('QA_MANAGER'), async (req, res) => {
  const { revision, issue_date, effective_date, policy_text } = req.body;

  if (!revision || !issue_date || !effective_date || !policy_text) {
    return res.status(400).json({ message: 'Missing required fields: revision, issue_date, effective_date, policy_text.' });
  }

  try {
    const result = await query(`
      INSERT INTO dbo.QmsPolicy
        (revision, issue_date, effective_date, policy_text, status, created_by)
      OUTPUT INSERTED.policy_id
      VALUES
        (@revision, @issue_date, @effective_date, @policy_text, 'DRAFT', @userId)
    `, [
      { name: 'revision',       type: sql.NVarChar(5),   value: revision       },
      { name: 'issue_date',     type: sql.Date,           value: new Date(issue_date) },
      { name: 'effective_date', type: sql.Date,           value: new Date(effective_date) },
      { name: 'policy_text',    type: sql.NVarChar(sql.MAX), value: policy_text },
      { name: 'userId',         type: sql.Int,            value: req.user.userId },
    ]);

    const newId = result[0].policy_id;
    await auditLog({
      userId:    req.user.userId,
      username:  req.user.username,
      lanIp:     getLanIp(req),
      action:    'INSERT',
      tableName: 'QmsPolicy',
      recordId:  String(newId),
      moduleId:  'MOD-01',
      newValue:  req.body,
    });

    res.status(201).json({ policy_id: newId, message: 'Policy draft created.' });
  } catch (err) {
    console.error('[policy/create]', err.message);
    res.status(500).json({ message: 'Error creating policy.' });
  }
});

/* ----------------------------------------------------------
   PUT /:id/approve — Approve policy & supersede old ones
   Requires: QA_MANAGER or ADMIN
---------------------------------------------------------- */
router.put('/:id/approve', requireMinRole('QA_MANAGER'), async (req, res) => {
  const policyId = parseInt(req.params.id, 10);
  if (!policyId) return res.status(400).json({ message: 'Invalid policy ID.' });

  try {
    // Mark all previous APPROVED as SUPERSEDED
    await query(`
      UPDATE dbo.QmsPolicy
      SET status = 'SUPERSEDED', updated_at = GETUTCDATE()
      WHERE status = 'APPROVED' AND is_active = 1 AND policy_id <> @id
    `, [{ name: 'id', type: sql.Int, value: policyId }]);

    // Approve this policy
    await query(`
      UPDATE dbo.QmsPolicy
      SET status = 'APPROVED', approved_by = @userId, updated_at = GETUTCDATE()
      WHERE policy_id = @id AND is_active = 1
    `, [
      { name: 'id',     type: sql.Int, value: policyId },
      { name: 'userId', type: sql.Int, value: req.user.userId },
    ]);

    await auditLog({
      userId:    req.user.userId,
      username:  req.user.username,
      lanIp:     getLanIp(req),
      action:    'UPDATE',
      tableName: 'QmsPolicy',
      recordId:  String(policyId),
      moduleId:  'MOD-01',
      newValue:  { status: 'APPROVED' },
    });

    res.json({ message: 'Policy approved. Previous version superseded.' });
  } catch (err) {
    console.error('[policy/approve]', err.message);
    res.status(500).json({ message: 'Error approving policy.' });
  }
});

module.exports = router;
