-- =============================================================================
-- MOD-29 — Customer Qualification (lifecycle workflow)
-- Gap Analysis -> Close Gap -> Qualification -> Award -> Periodic Audit
-- AS9100D §8.4 / §9.2 | customer & NADCAP special-process approvals
-- Migration: 032_mod29_qualification.sql
-- Depends on: 030_mod28_pcm.sql (PcmCapability), 009 (Customer), 005 (Personnel),
--             004 (NCR), 013 (AuditPlan)
-- =============================================================================

USE ATCA_ERP_DB;
GO

CREATE TABLE dbo.CustomerQualification (
  qual_id        INT IDENTITY(1,1) PRIMARY KEY,
  qual_ref       NVARCHAR(20) NOT NULL UNIQUE,           -- QUAL-2026-0001
  customer_id    INT NULL REFERENCES dbo.Customer(customer_id),
  customer_name  NVARCHAR(200) NOT NULL,                 -- PCM categories incl. non-MOD09 names
  capability_id  INT NULL REFERENCES dbo.PcmCapability(capability_id),
  process_name   NVARCHAR(120) NOT NULL,                 -- snapshot from PCM
  specification  NVARCHAR(300) NOT NULL,                 -- customer spec being qualified to
  status         NVARCHAR(20) NOT NULL DEFAULT 'GAP_ANALYSIS'
                   CONSTRAINT CK_Qual_Status CHECK (status IN
                   ('GAP_ANALYSIS','GAP_CLOSURE','QUALIFICATION','AWARD','PERIODIC_AUDIT',
                    'ON_HOLD','REJECTED','EXPIRED','WITHDRAWN','RE_QUALIFY')),
  -- award
  certificate_no NVARCHAR(60)  NULL,
  approval_authority NVARCHAR(120) NULL,                 -- customer SQE / NADCAP / internal
  valid_from     DATE NULL,
  valid_to       DATE NULL,
  audit_interval_months INT NULL DEFAULT 12,
  next_audit_due DATE NULL,
  -- meta
  lead_id        INT NULL REFERENCES dbo.Personnel(personnel_id),
  notes          NVARCHAR(MAX) NULL,
  created_by     INT NOT NULL,
  created_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  is_active      BIT NOT NULL DEFAULT 1
);
GO

-- Stage 1/2 — gap items
CREATE TABLE dbo.QualGap (
  gap_id      INT IDENTITY(1,1) PRIMARY KEY,
  qual_id     INT NOT NULL REFERENCES dbo.CustomerQualification(qual_id),
  gap_no      INT NOT NULL,
  requirement NVARCHAR(MAX) NOT NULL,
  current_state NVARCHAR(MAX) NULL,
  gap_desc    NVARCHAR(MAX) NOT NULL,
  severity    NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                CONSTRAINT CK_Gap_Sev CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  action      NVARCHAR(MAX) NULL,
  owner_id    INT NULL REFERENCES dbo.Personnel(personnel_id),
  due_date    DATE NULL,
  evidence_ref NVARCHAR(200) NULL,
  status      NVARCHAR(12) NOT NULL DEFAULT 'OPEN'
                CONSTRAINT CK_Gap_Status CHECK (status IN ('OPEN','IN_PROGRESS','CLOSED')),
  closed_date DATE NULL,
  ncr_id      INT NULL REFERENCES dbo.NCR(ncr_id)
);
GO

-- Stage 3 — qualification activity (trial / FAI / audit)
CREATE TABLE dbo.QualActivity (
  activity_id INT IDENTITY(1,1) PRIMARY KEY,
  qual_id     INT NOT NULL REFERENCES dbo.CustomerQualification(qual_id),
  activity_type NVARCHAR(20) NOT NULL
                  CONSTRAINT CK_QAct_Type CHECK (activity_type IN
                  ('TRIAL','FAI','CUSTOMER_AUDIT','THIRD_PARTY_AUDIT','DOC_REVIEW')),
  activity_date DATE NULL,
  performed_by NVARCHAR(120) NULL,
  result      NVARCHAR(12) NULL
                CONSTRAINT CK_QAct_Result CHECK (result IS NULL OR result IN ('PASS','FAIL','CONDITIONAL')),
  report_ref  NVARCHAR(200) NULL,
  notes       NVARCHAR(MAX) NULL
);
GO

-- Stage 5 — periodic surveillance audits
CREATE TABLE dbo.QualPeriodicAudit (
  audit_id    INT IDENTITY(1,1) PRIMARY KEY,
  qual_id     INT NOT NULL REFERENCES dbo.CustomerQualification(qual_id),
  audit_no    INT NOT NULL,
  scheduled_date DATE NULL,
  actual_date  DATE NULL,
  auditor     NVARCHAR(120) NULL,
  result      NVARCHAR(12) NULL
                CONSTRAINT CK_QPA_Result CHECK (result IS NULL OR result IN ('PASS','FAIL','CONDITIONAL')),
  findings    NVARCHAR(MAX) NULL,
  audit_plan_id INT NULL,
  next_due    DATE NULL
);
GO

CREATE TABLE dbo.Mod29Sequence (seq_key NVARCHAR(20) PRIMARY KEY, last_num INT NOT NULL DEFAULT 0, last_year INT NOT NULL DEFAULT 2026);
INSERT INTO dbo.Mod29Sequence (seq_key, last_num, last_year) VALUES ('QUALIFICATION', 0, 2026);
GO

CREATE INDEX IX_Qual_Status ON dbo.CustomerQualification(status, is_active);
CREATE INDEX IX_Qual_NextAudit ON dbo.CustomerQualification(next_audit_due) WHERE next_audit_due IS NOT NULL;
GO

PRINT 'Migration 032 — MOD-29 Customer Qualification schema complete.';
GO
