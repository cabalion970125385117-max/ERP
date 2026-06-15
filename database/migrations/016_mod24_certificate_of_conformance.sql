-- =============================================================================
-- MOD-24: Certificate of Conformance (CoC)
-- AS9100D §8.6 | Customer Requirements | NADCAP first-article
-- Migration: 016_mod24_certificate_of_conformance.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

CREATE TABLE dbo.CertificateOfConformance (
    coc_id           INT IDENTITY(1,1) PRIMARY KEY,
    coc_number       NVARCHAR(20)  NOT NULL UNIQUE,    -- COC-YYYY-NNNN
    work_order_id    INT           NULL,               -- source WO (MOD-13)
    customer_id      INT           NULL,               -- MOD-09
    customer_name    NVARCHAR(200) NOT NULL,
    customer_po      NVARCHAR(100) NULL,
    part_number      NVARCHAR(100) NOT NULL,
    part_description NVARCHAR(200) NULL,
    part_serial_no   NVARCHAR(100) NULL,
    quantity_certified INT         NOT NULL DEFAULT 1,
    -- Processes certified on this CoC (flags)
    process_fpi      BIT           NOT NULL DEFAULT 0,
    process_mpt      BIT           NOT NULL DEFAULT 0,
    process_chem_bath BIT          NOT NULL DEFAULT 0,
    process_other    NVARCHAR(200) NULL,
    -- Standards / specs
    specification_refs NVARCHAR(500) NULL,            -- comma-sep list e.g. "AMS2647, AC7114 Rev F"
    purchase_order_requirement NVARCHAR(MAX) NULL,
    -- Traceability
    material_cert_ref NVARCHAR(200) NULL,
    inspection_report_ref NVARCHAR(200) NULL,
    -- Conformance statement
    conformance_statement NVARCHAR(MAX) NOT NULL
        DEFAULT N'We hereby certify that the product described above was produced, inspected and tested in accordance with the referenced specifications and requirements, and meets all applicable requirements.',
    exceptions_noted NVARCHAR(MAX) NULL,
    -- Status
    status           NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
                                                       -- DRAFT | ISSUED | SUPERSEDED | VOID
    issued_by_id     INT           NULL REFERENCES dbo.Personnel(personnel_id),
    issued_at        DATETIME2     NULL,
    approved_by_id   INT           NULL REFERENCES dbo.Personnel(personnel_id),
    approved_at      DATETIME2     NULL,
    void_reason      NVARCHAR(MAX) NULL,
    superseded_by_id INT           NULL,               -- self-ref to newer CoC
    -- Delivery link
    delivery_order_id INT          NULL,               -- MOD-09 DeliveryOrder
    -- Metadata
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active        BIT           NOT NULL DEFAULT 1
);

-- Job/process line items included in this CoC
CREATE TABLE dbo.CocLineItem (
    coc_line_id      INT IDENTITY(1,1) PRIMARY KEY,
    coc_id           INT           NOT NULL REFERENCES dbo.CertificateOfConformance(coc_id),
    line_seq         INT           NOT NULL,
    process_module   NVARCHAR(10)  NOT NULL,           -- MOD03 | MOD17 | MOD06 | MOD10
    reference_id     INT           NOT NULL,           -- fpi_job_id / mpt_job_id / route_card_id etc.
    reference_number NVARCHAR(50)  NOT NULL,           -- human readable job number
    process_description NVARCHAR(200) NOT NULL,
    result           NVARCHAR(20)  NOT NULL,           -- ACCEPT | REJECT | CONDITIONAL
    notes            NVARCHAR(MAX) NULL
);

-- Sequence
CREATE TABLE dbo.Mod24Sequence (
    seq_key   NVARCHAR(30) PRIMARY KEY,
    last_num  INT NOT NULL DEFAULT 0,
    last_year INT NOT NULL DEFAULT 0
);

INSERT INTO dbo.Mod24Sequence (seq_key, last_num, last_year) VALUES
    ('COC', 0, 2026);
GO
