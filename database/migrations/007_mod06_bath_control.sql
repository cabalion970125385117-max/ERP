-- =============================================================
-- ATCA-ERP v1.0 — Migration 007: MOD-06 Chemical / Bath Control
-- NADCAP AC7108 (Coatings) | AC7110 (Chemical Processing) | AC7114 §6.3 (NDT)
-- ASTM E1417 | AMS 2644
-- Created: 2026-06-12
-- =============================================================

USE ATCA_ERP_DB;
GO

-- ── Bath / Tank register ──────────────────────────────────────
CREATE TABLE dbo.ChemBath (
  bath_id               INT IDENTITY(1,1) PRIMARY KEY,
  bath_code             NVARCHAR(20)   NOT NULL UNIQUE,   -- e.g. BATH-PT-001
  bath_name             NVARCHAR(100)  NOT NULL,
  bath_type             NVARCHAR(20)   NOT NULL
    CHECK (bath_type IN (
      'PENETRANT','EMULSIFIER','DEVELOPER','RINSE',
      'ANODIZE','PLATING','PASSIVATION','CONVERSION','COATING'
    )),
  process_area          NVARCHAR(100)  NULL,
  spec_ref              NVARCHAR(200)  NULL,              -- e.g. AMS 2644, AMS 2469, MIL-PRF-23377
  sample_frequency_days INT            NOT NULL DEFAULT 7,
  notes                 NVARCHAR(MAX)  NULL,
  is_active             BIT            NOT NULL DEFAULT 1,
  created_by            INT            NULL REFERENCES dbo.Users(user_id),
  created_at            DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at            DATETIME2      NULL
);
GO

-- ── Acceptable parameter limits per bath ─────────────────────
CREATE TABLE dbo.BathParameter (
  param_id    INT IDENTITY(1,1) PRIMARY KEY,
  bath_id     INT            NOT NULL REFERENCES dbo.ChemBath(bath_id),
  param_name  NVARCHAR(100)  NOT NULL,   -- 'Fluorescent Brightness', 'pH', 'Concentration %'
  unit        NVARCHAR(20)   NULL,        -- 'fc', 'pH', '%', '°C', 'g/L', 'A/dm²'
  min_value   DECIMAL(10,3)  NULL,
  max_value   DECIMAL(10,3)  NULL,
  test_method NVARCHAR(100)  NULL         -- 'Fluorometer', 'pH meter', 'Titration'
);
GO

-- ── Sample event header (one per sampling occasion) ──────────
CREATE TABLE dbo.BathSample (
  sample_id         INT IDENTITY(1,1) PRIMARY KEY,
  bath_id           INT            NOT NULL REFERENCES dbo.ChemBath(bath_id),
  sample_ref        NVARCHAR(30)   NOT NULL UNIQUE,   -- BS-2026-0001
  sampled_by        INT            NOT NULL REFERENCES dbo.Users(user_id),
  sampled_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  overall_status    NVARCHAR(10)   NOT NULL CHECK (overall_status IN ('PASS','FAIL')),
  corrective_action NVARCHAR(MAX)  NULL,
  notes             NVARCHAR(MAX)  NULL,
  created_at        DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Individual parameter result per sample event ──────────────
CREATE TABLE dbo.BathSampleParam (
  result_id    INT IDENTITY(1,1) PRIMARY KEY,
  sample_id    INT            NOT NULL REFERENCES dbo.BathSample(sample_id),
  param_name   NVARCHAR(100)  NOT NULL,
  result_value DECIMAL(10,3)  NOT NULL,
  unit         NVARCHAR(20)   NULL,
  within_spec  BIT            NOT NULL
);
GO

-- ── View: current status per bath ────────────────────────────
CREATE OR ALTER VIEW dbo.vw_BathStatus AS
SELECT
  b.bath_id,
  b.bath_code,
  b.bath_name,
  b.bath_type,
  b.process_area,
  b.spec_ref,
  b.sample_frequency_days,
  b.is_active,
  s.sample_id       AS last_sample_id,
  s.sample_ref      AS last_sample_ref,
  s.sampled_at      AS last_sampled_at,
  s.overall_status  AS last_status,
  u.full_name       AS last_sampled_by_name,
  DATEDIFF(day, s.sampled_at, GETUTCDATE()) AS days_since_sample,
  CASE
    WHEN s.sample_id IS NULL                                                        THEN 'RED'
    WHEN s.overall_status = 'FAIL'                                                  THEN 'RED'
    WHEN DATEDIFF(day, s.sampled_at, GETUTCDATE()) > b.sample_frequency_days       THEN 'RED'
    WHEN DATEDIFF(day, s.sampled_at, GETUTCDATE()) >= (b.sample_frequency_days - 1) THEN 'AMBER'
    ELSE 'GREEN'
  END AS rag_status
FROM dbo.ChemBath b
LEFT JOIN dbo.BathSample s ON s.sample_id = (
  SELECT TOP 1 sample_id
  FROM dbo.BathSample
  WHERE bath_id = b.bath_id
  ORDER BY sampled_at DESC
)
LEFT JOIN dbo.Users u ON u.user_id = s.sampled_by
WHERE b.is_active = 1;
GO

-- ── Seed: bath register ───────────────────────────────────────
INSERT INTO dbo.ChemBath (bath_code, bath_name, bath_type, process_area, spec_ref, sample_frequency_days) VALUES
('BATH-PT-001', 'Penetrant Tank A — Type I FPI',          'PENETRANT',   'FPI Bay 1',  'AMS 2644 / ASTM E1417',        7),
('BATH-EM-001', 'Hydrophilic Emulsifier — Method D',      'EMULSIFIER',  'FPI Bay 1',  'AMS 2644 §5.3',                7),
('BATH-DV-001', 'Wet Developer Tank',                     'DEVELOPER',   'FPI Bay 1',  'AMS 2644 / ASTM E1417 §6.4',   7),
('BATH-RN-001', 'Rinse Water Tank',                       'RINSE',       'FPI Bay 1',  'ASTM E1417 §6.3.4',            3),
('BATH-AN-001', 'Anodize Tank — Type II Sulfuric Acid',   'ANODIZE',     'Chem Lab',   'AMS 2469 / NADCAP AC7110',     1),
('BATH-PS-001', 'Passivation Bath — Citric Acid',         'PASSIVATION', 'Chem Lab',   'ASTM A967 / NADCAP AC7110',    7),
('BATH-CT-001', 'Epoxy Primer Bath',                      'COATING',     'Paint Shop', 'MIL-PRF-23377 / NADCAP AC7108',14);
GO

-- ── Seed: parameter limits per bath ──────────────────────────
DECLARE @pt INT = (SELECT bath_id FROM dbo.ChemBath WHERE bath_code = 'BATH-PT-001');
INSERT INTO dbo.BathParameter (bath_id, param_name, unit, min_value, max_value, test_method) VALUES
(@pt, 'Fluorescent Brightness', 'fc',  500,  NULL, 'Fluorometer per AMS 2644 §7.4'),
(@pt, 'Water Content',          '%',   NULL, 5.0,  'ASTM D1744'),
(@pt, 'Contamination (Turbidity)', 'NTU', NULL, 20.0, 'Turbidimeter');

DECLARE @em INT = (SELECT bath_id FROM dbo.ChemBath WHERE bath_code = 'BATH-EM-001');
INSERT INTO dbo.BathParameter (bath_id, param_name, unit, min_value, max_value, test_method) VALUES
(@em, 'Concentration', '%',   3.0,  6.0, 'Refractometer'),
(@em, 'pH',            'pH',  7.0,  9.0, 'pH meter calibrated');

DECLARE @dv INT = (SELECT bath_id FROM dbo.ChemBath WHERE bath_code = 'BATH-DV-001');
INSERT INTO dbo.BathParameter (bath_id, param_name, unit, min_value, max_value, test_method) VALUES
(@dv, 'Concentration', '%',   0.5,  2.0, 'Refractometer'),
(@dv, 'pH',            'pH',  8.0, 11.0, 'pH meter calibrated');

DECLARE @an INT = (SELECT bath_id FROM dbo.ChemBath WHERE bath_code = 'BATH-AN-001');
INSERT INTO dbo.BathParameter (bath_id, param_name, unit, min_value, max_value, test_method) VALUES
(@an, 'Sulfuric Acid Concentration', 'g/L',  160, 200, 'Titration per AMS 2469'),
(@an, 'Temperature',                 '°C',    18,  22, 'Calibrated thermometer'),
(@an, 'Current Density',             'A/dm²', 1.0, 1.5, 'Calibrated ammeter');

DECLARE @ps INT = (SELECT bath_id FROM dbo.ChemBath WHERE bath_code = 'BATH-PS-001');
INSERT INTO dbo.BathParameter (bath_id, param_name, unit, min_value, max_value, test_method) VALUES
(@ps, 'Citric Acid Concentration', '%',  4.0, 10.0, 'Titration per ASTM A967'),
(@ps, 'Temperature',               '°C', 60,   80,  'Calibrated thermometer'),
(@ps, 'pH',                        'pH', 3.0,  5.0, 'pH meter calibrated');
GO

PRINT 'MOD-06 migration 007 complete.';
GO
