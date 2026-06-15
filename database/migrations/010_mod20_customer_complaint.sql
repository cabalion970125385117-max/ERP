-- =============================================================
-- ATCA-ERP v1.0 — Migration 010: MOD-20 Customer Complaint & 8D
-- AS9100D §9.1.2 (Customer Satisfaction) | §10.2 (NCR & Corrective Action)
-- NADCAP AC7114 §10 (Customer Complaints)
-- Created: 2026-06-13
-- Depends on: 009_mod09_sales_customer_service.sql (Customer)
-- =============================================================

USE ATCA_ERP_DB;
GO

-- ── Customer Complaint ────────────────────────────────────────
CREATE TABLE dbo.CustomerComplaint (
  complaint_id     INT IDENTITY(1,1) PRIMARY KEY,
  complaint_ref    NVARCHAR(20)   NOT NULL UNIQUE,   -- CC-2026-0001
  customer_id      INT            NULL REFERENCES dbo.Customer(customer_id),
  customer_name    NVARCHAR(200)  NULL,              -- allow free-text if customer not in system
  contact_name     NVARCHAR(100)  NULL,
  contact_email    NVARCHAR(150)  NULL,
  received_date    DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  complaint_type   NVARCHAR(30)   NOT NULL
    CHECK (complaint_type IN ('QUALITY','DELIVERY','SERVICE','DOCUMENTATION','SAFETY','OTHER')),
  severity         NVARCHAR(10)   NOT NULL DEFAULT 'MEDIUM'
    CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  subject          NVARCHAR(300)  NOT NULL,
  description      NVARCHAR(MAX)  NOT NULL,
  part_number      NVARCHAR(100)  NULL,
  job_ref          NVARCHAR(50)   NULL,
  po_number        NVARCHAR(100)  NULL,
  ncr_id           INT            NULL,              -- FK to NCR (optional cross-link)
  status           NVARCHAR(30)   NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','UNDER_REVIEW','8D_IN_PROGRESS','CLOSED','WITHDRAWN')),
  target_close_date DATE          NULL,
  closed_date      DATE           NULL,
  owned_by         INT            NULL REFERENCES dbo.Users(user_id),
  created_by       INT            NOT NULL REFERENCES dbo.Users(user_id),
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── 8D Report ─────────────────────────────────────────────────
-- One 8D per complaint (one-to-one). Each D is a structured text field.
CREATE TABLE dbo.EightDReport (
  report_id        INT IDENTITY(1,1) PRIMARY KEY,
  report_ref       NVARCHAR(20)   NOT NULL UNIQUE,   -- 8D-2026-0001
  complaint_id     INT            NOT NULL UNIQUE REFERENCES dbo.CustomerComplaint(complaint_id),

  -- D1: Team formation
  d1_team_leader   NVARCHAR(100)  NULL,
  d1_team_members  NVARCHAR(MAX)  NULL,
  d1_completed     BIT            NOT NULL DEFAULT 0,
  d1_date          DATE           NULL,

  -- D2: Problem description
  d2_problem_stmt  NVARCHAR(MAX)  NULL,
  d2_is_what       NVARCHAR(MAX)  NULL,
  d2_is_not_what   NVARCHAR(MAX)  NULL,
  d2_completed     BIT            NOT NULL DEFAULT 0,
  d2_date          DATE           NULL,

  -- D3: Interim containment action
  d3_containment   NVARCHAR(MAX)  NULL,
  d3_effectiveness NVARCHAR(MAX)  NULL,
  d3_completed     BIT            NOT NULL DEFAULT 0,
  d3_date          DATE           NULL,

  -- D4: Root cause analysis
  d4_root_cause    NVARCHAR(MAX)  NULL,
  d4_method        NVARCHAR(30)   NULL
    CHECK (d4_method IN ('FISHBONE','5_WHY','FMEA','FTA','OTHER',NULL)),
  d4_completed     BIT            NOT NULL DEFAULT 0,
  d4_date          DATE           NULL,

  -- D5: Permanent corrective actions
  d5_actions       NVARCHAR(MAX)  NULL,
  d5_responsible   NVARCHAR(200)  NULL,
  d5_target_date   DATE           NULL,
  d5_completed     BIT            NOT NULL DEFAULT 0,
  d5_date          DATE           NULL,

  -- D6: Implementation & validation
  d6_implementation NVARCHAR(MAX) NULL,
  d6_validation    NVARCHAR(MAX)  NULL,
  d6_completed     BIT            NOT NULL DEFAULT 0,
  d6_date          DATE           NULL,

  -- D7: Prevent recurrence (systemic)
  d7_systemic_actions NVARCHAR(MAX) NULL,
  d7_procedures_updated BIT       NOT NULL DEFAULT 0,
  d7_training_done BIT            NOT NULL DEFAULT 0,
  d7_completed     BIT            NOT NULL DEFAULT 0,
  d7_date          DATE           NULL,

  -- D8: Congratulate team / closure
  d8_lessons_learned NVARCHAR(MAX) NULL,
  d8_team_recognition NVARCHAR(MAX) NULL,
  d8_completed     BIT            NOT NULL DEFAULT 0,
  d8_date          DATE           NULL,

  overall_status   NVARCHAR(20)   NOT NULL DEFAULT 'DRAFT'
    CHECK (overall_status IN ('DRAFT','IN_PROGRESS','PENDING_APPROVAL','APPROVED','CLOSED')),
  approved_by      INT            NULL REFERENCES dbo.Users(user_id),
  approved_at      DATETIME2      NULL,
  created_by       INT            NOT NULL REFERENCES dbo.Users(user_id),
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Complaint Activity Log ────────────────────────────────────
CREATE TABLE dbo.ComplaintActivityLog (
  log_id           INT IDENTITY(1,1) PRIMARY KEY,
  complaint_id     INT            NOT NULL REFERENCES dbo.CustomerComplaint(complaint_id),
  action_type      NVARCHAR(50)   NOT NULL,
  action_notes     NVARCHAR(MAX)  NULL,
  performed_by     INT            NULL REFERENCES dbo.Users(user_id),
  performed_at     DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Auto-number sequences ─────────────────────────────────────
CREATE TABLE dbo.Mod20Sequence (
  seq_key   NVARCHAR(20) NOT NULL PRIMARY KEY,
  last_num  INT          NOT NULL DEFAULT 0
);
GO
INSERT INTO dbo.Mod20Sequence (seq_key, last_num) VALUES ('COMPLAINT', 0), ('8D_REPORT', 0);
GO

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IX_Complaint_Status   ON dbo.CustomerComplaint(status, is_active);
CREATE INDEX IX_Complaint_Customer ON dbo.CustomerComplaint(customer_id, is_active);
CREATE INDEX IX_Complaint_Severity ON dbo.CustomerComplaint(severity, status);
GO

PRINT 'Migration 010 — MOD-20 Customer Complaint & 8D Report complete.';
