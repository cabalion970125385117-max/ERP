-- ============================================================
-- ATCA-ERP v1.0 — Migration 035
-- MOD-32: Bay Load Scheduler + Tank-Fit Check
-- AS9100D §8.1 (Production & Service Provision Planning)
-- ============================================================
-- Validates part L×W×D vs PCM tank envelope before scheduling;
-- visual bay/shift queue; manual vs auto line; over-size flagging.
-- ============================================================

USE ATCA_ERP_DB;
GO

/* ── BaySchedule ─────────────────────────────────────────────────
   A scheduled processing slot: one work order → one bay/line
   in a specific shift. Tank-fit is checked at insert time.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='BaySchedule')
CREATE TABLE dbo.BaySchedule (
    schedule_id         INT IDENTITY(1,1) PRIMARY KEY,
    schedule_ref        AS ('SCH-' + FORMAT(schedule_id,'0000')) PERSISTED,

    -- links
    work_order_id       INT NULL,        -- FK → WorkOrder if integrated
    grn_ref             NVARCHAR(20) NULL,
    job_description     NVARCHAR(200) NOT NULL,
    customer_code       NVARCHAR(50) NULL,
    process_area        NVARCHAR(100) NOT NULL,    -- e.g. 'Anodizing', 'FPI', 'Passivation'

    -- scheduling
    bay                 NVARCHAR(10) NOT NULL,      -- 'BAY2','BAY3','BAY4','BAY5','NDT','HEAT'
    line_code           NVARCHAR(20) NULL,          -- FK → BayLine.line_code (nullable for manual)
    assigned_tank_id    INT NULL,                   -- FK → ChemBath (can be null for NDT/heat)
    scheduled_date      DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    shift               NVARCHAR(10) NOT NULL DEFAULT 'SHIFT_1'
                        CHECK (shift IN ('SHIFT_1','SHIFT_2','SHIFT_3')),

    -- part dimensions (cm) for tank-fit check
    part_len_cm         DECIMAL(8,1) NULL,
    part_wid_cm         DECIMAL(8,1) NULL,
    part_dep_cm         DECIMAL(8,1) NULL,
    part_qty            INT NOT NULL DEFAULT 1,

    -- fit result
    fit_checked         BIT NOT NULL DEFAULT 0,
    fit_result          NVARCHAR(10) NULL CHECK (fit_result IN ('PASS','FAIL','N/A')),
    oversize_flagged    BIT NOT NULL DEFAULT 0,
    fit_notes           NVARCHAR(400) NULL,

    -- scheduling mode
    is_manual           BIT NOT NULL DEFAULT 0,    -- 1 = operator manually placed
    priority            INT NOT NULL DEFAULT 3     CHECK (priority BETWEEN 1 AND 5),  -- 1=urgent

    -- status
    status              NVARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','OVERSIZE')),

    -- audit
    scheduled_by        INT NULL,      -- FK → Users
    confirmed_by        INT NULL,
    completed_at        DATETIME2 NULL,
    notes               NVARCHAR(500) NULL,
    created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── BayLine ─────────────────────────────────────────────────────
   Physical processing lines within a bay (one line can have
   multiple tanks; a slot count limits parallel jobs per shift).
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='BayLine')
CREATE TABLE dbo.BayLine (
    line_id             INT IDENTITY(1,1) PRIMARY KEY,
    bay                 NVARCHAR(10) NOT NULL,
    line_code           NVARCHAR(20) NOT NULL UNIQUE,
    line_name           NVARCHAR(100) NOT NULL,
    process_area        NVARCHAR(100) NOT NULL,
    max_slots_per_shift INT NOT NULL DEFAULT 3,
    is_active           BIT NOT NULL DEFAULT 1,
    notes               NVARCHAR(200) NULL,
    created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── vw_BayLoad ──────────────────────────────────────────────────
   Daily load per bay / shift: slot count, oversize count, status.
----------------------------------------------------------------- */
IF EXISTS (SELECT 1 FROM sys.views WHERE name='vw_BayLoad')
    DROP VIEW dbo.vw_BayLoad;
GO
CREATE VIEW dbo.vw_BayLoad AS
SELECT
    scheduled_date,
    bay,
    shift,
    COUNT(*)                                       AS total_slots,
    SUM(CASE WHEN oversize_flagged=1 THEN 1 ELSE 0 END) AS oversize_count,
    SUM(CASE WHEN status='PENDING'    THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status='CONFIRMED'  THEN 1 ELSE 0 END) AS confirmed_count,
    SUM(CASE WHEN status='IN_PROGRESS' THEN 1 ELSE 0 END) AS inprogress_count,
    SUM(CASE WHEN status='COMPLETED'  THEN 1 ELSE 0 END) AS completed_count
FROM dbo.BaySchedule
WHERE status <> 'CANCELLED'
GROUP BY scheduled_date, bay, shift;
GO

/* ── Mod32Sequence ───────────────────────────────────────────────
   Audit trail / sequence log for bay scheduler actions.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Mod32Sequence')
CREATE TABLE dbo.Mod32Sequence (
    seq_id      INT IDENTITY(1,1) PRIMARY KEY,
    schedule_id INT NOT NULL,
    action      NVARCHAR(40) NOT NULL,
    action_by   INT NULL,
    action_at   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    notes       NVARCHAR(300) NULL
);
GO

/* ── Seed BayLines from PCM structure ───────────────────────────
   ATC bays: BAY2–5 (electroplating/chem), NDT, HEAT
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.BayLine WHERE line_code='BAY2-ANOD')
INSERT INTO dbo.BayLine (bay, line_code, line_name, process_area, max_slots_per_shift) VALUES
  ('BAY2','BAY2-ANOD',  'Bay 2 — Anodizing Line',          'Anodizing',      2),
  ('BAY2','BAY2-EN',    'Bay 2 — Electroless Nickel Line',  'Electroless Nickel', 2),
  ('BAY3','BAY3-ANC',   'Bay 3 — Chromic Anodize Line',     'Chromic Anodize',2),
  ('BAY3','BAY3-PHOS',  'Bay 3 — Phosphate Line',           'Phosphating',    2),
  ('BAY4','BAY4-CAD',   'Bay 4 — Cadmium Plating Line',     'Cadmium Plating',1),
  ('BAY4','BAY4-SILV',  'Bay 4 — Silver/Gold Plating',      'Silver Plating', 1),
  ('BAY5','BAY5-PASS',  'Bay 5 — Passivation Line',         'Passivation',    3),
  ('BAY5','BAY5-BOX',   'Bay 5 — Black Oxide Line',         'Black Oxide',    2),
  ('NDT', 'NDT-FPI',    'NDT — FPI Line (ApolloFlow)',       'FPI',            4),
  ('NDT', 'NDT-MPT',    'NDT — MPT Line',                   'MPT',            4),
  ('HEAT','HEAT-OVEN',  'Heat-Treat — Oven Bay',            'Heat Treatment', 3);
GO
