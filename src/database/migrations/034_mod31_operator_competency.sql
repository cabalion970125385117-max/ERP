-- =============================================================================
-- MOD-31 — Operator Competency & PIN Sign-off (electronic signature)
-- NAS410 | AS9100D §7.2 | NADCAP frozen-process / operator approval
-- Migration: 034_mod31_operator_competency.sql
-- Depends on: 005 (Personnel)
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- ── Operator PIN (non-transferable electronic-signature credential) ──────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Personnel') AND name='operator_pin_hash')
  ALTER TABLE dbo.Personnel
    ADD operator_pin_hash NVARCHAR(200) NULL,           -- bcrypt; set/reset by SUPERVISOR+
        pin_set_at        DATETIME2 NULL;
GO

-- ── Competency matrix: operator × process × customer × bay ──────────────────
CREATE TABLE dbo.OperatorCompetency (
  competency_id  INT IDENTITY(1,1) PRIMARY KEY,
  personnel_id   INT NOT NULL REFERENCES dbo.Personnel(personnel_id),
  process_area   NVARCHAR(120) NOT NULL,                 -- 'Anodizing','FPI','Electroless Nickel',...
  customer_category NVARCHAR(120) NULL,                  -- spec-specific approval (Boeing, P&W…) or NULL = general
  bay            NVARCHAR(20)  NULL,
  capability_id  INT NULL REFERENCES dbo.PcmCapability(capability_id),  -- link to PCM
  approval_level NVARCHAR(20) NOT NULL DEFAULT 'OPERATOR'
                   CONSTRAINT CK_OC_Level CHECK (approval_level IN ('TRAINEE','OPERATOR','SIGNATORY','TRAINER')),
  approved_date  DATE NULL,
  expiry_date    DATE NULL,
  approver_id    INT NULL REFERENCES dbo.Personnel(personnel_id),
  evidence_ref   NVARCHAR(200) NULL,                     -- training record / cert
  status         NVARCHAR(12) NOT NULL DEFAULT 'ACTIVE'
                   CONSTRAINT CK_OC_Status CHECK (status IN ('ACTIVE','SUSPENDED','EXPIRED','REVOKED')),
  notes          NVARCHAR(MAX) NULL,
  created_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  is_active      BIT NOT NULL DEFAULT 1
);
GO
CREATE INDEX IX_OC_Person ON dbo.OperatorCompetency(personnel_id, is_active);
CREATE INDEX IX_OC_Process ON dbo.OperatorCompetency(process_area, customer_category);
GO

-- ── Sign-off log = the electronic-signature records (non-repudiable) ─────────
CREATE TABLE dbo.OperatorSignoff (
  signoff_id   INT IDENTITY(1,1) PRIMARY KEY,
  personnel_id INT NOT NULL REFERENCES dbo.Personnel(personnel_id),
  competency_id INT NULL REFERENCES dbo.OperatorCompetency(competency_id),
  action       NVARCHAR(120) NOT NULL,                   -- 'FPI step 7 sign-off','Anodize bath check'
  module_id    NVARCHAR(10)  NULL,                        -- 'MOD-03','MOD-06','MOD-13'
  record_ref   NVARCHAR(60)  NULL,                        -- job/step/bath reference
  process_area NVARCHAR(120) NULL,
  signed_at    DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  lan_ip       NVARCHAR(45)  NULL,
  pin_verified BIT NOT NULL DEFAULT 1                      -- always 1 (insert only on verified PIN)
);
GO

PRINT 'Migration 034 — MOD-31 Operator Competency & PIN sign-off complete.';
GO
