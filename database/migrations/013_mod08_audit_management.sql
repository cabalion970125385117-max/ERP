-- =============================================================================
-- MOD-08: Audit Management
-- AS9100D §9.2 Internal Audit | NADCAP Audit Readiness
-- Migration: 013_mod08_audit_management.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- Audit Schedule / Plan
CREATE TABLE dbo.AuditPlan (
    audit_plan_id    INT IDENTITY(1,1) PRIMARY KEY,
    audit_number     NVARCHAR(20)  NOT NULL UNIQUE,   -- AP-YYYY-NNNN
    audit_title      NVARCHAR(200) NOT NULL,
    audit_type       NVARCHAR(30)  NOT NULL,           -- INTERNAL | NADCAP | CUSTOMER | SUPPLIER
    audit_scope      NVARCHAR(500) NOT NULL,
    standard_ref     NVARCHAR(100) NULL,               -- e.g. AS9100D §9.2, AC7114
    planned_date     DATE          NOT NULL,
    actual_date      DATE          NULL,
    lead_auditor_id  INT           NULL REFERENCES dbo.Personnel(personnel_id),
    lead_auditor_name NVARCHAR(100) NULL,              -- fallback if not in Personnel
    auditee_dept     NVARCHAR(100) NOT NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'PLANNED',
                                                       -- PLANNED | IN_PROGRESS | COMPLETE | CANCELLED
    summary_findings NVARCHAR(MAX) NULL,
    overall_result   NVARCHAR(20)  NULL,               -- SATISFACTORY | MINOR_NC | MAJOR_NC | CRITICAL
    closed_date      DATE          NULL,
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active        BIT           NOT NULL DEFAULT 1
);

-- Audit Findings (individual observations per audit)
CREATE TABLE dbo.AuditFinding (
    finding_id       INT IDENTITY(1,1) PRIMARY KEY,
    audit_plan_id    INT           NOT NULL REFERENCES dbo.AuditPlan(audit_plan_id),
    finding_number   NVARCHAR(20)  NOT NULL,           -- AF-YYYY-NNNN
    finding_type     NVARCHAR(20)  NOT NULL,           -- OBSERVATION | MINOR_NC | MAJOR_NC | OPPORTUNITY
    clause_reference NVARCHAR(100) NULL,               -- e.g. AS9100D §8.5.1
    description      NVARCHAR(MAX) NOT NULL,
    objective_evidence NVARCHAR(MAX) NULL,
    assigned_to_id   INT           NULL REFERENCES dbo.Personnel(personnel_id),
    assigned_to_name NVARCHAR(100) NULL,
    due_date         DATE          NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'OPEN',
                                                       -- OPEN | RESPONSE_SUBMITTED | VERIFIED | CLOSED
    ncr_id           INT           NULL,               -- link to NCR if raised
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active        BIT           NOT NULL DEFAULT 1
);

-- Audit Response / Corrective Action for each finding
CREATE TABLE dbo.AuditResponse (
    response_id      INT IDENTITY(1,1) PRIMARY KEY,
    finding_id       INT           NOT NULL REFERENCES dbo.AuditFinding(finding_id),
    root_cause       NVARCHAR(MAX) NULL,
    correction       NVARCHAR(MAX) NULL,               -- immediate fix
    corrective_action NVARCHAR(MAX) NULL,              -- systemic fix
    target_date      DATE          NULL,
    completion_date  DATE          NULL,
    verified_by_id   INT           NULL REFERENCES dbo.Personnel(personnel_id),
    verified_date    DATE          NULL,
    verification_evidence NVARCHAR(MAX) NULL,
    submitted_by     INT           NOT NULL,
    submitted_at     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Audit Checklist Items (per audit plan — NADCAP checklist lines)
CREATE TABLE dbo.AuditChecklistItem (
    checklist_item_id INT IDENTITY(1,1) PRIMARY KEY,
    audit_plan_id    INT           NOT NULL REFERENCES dbo.AuditPlan(audit_plan_id),
    item_seq         INT           NOT NULL,
    requirement_ref  NVARCHAR(100) NOT NULL,           -- e.g. AC7114 §3.2.1
    question_text    NVARCHAR(500) NOT NULL,
    response         NVARCHAR(10)  NULL,               -- YES | NO | N/A
    notes            NVARCHAR(MAX) NULL,
    finding_id       INT           NULL REFERENCES dbo.AuditFinding(finding_id)
);

-- Sequence for auto-numbering
CREATE TABLE dbo.Mod08Sequence (
    seq_key   NVARCHAR(30) PRIMARY KEY,
    last_num  INT NOT NULL DEFAULT 0,
    last_year INT NOT NULL DEFAULT 0
);

INSERT INTO dbo.Mod08Sequence (seq_key, last_num, last_year) VALUES
    ('AUDIT_PLAN', 0, 2026),
    ('AUDIT_FINDING', 0, 2026);
GO
