-- =============================================================
-- ATCA-ERP v1.0 — Migration 011: MOD-10 Production Management
-- NADCAP AC7108 App D (Production Condition / Process Specification)
-- AS9100D §8.5 (Production & Service Provision)
-- Created: 2026-06-13
-- Depends on: 005_mod04_personnel.sql, 009_mod09_sales_customer_service.sql
-- =============================================================

USE ATCA_ERP_DB;
GO

-- ── Route Card (Job Traveler Header) ──────────────────────────
-- Tracks a single production job from receipt to delivery
CREATE TABLE dbo.RouteCard (
  route_id         INT IDENTITY(1,1) PRIMARY KEY,
  route_ref        NVARCHAR(20)   NOT NULL UNIQUE,   -- RC-2026-0001
  customer_id      INT            NULL REFERENCES dbo.Customer(customer_id),
  po_number        NVARCHAR(100)  NULL,
  part_number      NVARCHAR(100)  NOT NULL,
  part_description NVARCHAR(300)  NULL,
  quantity         INT            NOT NULL DEFAULT 1,
  material_spec    NVARCHAR(100)  NULL,
  job_type         NVARCHAR(30)   NOT NULL DEFAULT 'FPI'
    CHECK (job_type IN ('FPI','MPT','CHEM_PROC','NDT_OTHER','MULTI_PROCESS','INSPECTION_ONLY')),
  priority         NVARCHAR(10)   NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('URGENT','HIGH','NORMAL','LOW')),
  required_by_date DATE           NULL,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','IN_PROGRESS','PENDING_REVIEW','COMPLETE','CANCELLED','ON_HOLD')),
  created_by       INT            NOT NULL REFERENCES dbo.Users(user_id),
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Route Card Operations (process steps within a route) ──────
CREATE TABLE dbo.RouteCardOperation (
  op_id            INT IDENTITY(1,1) PRIMARY KEY,
  route_id         INT            NOT NULL REFERENCES dbo.RouteCard(route_id),
  op_seq           INT            NOT NULL,
  op_name          NVARCHAR(100)  NOT NULL,
  work_center      NVARCHAR(50)   NULL,
  process_spec     NVARCHAR(100)  NULL,      -- e.g. AMS 2644, AMS 2759
  std_time_min     INT            NULL,
  assigned_to      INT            NULL REFERENCES dbo.Personnel(personnel_id),
  started_at       DATETIME2      NULL,
  completed_at     DATETIME2      NULL,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETE','SKIPPED','HOLD')),
  result           NVARCHAR(10)   NULL CHECK (result IN ('PASS','FAIL','NA',NULL)),
  op_notes         NVARCHAR(MAX)  NULL
);
GO

-- ── Production Condition Record (AC7108 App D) ────────────────
-- Captures process parameter verification at job start
CREATE TABLE dbo.ProductionCondition (
  condition_id     INT IDENTITY(1,1) PRIMARY KEY,
  condition_ref    NVARCHAR(20)   NOT NULL UNIQUE,   -- PC-2026-0001
  route_id         INT            NULL REFERENCES dbo.RouteCard(route_id),
  process_type     NVARCHAR(20)   NOT NULL
    CHECK (process_type IN ('FPI','MPT','CHEM_PROC','HEAT_TREAT','OTHER')),
  process_spec     NVARCHAR(100)  NOT NULL,          -- e.g. AMS 2644 Type I Method D
  bath_id          INT            NULL,              -- reference only; no FK (may differ)
  check_date       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  checked_by       INT            NOT NULL REFERENCES dbo.Personnel(personnel_id),

  -- Process parameter checks
  penetrant_type   NVARCHAR(50)   NULL,
  penetrant_conc   DECIMAL(8,2)   NULL,
  bath_temp_c      DECIMAL(6,2)   NULL,
  bath_temp_ok     BIT            NULL,
  uv_intensity_fc  DECIMAL(8,1)   NULL,
  uv_intensity_ok  BIT            NULL,
  ambient_light_fc DECIMAL(8,1)   NULL,
  ambient_light_ok BIT            NULL,

  -- MPT-specific
  current_amps     DECIMAL(8,2)   NULL,
  current_ok       BIT            NULL,
  field_strength   DECIMAL(8,2)   NULL,
  field_ok         BIT            NULL,

  overall_ok       BIT            NOT NULL DEFAULT 0,
  condition_notes  NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Test Piece / Coupon Record ────────────────────────────────
-- AC7108/AC7114: system performance indicator (TAM panel, ketos ring, etc.)
CREATE TABLE dbo.TestPiece (
  test_piece_id    INT IDENTITY(1,1) PRIMARY KEY,
  test_piece_ref   NVARCHAR(20)   NOT NULL UNIQUE,   -- TP-2026-0001
  test_piece_type  NVARCHAR(30)   NOT NULL
    CHECK (test_piece_type IN ('TAM_PANEL','KETOS_RING','MOCK_UP','DC_FIELD','OTHER')),
  route_id         INT            NULL REFERENCES dbo.RouteCard(route_id),
  serial_number    NVARCHAR(100)  NULL,
  check_date       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  checked_by       INT            NOT NULL REFERENCES dbo.Personnel(personnel_id),
  standard_ref     NVARCHAR(100)  NULL,   -- e.g. AC7114 §5.3
  result           NVARCHAR(10)   NOT NULL
    CHECK (result IN ('PASS','FAIL','INCONCLUSIVE')),
  findings         NVARCHAR(MAX)  NULL,
  corrective_action NVARCHAR(MAX) NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Shift Checklist ───────────────────────────────────────────
-- Start-of-shift and end-of-shift system readiness checks
CREATE TABLE dbo.ShiftChecklist (
  checklist_id     INT IDENTITY(1,1) PRIMARY KEY,
  checklist_ref    NVARCHAR(20)   NOT NULL UNIQUE,   -- SC-2026-0001
  shift_type       NVARCHAR(10)   NOT NULL DEFAULT 'DAY'
    CHECK (shift_type IN ('DAY','NIGHT','OVERTIME')),
  check_date       DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  process_area     NVARCHAR(50)   NOT NULL,
  checked_by       INT            NOT NULL REFERENCES dbo.Personnel(personnel_id),
  supervisor_id    INT            NULL REFERENCES dbo.Personnel(personnel_id),

  -- Common checklist items (BIT = checked)
  equipment_ready  BIT            NOT NULL DEFAULT 0,
  chemicals_ok     BIT            NOT NULL DEFAULT 0,
  ppe_available    BIT            NOT NULL DEFAULT 0,
  lighting_ok      BIT            NOT NULL DEFAULT 0,
  safety_station_ok BIT           NOT NULL DEFAULT 0,
  prev_shift_issues NVARCHAR(MAX) NULL,
  housekeeping_ok  BIT            NOT NULL DEFAULT 0,
  readings_recorded BIT           NOT NULL DEFAULT 0,

  -- FPI-specific
  uv_lamp_checked  BIT            NOT NULL DEFAULT 0,
  penetrant_level_ok BIT          NOT NULL DEFAULT 0,

  -- MPT-specific
  demagnetiser_ok  BIT            NOT NULL DEFAULT 0,
  particle_conc_ok BIT            NOT NULL DEFAULT 0,

  checklist_notes  NVARCHAR(MAX)  NULL,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED')),
  supervisor_sign  NVARCHAR(100)  NULL,
  supervisor_at    DATETIME2      NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Auto-number sequences ─────────────────────────────────────
CREATE TABLE dbo.Mod10Sequence (
  seq_key   NVARCHAR(20) NOT NULL PRIMARY KEY,
  last_num  INT          NOT NULL DEFAULT 0
);
GO
INSERT INTO dbo.Mod10Sequence (seq_key, last_num) VALUES
  ('ROUTE_CARD', 0), ('PROD_CONDITION', 0), ('TEST_PIECE', 0), ('SHIFT_CHECKLIST', 0);
GO

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IX_RouteCard_Status   ON dbo.RouteCard(status, is_active);
CREATE INDEX IX_RouteCard_Priority ON dbo.RouteCard(priority, required_by_date);
CREATE INDEX IX_ShiftChecklist_Date ON dbo.ShiftChecklist(check_date, process_area);
GO

PRINT 'Migration 011 — MOD-10 Production Management complete.';
