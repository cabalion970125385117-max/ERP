/**
 * ATCA-ERP v1.0 — MOD-02 Documents & Revisions Routes
 * AS9100D §7.5 Documented Information
 *
 * GET    /api/v1/mod02/documents                — list all documents (with current rev)
 * GET    /api/v1/mod02/documents/:id            — document + all revisions + distribution
 * POST   /api/v1/mod02/documents                — create document master (ENGINEER+)
 * PUT    /api/v1/mod02/documents/:id            — update document master (QA_MANAGER+)
 * DELETE /api/v1/mod02/documents/:id            — soft delete (ADMIN)
 *
 * GET    /api/v1/mod02/documents/:id/revisions  — revision history
 * POST   /api/v1/mod02/documents/:id/revisions  — create new DRAFT revision (ENGINEER+)
 * PUT    /api/v1/mod02/documents/:id/revisions/:revId/submit   — submit for review (ENGINEER+)
 * PUT    /api/v1/mod02/documents/:id/revisions/:revId/approve  — approve revision (QA_MANAGER+)
 * PUT    /api/v1/mod02/documents/:id/revisions/:revId/reject   — reject revision (QA_MANAGER+)
 * PUT    /api/v1/mod02/documents/:id/revisions/:revId/obsolete — obsolete (QA_MANAGER+)
 *
 * GET    /api/v1/mod02/documents/:id/approvals  — approval trail for latest revision
 * GET    /api/v1/mod02/categories               — document category list
 */

'use strict';

const express  = require('express');
const router   = express.Router();
const { requireAuth, requireMinRole, auditLog, getLanIp } = require('../../middleware/auth');
const { query, sql } = require('../../config/db');

/* ------------------------------------------------------------------ */
/*  CATEGORIES                                                          */
/* ------------------------------------------------------------------ */
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT category_id, code, name, description FROM dbo.DocumentCategory WHERE is_active = 1 ORDER BY code`
    );
    res.json(rows);
  } catch (err) {
    console.error('[mod02/categories]', err.message);
    res.status(500).json({ message: 'Error fetching categories.' });
  }
});

/* ------------------------------------------------------------------ */
/*  DOCUMENT LIST                                                       */
/* ------------------------------------------------------------------ */
router.get('/', requireAuth, async (req, res) => {
  const { category, process_area, status, search, limit = 50, offset = 0 } = req.query;
  try {
    const params = [
      { name: 'limit',  type: sql.Int, value: parseInt(limit,  10) },
      { name: 'offset', type: sql.Int, value: parseInt(offset, 10) },
    ];
    let where = `WHERE 1=1`;
    if (category) {
      where += ` AND v.category_code = @category`;
      params.push({ name: 'category', type: sql.VarChar(10), value: category });
    }
    if (process_area) {
      where += ` AND v.process_area = @process_area`;
      params.push({ name: 'process_area', type: sql.NVarChar(80), value: process_area });
    }
    if (status) {
      where += ` AND v.revision_status = @status`;
      params.push({ name: 'status', type: sql.VarChar(12), value: status });
    }
    if (search) {
      where += ` AND (v.doc_number LIKE @search OR v.title LIKE @search)`;
      params.push({ name: 'search', type: sql.NVarChar(200), value: `%${search}%` });
    }

    const rows = await query(`
      SELECT
        v.document_id, v.doc_number, v.title, v.category_code, v.category_name,
        v.process_area, v.is_controlled, v.revision_no, v.revision_status,
        v.effective_date, v.review_due_date, v.days_until_review,
        v.owner_name, v.approved_by_name, v.file_name, v.file_size_kb
      FROM dbo.vw_DocumentCurrent v
      ${where}
      ORDER BY v.doc_number
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    const total = await query(`SELECT COUNT(*) AS n FROM dbo.vw_DocumentCurrent v ${where}`,
      params.filter(p => !['limit','offset'].includes(p.name)));

    res.json({ total: total[0].n, rows });
  } catch (err) {
    console.error('[mod02/documents GET]', err.message);
    res.status(500).json({ message: 'Error fetching documents.' });
  }
});

/* ------------------------------------------------------------------ */
/*  DOCUMENT DETAIL                                                     */
/* ------------------------------------------------------------------ */
router.get('/:id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [doc] = await query(`
      SELECT d.*, dc.code AS category_code, dc.name AS category_name,
             u.full_name AS owner_name
      FROM dbo.Document d
      INNER JOIN dbo.DocumentCategory dc ON d.category_id = dc.category_id
      LEFT JOIN dbo.Users u ON d.owner_id = u.user_id
      WHERE d.document_id = @id AND d.is_active = 1
    `, [{ name: 'id', type: sql.Int, value: id }]);

    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const revisions = await query(`
      SELECT r.*, prep.full_name AS prepared_by_name,
             rev.full_name AS reviewed_by_name, app.full_name AS approved_by_name
      FROM dbo.DocumentRevision r
      LEFT JOIN dbo.Users prep ON r.prepared_by = prep.user_id
      LEFT JOIN dbo.Users rev  ON r.reviewed_by = rev.user_id
      LEFT JOIN dbo.Users app  ON r.approved_by = app.user_id
      WHERE r.document_id = @id
      ORDER BY r.created_at DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);

    const distribution = await query(`
      SELECT * FROM dbo.DocumentDistribution WHERE document_id = @id ORDER BY role_name
    `, [{ name: 'id', type: sql.Int, value: id }]);

    res.json({ ...doc, revisions, distribution });
  } catch (err) {
    console.error('[mod02/documents/:id GET]', err.message);
    res.status(500).json({ message: 'Error fetching document.' });
  }
});

/* ------------------------------------------------------------------ */
/*  CREATE DOCUMENT MASTER                                              */
/* ------------------------------------------------------------------ */
router.post('/', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  const { doc_number, title, category_id, process_area, owner_id, retention_years, is_controlled } = req.body;
  if (!doc_number || !title || !category_id) {
    return res.status(400).json({ message: 'doc_number, title, category_id required.' });
  }
  try {
    const result = await query(`
      INSERT INTO dbo.Document (doc_number, title, category_id, process_area, owner_id, retention_years, is_controlled, created_by)
      OUTPUT INSERTED.document_id
      VALUES (@doc_number, @title, @category_id, @process_area, @owner_id, @retention_years, @is_controlled, @created_by)
    `, [
      { name: 'doc_number',      type: sql.VarChar(30),    value: doc_number },
      { name: 'title',           type: sql.NVarChar(200),  value: title },
      { name: 'category_id',     type: sql.TinyInt,        value: parseInt(category_id, 10) },
      { name: 'process_area',    type: sql.NVarChar(80),   value: process_area || null },
      { name: 'owner_id',        type: sql.Int,            value: parseInt(owner_id || req.user.userId, 10) },
      { name: 'retention_years', type: sql.TinyInt,        value: parseInt(retention_years || 10, 10) },
      { name: 'is_controlled',   type: sql.Bit,            value: is_controlled !== false ? 1 : 0 },
      { name: 'created_by',      type: sql.Int,            value: req.user.userId },
    ]);
    const newId = result[0].document_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'Document', recordId: newId, moduleId: 'MOD-02',
      newValue: JSON.stringify({ doc_number, title }) });
    res.status(201).json({ document_id: newId, message: 'Document created.' });
  } catch (err) {
    if (err.number === 2627 || (err.message && err.message.includes('UQ_Document_number'))) {
      return res.status(409).json({ message: `Document number '${doc_number}' already exists.` });
    }
    console.error('[mod02/documents POST]', err.message);
    res.status(500).json({ message: 'Error creating document.' });
  }
});

/* ------------------------------------------------------------------ */
/*  UPDATE DOCUMENT MASTER                                              */
/* ------------------------------------------------------------------ */
router.put('/:id', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, process_area, owner_id, retention_years, is_controlled } = req.body;
  try {
    await query(`
      UPDATE dbo.Document
      SET title           = ISNULL(@title,           title),
          process_area    = ISNULL(@process_area,    process_area),
          owner_id        = ISNULL(@owner_id,        owner_id),
          retention_years = ISNULL(@retention_years, retention_years),
          is_controlled   = ISNULL(@is_controlled,   is_controlled),
          updated_at      = GETUTCDATE()
      WHERE document_id = @id AND is_active = 1
    `, [
      { name: 'id',              type: sql.Int,           value: id },
      { name: 'title',           type: sql.NVarChar(200), value: title           || null },
      { name: 'process_area',    type: sql.NVarChar(80),  value: process_area    || null },
      { name: 'owner_id',        type: sql.Int,           value: owner_id ? parseInt(owner_id, 10) : null },
      { name: 'retention_years', type: sql.TinyInt,       value: retention_years ? parseInt(retention_years, 10) : null },
      { name: 'is_controlled',   type: sql.Bit,           value: is_controlled !== undefined ? (is_controlled ? 1 : 0) : null },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'Document', recordId: id, moduleId: 'MOD-02' });
    res.json({ message: 'Document updated.' });
  } catch (err) {
    console.error('[mod02/documents PUT]', err.message);
    res.status(500).json({ message: 'Error updating document.' });
  }
});

/* ------------------------------------------------------------------ */
/*  SOFT DELETE DOCUMENT                                                */
/* ------------------------------------------------------------------ */
router.delete('/:id', requireAuth, requireMinRole('ADMIN'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await query(`
      UPDATE dbo.Document SET is_active = 0, updated_at = GETUTCDATE() WHERE document_id = @id
    `, [{ name: 'id', type: sql.Int, value: id }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'SOFT_DELETE', tableName: 'Document', recordId: id, moduleId: 'MOD-02' });
    res.json({ message: 'Document deactivated.' });
  } catch (err) {
    console.error('[mod02/documents DELETE]', err.message);
    res.status(500).json({ message: 'Error deactivating document.' });
  }
});

/* ================================================================== */
/*  REVISIONS                                                           */
/* ================================================================== */

/* GET revision history */
router.get('/:id/revisions', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT r.*, prep.full_name AS prepared_by_name,
             rev.full_name AS reviewed_by_name, app.full_name AS approved_by_name
      FROM dbo.DocumentRevision r
      LEFT JOIN dbo.Users prep ON r.prepared_by = prep.user_id
      LEFT JOIN dbo.Users rev  ON r.reviewed_by = rev.user_id
      LEFT JOIN dbo.Users app  ON r.approved_by = app.user_id
      WHERE r.document_id = @id
      ORDER BY r.created_at DESC
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json(rows);
  } catch (err) {
    console.error('[mod02/revisions GET]', err.message);
    res.status(500).json({ message: 'Error fetching revisions.' });
  }
});

/* POST — create new DRAFT revision */
router.post('/:id/revisions', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  const docId = parseInt(req.params.id, 10);
  const { revision_no, change_summary, file_name, file_path, file_size_kb,
          issue_date, effective_date, review_due_date } = req.body;
  if (!revision_no || !change_summary) {
    return res.status(400).json({ message: 'revision_no and change_summary required.' });
  }
  // Block if there is already a DRAFT or REVIEW in progress
  try {
    const existing = await query(`
      SELECT revision_id FROM dbo.DocumentRevision
      WHERE document_id = @docId AND status IN ('DRAFT','REVIEW')
    `, [{ name: 'docId', type: sql.Int, value: docId }]);
    if (existing.length) {
      return res.status(409).json({ message: 'A revision is already in DRAFT or REVIEW state. Complete or reject it first.' });
    }

    const result = await query(`
      INSERT INTO dbo.DocumentRevision
        (document_id, revision_no, status, change_summary, file_name, file_path, file_size_kb,
         issue_date, effective_date, review_due_date, prepared_by)
      OUTPUT INSERTED.revision_id
      VALUES (@docId, @rev_no, 'DRAFT', @change_summary, @file_name, @file_path, @file_size_kb,
              @issue_date, @effective_date, @review_due_date, @prepared_by)
    `, [
      { name: 'docId',          type: sql.Int,          value: docId },
      { name: 'rev_no',         type: sql.VarChar(10),  value: revision_no },
      { name: 'change_summary', type: sql.NVarChar(500),value: change_summary },
      { name: 'file_name',      type: sql.NVarChar(255),value: file_name      || null },
      { name: 'file_path',      type: sql.NVarChar(500),value: file_path      || null },
      { name: 'file_size_kb',   type: sql.Int,          value: file_size_kb ? parseInt(file_size_kb, 10) : null },
      { name: 'issue_date',     type: sql.Date,         value: issue_date     || null },
      { name: 'effective_date', type: sql.Date,         value: effective_date || null },
      { name: 'review_due_date',type: sql.Date,         value: review_due_date|| null },
      { name: 'prepared_by',    type: sql.Int,          value: req.user.userId },
    ]);
    const revId = result[0].revision_id;
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'INSERT', tableName: 'DocumentRevision', recordId: revId, moduleId: 'MOD-02',
      newValue: JSON.stringify({ docId, revision_no, status: 'DRAFT' }) });
    res.status(201).json({ revision_id: revId, message: 'Draft revision created.' });
  } catch (err) {
    if (err.number === 2627 || (err.message && err.message.includes('UQ_DocRev_unique'))) {
      return res.status(409).json({ message: `Revision '${revision_no}' already exists for this document.` });
    }
    console.error('[mod02/revisions POST]', err.message);
    res.status(500).json({ message: 'Error creating revision.' });
  }
});

/* PUT — submit revision for review (DRAFT → REVIEW) */
router.put('/:id/revisions/:revId/submit', requireAuth, requireMinRole('ENGINEER'), async (req, res) => {
  const revId = parseInt(req.params.revId, 10);
  const docId = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT status, prepared_by FROM dbo.DocumentRevision WHERE revision_id = @revId AND document_id = @docId
    `, [{ name: 'revId', type: sql.Int, value: revId }, { name: 'docId', type: sql.Int, value: docId }]);
    if (!rows.length) return res.status(404).json({ message: 'Revision not found.' });
    if (rows[0].status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT revisions can be submitted for review.' });

    await query(`
      UPDATE dbo.DocumentRevision SET status = 'REVIEW', reviewed_by = @uid, updated_at = GETUTCDATE()
      WHERE revision_id = @revId
    `, [
      { name: 'revId', type: sql.Int, value: revId },
      { name: 'uid',   type: sql.Int, value: req.user.userId },
    ]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'DocumentRevision', recordId: revId, moduleId: 'MOD-02',
      newValue: JSON.stringify({ status: 'REVIEW' }) });

    // Record approval action
    await query(`
      INSERT INTO dbo.DocumentApproval (revision_id, approver_id, role_at_time, action)
      VALUES (@revId, @uid, @role, 'REVIEW')
    `, [
      { name: 'revId', type: sql.Int,        value: revId },
      { name: 'uid',   type: sql.Int,        value: req.user.userId },
      { name: 'role',  type: sql.VarChar(20),value: req.user.role },
    ]);
    res.json({ message: 'Revision submitted for review.' });
  } catch (err) {
    console.error('[mod02/revisions/submit]', err.message);
    res.status(500).json({ message: 'Error submitting revision.' });
  }
});

/* PUT — approve revision (REVIEW → APPROVED, supersedes previous) */
router.put('/:id/revisions/:revId/approve', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  const revId = parseInt(req.params.revId, 10);
  const docId = parseInt(req.params.id, 10);
  const { comments } = req.body;
  try {
    const rows = await query(`
      SELECT status FROM dbo.DocumentRevision WHERE revision_id = @revId AND document_id = @docId
    `, [{ name: 'revId', type: sql.Int, value: revId }, { name: 'docId', type: sql.Int, value: docId }]);
    if (!rows.length) return res.status(404).json({ message: 'Revision not found.' });
    if (rows[0].status !== 'REVIEW') return res.status(400).json({ message: 'Only REVIEW revisions can be approved.' });

    // Supersede all existing APPROVED revisions for this document
    await query(`
      UPDATE dbo.DocumentRevision
      SET status = 'SUPERSEDED', superseded_at = GETUTCDATE(), updated_at = GETUTCDATE()
      WHERE document_id = @docId AND status = 'APPROVED' AND superseded_at IS NULL
    `, [{ name: 'docId', type: sql.Int, value: docId }]);

    // Approve the new revision
    await query(`
      UPDATE dbo.DocumentRevision
      SET status = 'APPROVED', approved_by = @uid, approved_at = GETUTCDATE(), updated_at = GETUTCDATE()
      WHERE revision_id = @revId
    `, [
      { name: 'revId', type: sql.Int, value: revId },
      { name: 'uid',   type: sql.Int, value: req.user.userId },
    ]);

    // Record approval trail
    await query(`
      INSERT INTO dbo.DocumentApproval (revision_id, approver_id, role_at_time, action, comments)
      VALUES (@revId, @uid, @role, 'APPROVE', @comments)
    `, [
      { name: 'revId',    type: sql.Int,          value: revId },
      { name: 'uid',      type: sql.Int,          value: req.user.userId },
      { name: 'role',     type: sql.VarChar(20),  value: req.user.role },
      { name: 'comments', type: sql.NVarChar(500), value: comments || null },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'DocumentRevision', recordId: revId, moduleId: 'MOD-02',
      newValue: JSON.stringify({ status: 'APPROVED' }) });
    res.json({ message: 'Revision approved and published.' });
  } catch (err) {
    console.error('[mod02/revisions/approve]', err.message);
    res.status(500).json({ message: 'Error approving revision.' });
  }
});

/* PUT — reject revision (REVIEW → DRAFT) */
router.put('/:id/revisions/:revId/reject', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  const revId = parseInt(req.params.revId, 10);
  const docId = parseInt(req.params.id, 10);
  const { comments } = req.body;
  try {
    const rows = await query(`
      SELECT status FROM dbo.DocumentRevision WHERE revision_id = @revId AND document_id = @docId
    `, [{ name: 'revId', type: sql.Int, value: revId }, { name: 'docId', type: sql.Int, value: docId }]);
    if (!rows.length) return res.status(404).json({ message: 'Revision not found.' });
    if (rows[0].status !== 'REVIEW') return res.status(400).json({ message: 'Only REVIEW revisions can be rejected.' });

    await query(`
      UPDATE dbo.DocumentRevision SET status = 'DRAFT', updated_at = GETUTCDATE() WHERE revision_id = @revId
    `, [{ name: 'revId', type: sql.Int, value: revId }]);

    await query(`
      INSERT INTO dbo.DocumentApproval (revision_id, approver_id, role_at_time, action, comments)
      VALUES (@revId, @uid, @role, 'REJECT', @comments)
    `, [
      { name: 'revId',    type: sql.Int,          value: revId },
      { name: 'uid',      type: sql.Int,          value: req.user.userId },
      { name: 'role',     type: sql.VarChar(20),  value: req.user.role },
      { name: 'comments', type: sql.NVarChar(500), value: comments || null },
    ]);

    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'DocumentRevision', recordId: revId, moduleId: 'MOD-02',
      newValue: JSON.stringify({ status: 'DRAFT', reason: comments }) });
    res.json({ message: 'Revision rejected — returned to DRAFT.' });
  } catch (err) {
    console.error('[mod02/revisions/reject]', err.message);
    res.status(500).json({ message: 'Error rejecting revision.' });
  }
});

/* PUT — obsolete a document's current approved revision */
router.put('/:id/revisions/:revId/obsolete', requireAuth, requireMinRole('QA_MANAGER'), async (req, res) => {
  const revId = parseInt(req.params.revId, 10);
  const docId = parseInt(req.params.id, 10);
  try {
    await query(`
      UPDATE dbo.DocumentRevision
      SET status = 'OBSOLETE', obsoleted_at = GETUTCDATE(), updated_at = GETUTCDATE()
      WHERE revision_id = @revId AND document_id = @docId AND status = 'APPROVED'
    `, [{ name: 'revId', type: sql.Int, value: revId }, { name: 'docId', type: sql.Int, value: docId }]);
    await auditLog({ userId: req.user.userId, username: req.user.username, lanIp: getLanIp(req),
      action: 'UPDATE', tableName: 'DocumentRevision', recordId: revId, moduleId: 'MOD-02',
      newValue: JSON.stringify({ status: 'OBSOLETE' }) });
    res.json({ message: 'Document revision obsoleted.' });
  } catch (err) {
    console.error('[mod02/revisions/obsolete]', err.message);
    res.status(500).json({ message: 'Error obsoleting revision.' });
  }
});

/* GET approval trail for a revision */
router.get('/:id/approvals', requireAuth, async (req, res) => {
  const docId = parseInt(req.params.id, 10);
  try {
    const rows = await query(`
      SELECT a.*, u.full_name AS approver_name
      FROM dbo.DocumentApproval a
      INNER JOIN dbo.DocumentRevision r ON a.revision_id = r.revision_id
      INNER JOIN dbo.Users u ON a.approver_id = u.user_id
      WHERE r.document_id = @docId
      ORDER BY a.actioned_at DESC
    `, [{ name: 'docId', type: sql.Int, value: docId }]);
    res.json(rows);
  } catch (err) {
    console.error('[mod02/approvals GET]', err.message);
    res.status(500).json({ message: 'Error fetching approval trail.' });
  }
});

module.exports = router;
