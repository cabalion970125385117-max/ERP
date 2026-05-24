-- ============================================================
-- ATCA-ERP v1.0 — Migration 003: MOD-02 Document & Record Control
-- AS9100D §7.5 Documented Information
-- Run after 001_core_framework.sql and 002_mod01_qms_core.sql
-- ============================================================

USE ATCA_ERP_DB;
GO

-- ============================================================
-- DOCUMENT CATEGORIES
-- Master list of document types (QMS, NDT, WI, SOP, FORM, etc.)
-- ============================================================
CREATE TABLE dbo.DocumentCategory (
    category_id   TINYINT        NOT NULL IDENTITY(1,1),
    code          VARCHAR(10)    NOT NULL,   -- e.g. QMS, NDT, WI, SOP, FORM, SPEC, DWG
    name          NVARCHAR(80)   NOT NULL,
    description   NVARCHAR(255)  NULL,
    is_active     BIT            NOT NULL DEFAULT 1,
    created_at    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_DocumentCategory PRIMARY KEY (category_id),
    CONSTRAINT UQ_DocumentCategory_code UNIQUE (code)
);
GO

-- ============================================================
-- DOCUMENT MASTER
-- One row per controlled document; revisions in child table
-- AS9100D §7.5.2 (creating/updating) + §7.5.3 (control)
-- ============================================================
CREATE TABLE dbo.Document (
    document_id       INT            NOT NULL IDENTITY(1,1),
    doc_number        VARCHAR(30)    NOT NULL,   -- e.g. ATCA-QMS-001, ATCA-WI-FPI-003
    title             NVARCHAR(200)  NOT NULL,
    category_id       TINYINT        NOT NULL,
    process_area      NVARCHAR(80)   NULL,       -- FPI, MPT, ECT, UT, General, HR, etc.
    owner_id          INT            NOT NULL,   -- FK → Users (document owner/author)
    retention_years   TINYINT        NOT NULL DEFAULT 10,  -- AS9100D / NADCAP min retention
    is_controlled     BIT            NOT NULL DEFAULT 1,   -- uncontrolled = reference only
    is_active         BIT            NOT NULL DEFAULT 1,
    created_by        INT            NOT NULL,
    created_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updated_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_Document PRIMARY KEY (document_id),
    CONSTRAINT UQ_Document_number UNIQUE (doc_number),
    CONSTRAINT FK_Document_category FOREIGN KEY (category_id)
        REFERENCES dbo.DocumentCategory(category_id),
    CONSTRAINT FK_Document_owner FOREIGN KEY (owner_id)
        REFERENCES dbo.Users(user_id),
    CONSTRAINT FK_Document_created_by FOREIGN KEY (created_by)
        REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- DOCUMENT REVISION
-- Append-only revision history; current revision identified
-- by status = 'APPROVED' and superseded_at IS NULL
-- States: DRAFT → REVIEW → APPROVED → SUPERSEDED | OBSOLETE
-- ============================================================
CREATE TABLE dbo.DocumentRevision (
    revision_id       INT            NOT NULL IDENTITY(1,1),
    document_id       INT            NOT NULL,
    revision_no       VARCHAR(10)    NOT NULL,   -- e.g. 00, 01, A, B, 1.0
    status            VARCHAR(12)    NOT NULL
                          CONSTRAINT CHK_DocRev_status
                          CHECK (status IN ('DRAFT','REVIEW','APPROVED','SUPERSEDED','OBSOLETE')),
    change_summary    NVARCHAR(500)  NOT NULL,   -- §7.5.2 description of change
    file_path         NVARCHAR(500)  NULL,       -- relative path on LAN share / NAS
    file_name         NVARCHAR(255)  NULL,
    file_size_kb      INT            NULL,
    issue_date        DATE           NULL,
    effective_date    DATE           NULL,
    review_due_date   DATE           NULL,       -- periodic review trigger
    superseded_at     DATETIME2      NULL,       -- populated when next rev approved
    obsoleted_at      DATETIME2      NULL,
    prepared_by       INT            NOT NULL,   -- FK → Users
    reviewed_by       INT            NULL,
    approved_by       INT            NULL,
    approved_at       DATETIME2      NULL,
    created_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updated_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_DocumentRevision PRIMARY KEY (revision_id),
    CONSTRAINT UQ_DocRev_unique UNIQUE (document_id, revision_no),
    CONSTRAINT FK_DocRev_document FOREIGN KEY (document_id)
        REFERENCES dbo.Document(document_id),
    CONSTRAINT FK_DocRev_prepared FOREIGN KEY (prepared_by)
        REFERENCES dbo.Users(user_id),
    CONSTRAINT FK_DocRev_reviewed FOREIGN KEY (reviewed_by)
        REFERENCES dbo.Users(user_id),
    CONSTRAINT FK_DocRev_approved FOREIGN KEY (approved_by)
        REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- DOCUMENT APPROVAL RECORD
-- Multi-signatory approval trail per revision
-- ============================================================
CREATE TABLE dbo.DocumentApproval (
    approval_id     INT           NOT NULL IDENTITY(1,1),
    revision_id     INT           NOT NULL,
    approver_id     INT           NOT NULL,
    role_at_time    VARCHAR(20)   NOT NULL,   -- snapshot of role when approved
    action          VARCHAR(10)   NOT NULL
                        CONSTRAINT CHK_DocApproval_action
                        CHECK (action IN ('REVIEW','APPROVE','REJECT')),
    comments        NVARCHAR(500) NULL,
    actioned_at     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_DocumentApproval PRIMARY KEY (approval_id),
    CONSTRAINT FK_DocApproval_revision FOREIGN KEY (revision_id)
        REFERENCES dbo.DocumentRevision(revision_id),
    CONSTRAINT FK_DocApproval_approver FOREIGN KEY (approver_id)
        REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- DOCUMENT DISTRIBUTION
-- Tracks which roles/positions must receive controlled copies
-- §7.5.3 — availability at point of use
-- ============================================================
CREATE TABLE dbo.DocumentDistribution (
    dist_id        INT           NOT NULL IDENTITY(1,1),
    document_id    INT           NOT NULL,
    role_name      VARCHAR(20)   NOT NULL,   -- RBAC role or department name
    copy_type      VARCHAR(10)   NOT NULL
                       CONSTRAINT CHK_DocDist_type
                       CHECK (copy_type IN ('CONTROLLED','UNCONTROLLED','ELECTRONIC')),
    notes          NVARCHAR(200) NULL,
    created_at     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_DocumentDistribution PRIMARY KEY (dist_id),
    CONSTRAINT FK_DocDist_document FOREIGN KEY (document_id)
        REFERENCES dbo.Document(document_id)
);
GO

-- ============================================================
-- RETENTION SCHEDULE
-- §7.5.3 (c) — retention period per document category
-- ============================================================
CREATE TABLE dbo.RetentionSchedule (
    retention_id      INT           NOT NULL IDENTITY(1,1),
    category_id       TINYINT       NOT NULL,
    regulation_ref    VARCHAR(50)   NOT NULL,   -- e.g. AS9100D §7.5, NADCAP AC7114
    retention_years   TINYINT       NOT NULL,
    disposal_method   NVARCHAR(100) NULL,       -- Shred, Archive, Delete
    notes             NVARCHAR(300) NULL,
    created_at        DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT PK_RetentionSchedule PRIMARY KEY (retention_id),
    CONSTRAINT UQ_Retention_category UNIQUE (category_id),
    CONSTRAINT FK_Retention_category FOREIGN KEY (category_id)
        REFERENCES dbo.DocumentCategory(category_id)
);
GO

-- ============================================================
-- VIEW: Current approved revision per document
-- ============================================================
CREATE OR ALTER VIEW dbo.vw_DocumentCurrent AS
SELECT
    d.document_id,
    d.doc_number,
    d.title,
    d.process_area,
    d.is_controlled,
    d.retention_years,
    d.is_active,
    dc.code          AS category_code,
    dc.name          AS category_name,
    r.revision_id,
    r.revision_no,
    r.status         AS revision_status,
    r.effective_date,
    r.review_due_date,
    r.file_name,
    r.file_path,
    r.file_size_kb,
    r.change_summary,
    r.approved_at,
    DATEDIFF(DAY, GETUTCDATE(), r.review_due_date) AS days_until_review,
    owner.full_name  AS owner_name,
    approver.full_name AS approved_by_name
FROM dbo.Document d
INNER JOIN dbo.DocumentCategory dc ON d.category_id = dc.category_id
LEFT JOIN dbo.DocumentRevision r
    ON r.document_id = d.document_id
    AND r.status = 'APPROVED'
    AND r.superseded_at IS NULL
    AND r.obsoleted_at  IS NULL
LEFT JOIN dbo.Users owner    ON d.owner_id   = owner.user_id
LEFT JOIN dbo.Users approver ON r.approved_by = approver.user_id
WHERE d.is_active = 1;
GO

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================
CREATE OR ALTER TRIGGER trg_Document_Audit
ON dbo.Document
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog (user_id, username, lan_ip, action, table_name, record_id, module_id)
        SELECT 0, 'SYSTEM', '127.0.0.1',
               CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
               'Document', i.document_id, 'MOD-02'
        FROM inserted i;
    END
END;
GO

CREATE OR ALTER TRIGGER trg_DocumentRevision_Audit
ON dbo.DocumentRevision
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        INSERT INTO dbo.AuditLog (user_id, username, lan_ip, action, table_name, record_id, module_id)
        SELECT 0, 'SYSTEM', '127.0.0.1',
               CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
               'DocumentRevision', i.revision_id, 'MOD-02'
        FROM inserted i;
    END
END;
GO

-- ============================================================
-- SEED DATA — Document Categories
-- ============================================================
INSERT INTO dbo.DocumentCategory (code, name, description) VALUES
('QMS',   'Quality Manual',           'Top-level QMS manual and policy documents'),
('SOP',   'Standard Operating Procedure', 'Process SOPs for operations and QMS'),
('WI',    'Work Instruction',         'Step-by-step work instructions for NDT and plating'),
('FORM',  'Form / Record Template',   'Controlled forms and record templates'),
('SPEC',  'Specification',            'Customer and internal technical specifications'),
('DWG',   'Engineering Drawing',      'Engineering drawings and sketches'),
('NDT',   'NDT Procedure',            'FPI/MPT/ECT/UT process procedures per AC7114'),
('CERT',  'Certificate',              'Personnel and process certifications'),
('EXT',   'External Document',        'Customer, regulatory, or standards documents'),
('MISC',  'Miscellaneous',            'Other controlled documents');
GO

-- ============================================================
-- SEED DATA — Retention Schedule (NADCAP AC7114 / AS9100D)
-- ============================================================
INSERT INTO dbo.RetentionSchedule (category_id, regulation_ref, retention_years, disposal_method, notes)
SELECT category_id, ref, yrs, method, notes FROM (VALUES
    ('QMS',  'AS9100D §7.5.3',      10, 'Archive',        'QMS manual — retain entire active life + 10yr'),
    ('SOP',  'AS9100D §7.5.3',      10, 'Archive/Delete', 'SOPs — retain superseded for 10yr'),
    ('WI',   'NADCAP AC7114 §3',    10, 'Archive/Delete', 'NDT WIs — NADCAP mandates min 10yr'),
    ('FORM', 'AS9100D §7.5.3',       7, 'Shred',          'Completed records min 7yr'),
    ('SPEC', 'AS9100D §7.5.3',      10, 'Archive',        'Specs — retain while product active + 10yr'),
    ('DWG',  'AS9100D §7.5.3',      10, 'Archive',        'Drawings — same as specs'),
    ('NDT',  'NADCAP AC7114 §3.10', 10, 'Archive',        'NDT procedures — 10yr NADCAP requirement'),
    ('CERT', 'NAS410 §12',          10, 'Archive',        'Personnel certs — retain 10yr after expiry'),
    ('EXT',  'AS9100D §7.5.3',       5, 'Delete',         'External docs — 5yr after obsolescence'),
    ('MISC', 'AS9100D §7.5.3',       5, 'Shred/Delete',   'Misc — 5yr default')
) AS v(code, ref, yrs, method, notes)
INNER JOIN dbo.DocumentCategory c ON c.code = v.code;
GO

PRINT 'Migration 003_mod02_document_control.sql complete.';
GO
