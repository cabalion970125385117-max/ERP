-- =============================================================
-- ATCA-ERP v1.0 — Migration 012: MOD-19 Extended Laboratory
-- AS9100D §7.1.5 (Monitoring & Measurement Resources)
-- NADCAP AC7108 (Chemical Processing) | AC7114 (FPI) | AC7110 (MPT)
-- Created: 2026-06-13
-- Depends on: 005_mod04_personnel.sql, 007_mod06_bath_control.sql
-- =============================================================

USE ATCA_ERP_DB;
GO

-- ── Analysis Schedule ─────────────────────────────────────────
-- Master schedule of required lab analyses (chemical, bath, environmental)
CREATE TABLE dbo.AnalysisSchedule (
  schedule_id      INT IDENTITY(1,1) PRIMARY KEY,
  schedule_ref     NVARCHAR(20)   NOT NULL UNIQUE,   -- AS-2026-0001
  analysis_name    NVARCHAR(200)  NOT NULL,
  analysis_type    NVARCHAR(30)   NOT NULL
    CHECK (analysis_type IN ('CHEMICAL','PHYSICAL','MICROBIOLOGICAL','ENVIRONMENTAL','OTHER')),
  process_area     NVARCHAR(50)   NULL,
  bath_id          INT            NULL,              -- optional link to ChemBath
  frequency_type   NVARCHAR(20)   NOT NULL
    CHECK (frequency_type IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL','ON_DEMAND')),
  frequency_days   INT            NULL,
  next_due_date    DATE           NULL,
  last_done_date   DATE           NULL,
  responsible_id   INT            NULL REFERENCES dbo.Personnel(personnel_id),
  method_ref       NVARCHAR(100)  NULL,   -- test method, e.g. ASTM D1881
  acceptance_criteria NVARCHAR(300) NULL,
  external_lab     BIT            NOT NULL DEFAULT 0,
  external_lab_name NVARCHAR(200) NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_by       INT            NULL REFERENCES dbo.Users(user_id),
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Analysis Result Record ────────────────────────────────────
CREATE TABLE dbo.AnalysisResult (
  result_id        INT IDENTITY(1,1) PRIMARY KEY,
  result_ref       NVARCHAR(20)   NOT NULL UNIQUE,   -- AR-2026-0001
  schedule_id      INT            NOT NULL REFERENCES dbo.AnalysisSchedule(schedule_id),
  test_date        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  tested_by        INT            NULL REFERENCES dbo.Personnel(personnel_id),
  external_cert_no NVARCHAR(100)  NULL,
  result_value     NVARCHAR(300)  NULL,
  result_unit      NVARCHAR(50)   NULL,
  pass_fail        NVARCHAR(10)   NOT NULL
    CHECK (pass_fail IN ('PASS','FAIL','INCONCLUSIVE','PENDING')),
  out_of_spec      BIT            NOT NULL DEFAULT 0,
  corrective_action NVARCHAR(MAX) NULL,
  report_attached  BIT            NOT NULL DEFAULT 0,
  result_notes     NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Chemical Inventory ────────────────────────────────────────
-- Full inventory of chemicals with SDS/MSDS tracking
CREATE TABLE dbo.ChemicalInventory (
  chem_id          INT IDENTITY(1,1) PRIMARY KEY,
  chem_code        NVARCHAR(20)   NOT NULL UNIQUE,   -- CHEM-001
  chem_name        NVARCHAR(200)  NOT NULL,
  cas_number       NVARCHAR(20)   NULL,
  supplier_name    NVARCHAR(200)  NULL,
  grade            NVARCHAR(50)   NULL,
  process_use      NVARCHAR(100)  NULL,   -- FPI penetrant, MPT particle, etc.
  unit_of_measure  NVARCHAR(20)   NOT NULL DEFAULT 'L',
  qty_on_hand      DECIMAL(12,3)  NOT NULL DEFAULT 0,
  qty_minimum      DECIMAL(12,3)  NULL,
  location         NVARCHAR(100)  NULL,
  sds_version      NVARCHAR(20)   NULL,
  sds_date         DATE           NULL,
  sds_next_review  DATE           NULL,
  hazard_class     NVARCHAR(100)  NULL,
  storage_condition NVARCHAR(200) NULL,
  disposal_notes   NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_by       INT            NULL REFERENCES dbo.Users(user_id),
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Chemical Transaction (receipts / issues / disposals) ─────
CREATE TABLE dbo.ChemicalTransaction (
  txn_id           INT IDENTITY(1,1) PRIMARY KEY,
  chem_id          INT            NOT NULL REFERENCES dbo.ChemicalInventory(chem_id),
  txn_type         NVARCHAR(20)   NOT NULL
    CHECK (txn_type IN ('RECEIPT','ISSUE','DISPOSAL','ADJUSTMENT','RETURN')),
  txn_date         DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  qty              DECIMAL(12,3)  NOT NULL,
  batch_lot_no     NVARCHAR(100)  NULL,
  expiry_date      DATE           NULL,
  reference_no     NVARCHAR(100)  NULL,   -- GRN ref, work order ref, etc.
  performed_by     INT            NOT NULL REFERENCES dbo.Users(user_id),
  txn_notes        NVARCHAR(MAX)  NULL
);
GO

-- ── Lab Validation Record ─────────────────────────────────────
-- Equipment validation / correlation / method validation
CREATE TABLE dbo.LabValidationRecord (
  validation_id    INT IDENTITY(1,1) PRIMARY KEY,
  validation_ref   NVARCHAR(20)   NOT NULL UNIQUE,   -- LV-2026-0001
  validation_type  NVARCHAR(30)   NOT NULL
    CHECK (validation_type IN ('METHOD','EQUIPMENT','INTER_LAB','UNCERTAINTY','LINEARITY','OTHER')),
  description      NVARCHAR(300)  NOT NULL,
  equipment_id     INT            NULL,              -- optional FK to Equipment
  process_area     NVARCHAR(50)   NULL,
  standard_ref     NVARCHAR(100)  NULL,
  validation_date  DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  next_review_date DATE           NULL,
  performed_by     INT            NOT NULL REFERENCES dbo.Personnel(personnel_id),
  approved_by      INT            NULL REFERENCES dbo.Personnel(personnel_id),
  approved_at      DATE           NULL,
  result           NVARCHAR(20)   NOT NULL
    CHECK (result IN ('VALID','INVALID','CONDITIONAL','PENDING')),
  validation_notes NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── External Lab Management ───────────────────────────────────
CREATE TABLE dbo.ExternalLab (
  lab_id           INT IDENTITY(1,1) PRIMARY KEY,
  lab_code         NVARCHAR(20)   NOT NULL UNIQUE,   -- ELAB-001
  lab_name         NVARCHAR(200)  NOT NULL,
  accreditation_body NVARCHAR(100) NULL,   -- SAC-SINGLAS, A2LA, etc.
  accreditation_no  NVARCHAR(100) NULL,
  accreditation_expiry DATE       NULL,
  scope_summary    NVARCHAR(500)  NULL,
  contact_person   NVARCHAR(100)  NULL,
  email            NVARCHAR(150)  NULL,
  phone            NVARCHAR(30)   NULL,
  address          NVARCHAR(500)  NULL,
  approved_status  NVARCHAR(20)   NOT NULL DEFAULT 'APPROVED'
    CHECK (approved_status IN ('APPROVED','PROVISIONAL','SUSPENDED','REMOVED')),
  last_audit_date  DATE           NULL,
  next_audit_date  DATE           NULL,
  notes            NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_by       INT            NULL REFERENCES dbo.Users(user_id),
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── External Lab Job (sample submission) ─────────────────────
CREATE TABLE dbo.ExternalLabJob (
  ext_job_id       INT IDENTITY(1,1) PRIMARY KEY,
  ext_job_ref      NVARCHAR(20)   NOT NULL UNIQUE,   -- ELJ-2026-0001
  lab_id           INT            NOT NULL REFERENCES dbo.ExternalLab(lab_id),
  schedule_id      INT            NULL REFERENCES dbo.AnalysisSchedule(schedule_id),
  submitted_date   DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  sample_desc      NVARCHAR(300)  NOT NULL,
  tests_requested  NVARCHAR(MAX)  NULL,
  expected_by      DATE           NULL,
  received_date    DATE           NULL,
  cert_number      NVARCHAR(100)  NULL,
  result_summary   NVARCHAR(MAX)  NULL,
  pass_fail        NVARCHAR(15)   NULL
    CHECK (pass_fail IN ('PASS','FAIL','INCONCLUSIVE','PENDING',NULL)),
  submitted_by     INT            NOT NULL REFERENCES dbo.Users(user_id),
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Auto-number sequences ─────────────────────────────────────
CREATE TABLE dbo.Mod19Sequence (
  seq_key   NVARCHAR(20) NOT NULL PRIMARY KEY,
  last_num  INT          NOT NULL DEFAULT 0
);
GO
INSERT INTO dbo.Mod19Sequence (seq_key, last_num) VALUES
  ('ANALYSIS_SCHEDULE', 0), ('ANALYSIS_RESULT', 0),
  ('CHEMICAL', 0), ('LAB_VALIDATION', 0),
  ('EXTERNAL_LAB', 0), ('EXT_LAB_JOB', 0);
GO

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IX_AnalysisSchedule_Due  ON dbo.AnalysisSchedule(next_due_date, is_active);
CREATE INDEX IX_ChemInventory_Level   ON dbo.ChemicalInventory(qty_on_hand, is_active);
CREATE INDEX IX_ExtLab_Accred         ON dbo.ExternalLab(accreditation_expiry, approved_status);
CREATE INDEX IX_LabValidation_Review  ON dbo.LabValidationRecord(next_review_date, is_active);
GO

PRINT 'Migration 012 — MOD-19 Extended Laboratory complete.';
