-- =============================================================
-- ATCA-ERP v1.0 — Migration 008: MOD-03 FPI Process Control
-- NADCAP AC7114 | ASTM E1417 | AMS 2644 | NAS410
-- Created: 2026-06-12
-- Depends on: 005_mod04_personnel.sql (Personnel), 007_mod06_bath_control.sql (ChemBath)
-- =============================================================

USE ATCA_ERP_DB;
GO

-- ── FPI Job header ────────────────────────────────────────────
CREATE TABLE dbo.FpiJob (
  job_id            INT IDENTITY(1,1) PRIMARY KEY,
  job_ref           NVARCHAR(20)   NOT NULL UNIQUE,   -- FPI-2026-0001
  work_order_ref    NVARCHAR(30)   NULL,
  customer          NVARCHAR(100)  NULL,
  part_number       NVARCHAR(100)  NOT NULL,
  part_description  NVARCHAR(200)  NULL,
  material_spec     NVARCHAR(100)  NULL,
  quantity          INT            NOT NULL DEFAULT 1,
  penetrant_type    NVARCHAR(10)   NOT NULL
    CHECK (penetrant_type IN ('TYPE_I','TYPE_II')),
  penetrant_bath_id INT            NULL REFERENCES dbo.ChemBath(bath_id),
  developer_type    NVARCHAR(20)   NOT NULL
    CHECK (developer_type IN ('DRY','WET_AQUEOUS','WET_NON_AQUEOUS','NONE')),
  method            NVARCHAR(10)   NOT NULL
    CHECK (method IN ('METHOD_A','METHOD_B','METHOD_C','METHOD_D')),
  -- METHOD_A=Water Washable, B=Post-Emulsifiable Lipophilic,
  -- C=Solvent Removable, D=Post-Emulsifiable Hydrophilic
  sensitivity_level INT            NOT NULL CHECK (sensitivity_level IN (1,2,3,4)),
  status            NVARCHAR(20)   NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS','COMPLETE','CANCELLED')),
  created_by        INT            NOT NULL REFERENCES dbo.Users(user_id),
  created_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at        DATETIME2      NULL
);
GO

-- ── FPI Inspection Steps (per ASTM E1417 §7) ─────────────────
CREATE TABLE dbo.FpiInspectionStep (
  step_id       INT IDENTITY(1,1) PRIMARY KEY,
  job_id        INT            NOT NULL REFERENCES dbo.FpiJob(job_id),
  step_seq      INT            NOT NULL,   -- 1-8
  step_name     NVARCHAR(30)   NOT NULL
    CHECK (step_name IN (
      'PRE_CLEAN','PENETRANT_APPLY','PENETRANT_DWELL',
      'RINSE','DEVELOPER_APPLY','DEVELOPER_DWELL',
      'INTERPRET','POST_CLEAN'
    )),
  performed_by  INT            NULL REFERENCES dbo.Users(user_id),
  performed_at  DATETIME2      NULL,
  duration_min  INT            NULL,
  uv_intensity_fc INT          NULL,   -- UV lamp reading at inspection (fc)
  white_light_fc  INT          NULL,   -- Ambient white light reading (fc) — must be <2 for FPI
  temp_c        DECIMAL(5,1)   NULL,   -- Process temperature
  parameters    NVARCHAR(MAX)  NULL,   -- JSON for step-specific extra params
  result        NVARCHAR(10)   NULL CHECK (result IN ('PASS','FAIL','N/A')),
  signed_off    BIT            NOT NULL DEFAULT 0,
  notes         NVARCHAR(MAX)  NULL,
  UNIQUE (job_id, step_seq)
);
GO

-- ── FPI Final Result ──────────────────────────────────────────
CREATE TABLE dbo.FpiResult (
  result_id        INT IDENTITY(1,1) PRIMARY KEY,
  job_id           INT            NOT NULL UNIQUE REFERENCES dbo.FpiJob(job_id),
  disposition      NVARCHAR(10)   NOT NULL CHECK (disposition IN ('ACCEPT','REJECT','REWORK')),
  indication_found BIT            NOT NULL DEFAULT 0,
  indication_desc  NVARCHAR(MAX)  NULL,
  linked_ncr_id    INT            NULL REFERENCES dbo.NCR(ncr_id),
  final_signed_by  INT            NOT NULL REFERENCES dbo.Users(user_id),
  final_signed_at  DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── View: FPI job list with progress ─────────────────────────
CREATE OR ALTER VIEW dbo.vw_FpiJob AS
SELECT
  j.job_id,
  j.job_ref,
  j.work_order_ref,
  j.customer,
  j.part_number,
  j.part_description,
  j.material_spec,
  j.quantity,
  j.penetrant_type,
  j.developer_type,
  j.method,
  j.sensitivity_level,
  j.status,
  j.created_at,
  u.full_name          AS created_by_name,
  b.bath_code          AS penetrant_bath_code,
  r.disposition,
  r.indication_found,
  ru.full_name         AS final_signed_by_name,
  r.final_signed_at,
  (SELECT COUNT(*) FROM dbo.FpiInspectionStep s WHERE s.job_id = j.job_id)
    AS total_steps,
  (SELECT COUNT(*) FROM dbo.FpiInspectionStep s WHERE s.job_id = j.job_id AND s.signed_off = 1)
    AS completed_steps
FROM dbo.FpiJob j
JOIN  dbo.Users u          ON u.user_id  = j.created_by
LEFT JOIN dbo.ChemBath b   ON b.bath_id  = j.penetrant_bath_id
LEFT JOIN dbo.FpiResult r  ON r.job_id   = j.job_id
LEFT JOIN dbo.Users ru     ON ru.user_id = r.final_signed_by;
GO

PRINT 'MOD-03 migration 008 complete.';
GO
