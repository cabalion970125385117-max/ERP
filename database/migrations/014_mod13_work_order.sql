-- =============================================================================
-- MOD-13: Work Order / Job Traveler
-- AS9100D §8.1 Operational Planning | NADCAP Process Control
-- Migration: 014_mod13_work_order.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- Work Order header
CREATE TABLE dbo.WorkOrder (
    work_order_id    INT IDENTITY(1,1) PRIMARY KEY,
    wo_number        NVARCHAR(20)  NOT NULL UNIQUE,    -- WO-YYYY-NNNN
    job_title        NVARCHAR(200) NOT NULL,
    customer_id      INT           NULL,               -- FK to Customer (MOD-09)
    customer_name    NVARCHAR(200) NULL,               -- denormalised fallback
    part_number      NVARCHAR(100) NULL,               -- FK to PartMaster (MOD-09)
    part_description NVARCHAR(200) NULL,
    quantity         INT           NOT NULL DEFAULT 1,
    order_reference  NVARCHAR(100) NULL,               -- PO / quotation ref
    contract_review_id INT         NULL,               -- link to MOD-09 ContractReview
    priority         NVARCHAR(10)  NOT NULL DEFAULT 'NORMAL', -- LOW | NORMAL | HIGH | URGENT
    planned_start    DATE          NULL,
    planned_end      DATE          NULL,
    actual_start     DATE          NULL,
    actual_end       DATE          NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
                                                       -- DRAFT | ISSUED | IN_PROGRESS | PENDING_QA | COMPLETE | CANCELLED
    assigned_supervisor_id INT     NULL REFERENCES dbo.Personnel(personnel_id),
    special_instructions NVARCHAR(MAX) NULL,
    traveler_locked  BIT           NOT NULL DEFAULT 0, -- once locked, steps can't be reordered
    coc_issued       BIT           NOT NULL DEFAULT 0, -- Certificate of Conformance issued?
    coc_id           INT           NULL,               -- FK to CertificateOfConformance (MOD-24)
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active        BIT           NOT NULL DEFAULT 1
);

-- Work Order Steps (Traveler steps — sequenced operations)
CREATE TABLE dbo.WoStep (
    step_id          INT IDENTITY(1,1) PRIMARY KEY,
    work_order_id    INT           NOT NULL REFERENCES dbo.WorkOrder(work_order_id),
    step_seq         INT           NOT NULL,
    step_name        NVARCHAR(200) NOT NULL,           -- e.g. "FPI Inspection", "MPT Inspection", "Chemical Bath"
    process_type     NVARCHAR(20)  NULL,               -- FPI | MPT | CHEM_BATH | VISUAL | OTHER
    instruction      NVARCHAR(MAX) NULL,
    standard_ref     NVARCHAR(100) NULL,               -- e.g. AC7114 §4.1
    -- Link to process modules (one of these will be set)
    fpi_job_id       INT           NULL,               -- MOD-03 FpiJob
    route_card_id    INT           NULL,               -- MOD-10 RouteCard
    bath_id          INT           NULL,               -- MOD-06 ChemicalBath
    -- Completion tracking
    status           NVARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                                                       -- PENDING | IN_PROGRESS | COMPLETE | SKIPPED | FAILED
    assigned_to_id   INT           NULL REFERENCES dbo.Personnel(personnel_id),
    completed_by_id  INT           NULL REFERENCES dbo.Personnel(personnel_id),
    completed_at     DATETIME2     NULL,
    sign_off_notes   NVARCHAR(MAX) NULL,
    is_mandatory     BIT           NOT NULL DEFAULT 1
);

-- Documents attached to a Work Order (specs, drawings, procedures)
CREATE TABLE dbo.WoDocument (
    wo_doc_id        INT IDENTITY(1,1) PRIMARY KEY,
    work_order_id    INT           NOT NULL REFERENCES dbo.WorkOrder(work_order_id),
    document_title   NVARCHAR(200) NOT NULL,
    document_ref     NVARCHAR(100) NULL,               -- doc number
    doc_control_id   INT           NULL,               -- FK to ControlledDocument (MOD-02)
    attached_by      INT           NOT NULL,
    attached_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Work Order Notes / Activity log
CREATE TABLE dbo.WoNote (
    note_id          INT IDENTITY(1,1) PRIMARY KEY,
    work_order_id    INT           NOT NULL REFERENCES dbo.WorkOrder(work_order_id),
    note_type        NVARCHAR(20)  NOT NULL DEFAULT 'NOTE', -- NOTE | STATUS_CHANGE | HOLD | ALERT
    note_text        NVARCHAR(MAX) NOT NULL,
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Sequence for auto-numbering
CREATE TABLE dbo.Mod13Sequence (
    seq_key   NVARCHAR(30) PRIMARY KEY,
    last_num  INT NOT NULL DEFAULT 0,
    last_year INT NOT NULL DEFAULT 0
);

INSERT INTO dbo.Mod13Sequence (seq_key, last_num, last_year) VALUES
    ('WORK_ORDER', 0, 2026);
GO
