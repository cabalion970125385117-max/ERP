-- =============================================================================
-- MOD-30 — Pyrometry & Heat-Treat
-- NADCAP AC7102 / AMS 2750H (pyrometry) | AS9100D §7.1.5
-- Source ovens: ATC-PCM-001 Equipment sheet (ATCT OVEN 4..16)
-- Migration: 033_mod30_pyrometry.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- ── Heat-treat / baking / drying oven register ──────────────────────────────
CREATE TABLE dbo.HeatTreatOven (
  oven_id        INT IDENTITY(1,1) PRIMARY KEY,
  oven_code      NVARCHAR(30)  NOT NULL UNIQUE,        -- 'ATCT OVEN 8'
  oven_name      NVARCHAR(120) NOT NULL,
  function_type  NVARCHAR(20)  NOT NULL                -- BAKE_HEATTREAT | DRYING | MUFFLE
                   CONSTRAINT CK_Oven_Func CHECK (function_type IN ('BAKE_HEATTREAT','DRYING','MUFFLE')),
  standard_ref   NVARCHAR(60)  NULL,                   -- 'AMS 2750H'
  furnace_class  NVARCHAR(10)  NULL,                   -- AMS2750 furnace class 1..6
  instrument_type NVARCHAR(10) NULL,                   -- AMS2750 instrumentation type A..E
  temp_min_c     DECIMAL(6,1)  NULL,
  temp_max_c     DECIMAL(6,1)  NULL,
  aerospace_only BIT NOT NULL DEFAULT 0,               -- "aerospace part can only use this oven"
  area           NVARCHAR(40)  NULL,                   -- Production | Cleanroom
  max_len_cm     DECIMAL(6,1)  NULL,
  max_wid_cm     DECIMAL(6,1)  NULL,
  max_dep_cm     DECIMAL(6,1)  NULL,
  tus_interval_days INT NOT NULL DEFAULT 90,           -- temperature uniformity survey
  sat_interval_days INT NOT NULL DEFAULT 30,           -- system accuracy test
  notes          NVARCHAR(MAX) NULL,
  is_active      BIT NOT NULL DEFAULT 1,
  created_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Pyrometry tests (TUS / SAT / SYSTEM_ACCURACY) ───────────────────────────
CREATE TABLE dbo.PyrometryTest (
  test_id     INT IDENTITY(1,1) PRIMARY KEY,
  test_ref    NVARCHAR(30) NOT NULL UNIQUE,            -- PYR-2026-0001
  oven_id     INT NOT NULL REFERENCES dbo.HeatTreatOven(oven_id),
  test_type   NVARCHAR(20) NOT NULL
                CONSTRAINT CK_Pyr_Type CHECK (test_type IN ('TUS','SAT','SYSTEM_ACCURACY')),
  test_date   DATE NOT NULL,
  set_point_c DECIMAL(6,1) NULL,
  max_dev_c   DECIMAL(5,2) NULL,                       -- worst uniformity / accuracy deviation
  tolerance_c DECIMAL(5,2) NULL,
  result      NVARCHAR(10) NOT NULL
                CONSTRAINT CK_Pyr_Result CHECK (result IN ('PASS','FAIL')),
  performed_by NVARCHAR(120) NULL,
  cert_ref    NVARCHAR(120) NULL,
  next_due    DATE NULL,
  notes       NVARCHAR(MAX) NULL,
  created_at  DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Thermocouples (expiry / usage controlled per AMS2750) ───────────────────
CREATE TABLE dbo.Thermocouple (
  tc_id        INT IDENTITY(1,1) PRIMARY KEY,
  tc_code      NVARCHAR(30) NOT NULL UNIQUE,           -- TC-001
  oven_id      INT NULL REFERENCES dbo.HeatTreatOven(oven_id),
  tc_type      NVARCHAR(10) NULL,                      -- K, N, R, S...
  tc_class     NVARCHAR(20) NULL,                      -- AMS2750: Control/Recording/Load/Test/SAT
  install_date DATE NULL,
  expiry_date  DATE NULL,
  uses_count   INT NULL,
  uses_max     INT NULL,
  status       NVARCHAR(12) NOT NULL DEFAULT 'IN_USE'
                 CONSTRAINT CK_TC_Status CHECK (status IN ('IN_USE','EXPIRED','RETIRED')),
  cal_cert_ref NVARCHAR(120) NULL,
  is_active    BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE dbo.Mod30Sequence (seq_key NVARCHAR(20) PRIMARY KEY, last_num INT NOT NULL DEFAULT 0);
INSERT INTO dbo.Mod30Sequence (seq_key, last_num) VALUES ('PYR', 0);
GO

-- ── Status view (RAG by TUS/SAT due dates) ──────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_OvenStatus AS
SELECT o.*,
  (SELECT MAX(test_date) FROM dbo.PyrometryTest t WHERE t.oven_id=o.oven_id AND t.test_type='TUS') AS last_tus,
  (SELECT MAX(test_date) FROM dbo.PyrometryTest t WHERE t.oven_id=o.oven_id AND t.test_type='SAT') AS last_sat,
  CASE WHEN (SELECT MAX(next_due) FROM dbo.PyrometryTest t WHERE t.oven_id=o.oven_id AND t.test_type='TUS') < CAST(GETUTCDATE() AS DATE)
       OR  (SELECT MAX(next_due) FROM dbo.PyrometryTest t WHERE t.oven_id=o.oven_id AND t.test_type='SAT') < CAST(GETUTCDATE() AS DATE)
       THEN 'RED'
       WHEN (SELECT MAX(next_due) FROM dbo.PyrometryTest t WHERE t.oven_id=o.oven_id AND t.test_type='TUS') < DATEADD(day,14,CAST(GETUTCDATE() AS DATE))
       THEN 'AMBER' ELSE 'GREEN' END AS rag_status
FROM dbo.HeatTreatOven o WHERE o.is_active=1;
GO

-- ── Seed ovens from ATC-PCM-001 Equipment sheet ─────────────────────────────
IF NOT EXISTS (SELECT 1 FROM dbo.HeatTreatOven WHERE oven_code='ATCT OVEN 8')
INSERT INTO dbo.HeatTreatOven
 (oven_code, oven_name, function_type, standard_ref, furnace_class, instrument_type, temp_min_c, temp_max_c, aerospace_only, area, max_len_cm, max_wid_cm, max_dep_cm, tus_interval_days, sat_interval_days) VALUES
 ('ATCT OVEN 8','Baking & Heat Treatment Oven 8','BAKE_HEATTREAT','AMS 2750H','2','C',85,300,1,'Production',50,50,45,90,30),
 ('ATCT OVEN 9','Baking & Heat Treatment Oven 9','BAKE_HEATTREAT','AMS 2750H','2','C',125,400,1,'Production',90,70,98,90,30),
 ('ATCT OVEN 16','Muffle Furnace 16','MUFFLE','AMS 2750H','3','D',40,1200,0,'Production',40,40,40,90,30),
 ('ATCT OVEN 12','Drying Oven 12 (Honeywell Ti/Steel/Mg)','DRYING','AMS 2750H','4','D',111,131,1,'Production',NULL,NULL,NULL,180,60),
 ('ATCT OVEN 4','Drying Oven 4 (Honeywell Al/Carbon Fibre)','DRYING',NULL,NULL,NULL,50,70,0,'Production',NULL,NULL,NULL,180,60),
 ('ATCT OVEN 5','Drying Oven 5','DRYING',NULL,NULL,NULL,50,70,0,'Production',NULL,NULL,NULL,180,60),
 ('ATCT OVEN 10','Drying Oven 10','DRYING',NULL,NULL,NULL,50,70,0,'Production',NULL,NULL,NULL,180,60),
 ('ATCT OVEN 11','Drying Oven 11','DRYING',NULL,NULL,NULL,50,70,0,'Production',NULL,NULL,NULL,180,60),
 ('ATCT OVEN 13','Drying Oven 13 (N2, small parts)','DRYING',NULL,NULL,NULL,30,150,0,'Cleanroom',NULL,NULL,NULL,180,60),
 ('ATCT OVEN 14','Drying Oven 14 (N2, large parts)','DRYING',NULL,NULL,NULL,30,200,0,'Cleanroom',NULL,NULL,NULL,180,60);
GO

PRINT 'Migration 033 — MOD-30 Pyrometry & Heat-Treat complete.';
GO
