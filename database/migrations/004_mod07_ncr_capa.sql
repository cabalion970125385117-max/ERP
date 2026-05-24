-- ============================================================
-- ATCA-ERP | DATABASE MIGRATION 004
-- MOD-07: NCR & CAPA Management
-- AS9100D §8.7 (Nonconforming Outputs) | §10.2 (Nonconformity & CA)
-- NADCAP AC7114 | NAS410 §10
-- Run after 003_mod02_document_control.sql
-- ============================================================

USE ATCA_ERP_DB;
GO

-- ============================================================
-- TABLE: dbo.NCR — Nonconformance Reports
-- AS9100D §8.7 — Control of Nonconforming Outputs
-- ============================================================
CREATE TABLE dbo.NCR (
    ncr_id              INT             NOT NULL IDENTITY(1,1),
    ncr_ref             NVARCHAR(20)    NOT NULL,       -- e.g. NCR-2026-001
    ncr_type            NVARCHAR(15)    NOT NULL
                            CONSTRAINT chk_ncr_type CHECK (
                                ncr_type IN ('PRODUCT','PROCESS','SYSTEM','CUSTOMER','SUPPLIER')),
    source              NVARCHAR(20)    NOT NULL DEFAULT 'INTERNAL'
                            CONSTRAINT chk_ncr_source CHECK (
                                source IN ('INTERNAL','CUSTOMER','AUDIT','SUPPLIER','SELF_INSPECTION')),
    detected_date       DATE            NOT NULL,
    process_area        NVARCHAR(50)    NULL,           -- FPI, MPT, ECT, UT, Plating, General
    description         NVARCHAR(MAX)   NOT NULL,       -- What was found nonconforming
    part_number         NVARCHAR(100)   NULL,
    lot_number          NVARCHAR(50)    NULL,
    work_order_ref      NVARCHAR(50)    NULL,
    customer_ref        NVARCHAR(100)   NULL,           -- PO or job ref if customer-reported
    detected_by         INT             NOT NULL,       -- FK → Users
    -- Immediate Containment
    immediate_action    NVARCHAR(MAX)   NULL,
    -- MRB Disposition (§8.7.1)
    disposition         NVARCHAR(25)    NULL
                            CONSTRAINT chk_ncr_disp CHECK (
                                disposition IS NULL OR
                                disposition IN ('USE_AS_IS','REPAIR','REWORK','SCRAP',
                                                'RETURN_TO_SUPPLIER','TBD','PENDING_MRB')),
    disposition_rationale NVARCHAR(MAX) NULL,
    disposition_by      INT             NULL,           -- FK → Users (MRB authority)
    disposition_date    DATE            NULL,
    -- CAPA linkage
    capa_required       BIT             NOT NULL DEFAULT 0,
    -- Overall status
    status              NVARCHAR(20)    NOT NULL DEFAULT 'OPEN'
                            CONSTRAINT chk_ncr_status CHECK (
                                status IN ('OPEN','IN_REVIEW','CAPA_REQUIRED',
                                           'CAPA_IN_PROGRESS','CLOSED','CANCELLED')),
    closed_date         DATE            NULL,
    closed_by           INT             NULL,
    -- Audit trail
    is_active           BIT             NOT NULL DEFAULT 1,
    created_by          INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_ncr              PRIMARY KEY (ncr_id),
    CONSTRAINT uq_ncr_ref          UNIQUE (ncr_ref),
    CONSTRAINT fk_ncr_detected_by  FOREIGN KEY (detected_by)   REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_ncr_disposed_by  FOREIGN KEY (disposition_by) REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_ncr_closed_by    FOREIGN KEY (closed_by)      REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_ncr_created_by   FOREIGN KEY (created_by)     REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.CAPA — Corrective & Preventive Action
-- AS9100D §10.2 — Nonconformity and Corrective Action
-- ============================================================
CREATE TABLE dbo.CAPA (
    capa_id                 INT             NOT NULL IDENTITY(1,1),
    capa_ref                NVARCHAR(20)    NOT NULL,       -- e.g. CAPA-2026-001
    ncr_id                  INT             NULL,           -- FK → NCR (nullable for standalone)
    capa_type               NVARCHAR(12)    NOT NULL DEFAULT 'CORRECTIVE'
                                CONSTRAINT chk_capa_type CHECK (
                                    capa_type IN ('CORRECTIVE','PREVENTIVE')),
    -- Root Cause Analysis
    root_cause_method       NVARCHAR(15)    NULL
                                CONSTRAINT chk_capa_rcm CHECK (
                                    root_cause_method IS NULL OR
                                    root_cause_method IN ('5WHY','FISHBONE','FMEA','FAULT_TREE','OTHER')),
    root_cause_description  NVARCHAR(MAX)   NULL,
    -- Actions
    corrective_action       NVARCHAR(MAX)   NULL,
    preventive_action       NVARCHAR(MAX)   NULL,
    -- Ownership & Dates
    owner_user_id           INT             NOT NULL,
    target_completion_date  DATE            NOT NULL,
    actual_completion_date  DATE            NULL,
    -- Effectiveness Review (§10.2.1 e)
    effectiveness_review_date DATE          NULL,
    effectiveness_result    NVARCHAR(25)    NULL
                                CONSTRAINT chk_capa_eff CHECK (
                                    effectiveness_result IS NULL OR
                                    effectiveness_result IN ('EFFECTIVE','PARTIALLY_EFFECTIVE',
                                                             'NOT_EFFECTIVE','PENDING')),
    effectiveness_notes     NVARCHAR(MAX)   NULL,
    -- Status
    status                  NVARCHAR(22)    NOT NULL DEFAULT 'OPEN'
                                CONSTRAINT chk_capa_status CHECK (
                                    status IN ('OPEN','IN_PROGRESS',
                                               'PENDING_VERIFICATION','CLOSED','CANCELLED')),
    closed_by               INT             NULL,
    closed_at               DATETIME2       NULL,
    -- Audit trail
    is_active               BIT             NOT NULL DEFAULT 1,
    created_by              INT             NOT NULL,
    created_at              DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_capa              PRIMARY KEY (capa_id),
    CONSTRAINT uq_capa_ref          UNIQUE (capa_ref),
    CONSTRAINT fk_capa_ncr          FOREIGN KEY (ncr_id)         REFERENCES dbo.NCR(ncr_id),
    CONSTRAINT fk_capa_owner        FOREIGN KEY (owner_user_id)  REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_capa_closed_by    FOREIGN KEY (closed_by)      REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_capa_created_by   FOREIGN KEY (created_by)     REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- VIEW: NCR with related info
-- ============================================================
CREATE VIEW dbo.vw_NCR AS
SELECT
    n.ncr_id, n.ncr_ref, n.ncr_type, n.source,
    n.detected_date, n.process_area,
    n.description, n.part_number, n.lot_number,
    n.work_order_ref, n.customer_ref,
    n.immediate_action, n.disposition, n.disposition_rationale,
    n.disposition_date, n.capa_required,
    n.status, n.closed_date, n.created_at, n.updated_at,
    u_det.full_name  AS detected_by_name,
    u_disp.full_name AS disposition_by_name,
    u_cl.full_name   AS closed_by_name,
    u_cr.full_name   AS created_by_name,
    (SELECT COUNT(*) FROM dbo.CAPA c WHERE c.ncr_id = n.ncr_id AND c.is_active = 1) AS capa_count,
    (SELECT COUNT(*) FROM dbo.CAPA c WHERE c.ncr_id = n.ncr_id
        AND c.is_active = 1 AND c.status NOT IN ('CLOSED','CANCELLED')) AS open_capa_count
FROM dbo.NCR n
LEFT JOIN dbo.Users u_det  ON u_det.user_id  = n.detected_by
LEFT JOIN dbo.Users u_disp ON u_disp.user_id = n.disposition_by
LEFT JOIN dbo.Users u_cl   ON u_cl.user_id   = n.closed_by
LEFT JOIN dbo.Users u_cr   ON u_cr.user_id   = n.created_by
WHERE n.is_active = 1;
GO

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================
CREATE TRIGGER trg_NCR_Audit
ON dbo.NCR
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'NCR', CAST(i.ncr_id AS NVARCHAR(50)), 'MOD-07'
    FROM inserted i;
END;
GO

CREATE TRIGGER trg_CAPA_Audit
ON dbo.CAPA
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'CAPA', CAST(i.capa_id AS NVARCHAR(50)), 'MOD-07'
    FROM inserted i;
END;
GO

-- Add MOD-07 alert types
ALTER TABLE dbo.AlertLog DROP CONSTRAINT chk_alert_type;
GO
ALTER TABLE dbo.AlertLog ADD CONSTRAINT chk_alert_type CHECK (
    alert_type IN ('CERT_EXPIRY','EYE_EXAM_EXPIRY','CAL_OVERDUE','BATH_OUT_OF_SPEC',
                   'CAPA_OVERDUE','NCR_OPEN','REVIEW_DUE','CAPA_EFFECTIVENESS_DUE')
);
GO

PRINT 'Migration 004 — MOD-07 NCR & CAPA: COMPLETE';
GO
