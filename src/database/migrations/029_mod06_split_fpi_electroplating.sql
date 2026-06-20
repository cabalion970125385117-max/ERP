-- =============================================================================
-- MOD-06 — Split FPI (NDT) tanks from Chemical Processing (Electroplating) baths
-- NADCAP AC7108 / AC7110 (Chemical Processing) | ASTM E1417 / AMS 2644 (FPI/NDT)
-- Source: ATC-PCM-001 Rev A (Process Capability Matrix)
-- Migration: 029_mod06_split_fpi_electroplating.sql
-- Depends on: 007_mod06_bath_control.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- ── 1. process_category discriminator (idempotent) ───────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.ChemBath') AND name='process_category')
BEGIN
  ALTER TABLE dbo.ChemBath
    ADD process_category NVARCHAR(20) NOT NULL DEFAULT 'ELECTROPLATING';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_ChemBath_ProcCat')
  ALTER TABLE dbo.ChemBath WITH NOCHECK
    ADD CONSTRAINT CK_ChemBath_ProcCat CHECK (process_category IN ('NDT_FPI','ELECTROPLATING'));
GO

-- ── 2. Bay + max-dimension columns (from PCM "Tank Capacity") ─────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.ChemBath') AND name='bay')
  ALTER TABLE dbo.ChemBath
    ADD bay NVARCHAR(20) NULL,
        max_len_cm DECIMAL(6,1) NULL,
        max_wid_cm DECIMAL(6,1) NULL,
        max_dep_cm DECIMAL(6,1) NULL;
GO

-- ── 3. Backfill category from existing bath_type ─────────────────────────────
UPDATE dbo.ChemBath
   SET process_category = 'NDT_FPI'
 WHERE bath_type IN ('PENETRANT','EMULSIFIER','DEVELOPER','RINSE');
UPDATE dbo.ChemBath
   SET process_category = 'ELECTROPLATING'
 WHERE bath_type IN ('ANODIZE','PLATING','PASSIVATION','CONVERSION','COATING');
GO

-- ── 4. Widen bath_type to the PCM electroplating process set ──────────────────
DECLARE @ck SYSNAME = (
  SELECT cc.name FROM sys.check_constraints cc
  JOIN sys.columns c ON c.object_id=cc.parent_object_id AND c.column_id=cc.parent_column_id
  WHERE cc.parent_object_id=OBJECT_ID('dbo.ChemBath') AND c.name='bath_type');
IF @ck IS NOT NULL EXEC('ALTER TABLE dbo.ChemBath DROP CONSTRAINT ' + @ck);
GO
ALTER TABLE dbo.ChemBath WITH NOCHECK ADD CONSTRAINT CK_ChemBath_Type CHECK (bath_type IN (
  -- NDT_FPI
  'PENETRANT','EMULSIFIER','DEVELOPER','RINSE',
  -- ELECTROPLATING (PCM)
  'ANODIZE','BLACK_OXIDE','CHROMATE','ZINC_PLATE','COPPER_PLATE','NICKEL_PLATE',
  'ELECTROLESS_NICKEL','SILVER_PLATE','GOLD_PLATE','PHOSPHATING','PASSIVATION',
  'HARD_CHROME','CADMIUM','ELECTROPOLISH','BLUEING','CONVERSION','COATING','PLATING'
));
GO

-- ── 5. Rebuild status view to expose category + bay + dims ────────────────────
CREATE OR ALTER VIEW dbo.vw_BathStatus AS
SELECT
  b.bath_id, b.bath_code, b.bath_name, b.bath_type, b.process_category,
  b.process_area, b.spec_ref, b.sample_frequency_days,
  b.bay, b.max_len_cm, b.max_wid_cm, b.max_dep_cm, b.is_active,
  s.sample_id AS last_sample_id, s.sample_ref AS last_sample_ref, s.sampled_at AS last_sampled_at,
  s.overall_status AS last_status, u.full_name AS last_sampled_by_name,
  DATEDIFF(day, s.sampled_at, GETUTCDATE()) AS days_since_sample,
  CASE
    WHEN s.sample_id IS NULL                                                        THEN 'RED'
    WHEN s.overall_status = 'FAIL'                                                  THEN 'RED'
    WHEN DATEDIFF(day, s.sampled_at, GETUTCDATE()) > b.sample_frequency_days        THEN 'RED'
    WHEN DATEDIFF(day, s.sampled_at, GETUTCDATE()) >= (b.sample_frequency_days - 1) THEN 'AMBER'
    ELSE 'GREEN'
  END AS rag_status
FROM dbo.ChemBath b
LEFT JOIN dbo.BathSample s ON s.sample_id = (
  SELECT TOP 1 sample_id FROM dbo.BathSample WHERE bath_id = b.bath_id ORDER BY sampled_at DESC)
LEFT JOIN dbo.Users u ON u.user_id = s.sampled_by
WHERE b.is_active = 1;
GO

-- ── 6. Seed electroplating baths from the PCM (skip if already present) ────────
IF NOT EXISTS (SELECT 1 FROM dbo.ChemBath WHERE bath_code = 'EP-AN2-001')
BEGIN
  INSERT INTO dbo.ChemBath
    (bath_code, bath_name, bath_type, process_category, process_area, spec_ref, sample_frequency_days, bay, max_len_cm, max_wid_cm, max_dep_cm) VALUES
  ('EP-AN2-001','Type II Sulfuric Acid Anodize (Auto Line)','ANODIZE','ELECTROPLATING','Anodizing','AMS2470 / MIL-PRF-8625F Type II',1,'Bay 5',160,50,128),
  ('EP-AN3-001','Type III Hard Anodize (Manual)','ANODIZE','ELECTROPLATING','Anodizing','MIL-PRF-8625F Type III',1,'Bay 5',119,60,100),
  ('EP-CF-001','Chromate Conversion (Chem Film)','CHROMATE','ELECTROPLATING','Chromate (Chem Film)','MIL-DTL-5541 / AMS2473',1,'Bay 5',120,60,110),
  ('EP-EN-001','Electroless Nickel — High Phosphorus (HPEN P&W)','ELECTROLESS_NICKEL','ELECTROPLATING','Electroless Nickel','ASTM B733 / SPOP-311',1,'Bay 2',95,45,90),
  ('EP-ZN-001','Zinc Plating — Yellow Chromate','ZINC_PLATE','ELECTROPLATING','Zinc Plating','ASTM B633 Type II / SEP014',1,'Bay 3',84,84,110),
  ('EP-CU-001','Copper Trim (SIA) — Acidic Copper','COPPER_PLATE','ELECTROPLATING','Copper Plating','SIA 12DDR-25-8174',1,'Bay 2',100,33,45),
  ('EP-PH-001','Phosphating — Zinc + Manganese','PHOSPHATING','ELECTROPLATING','Phosphating','DOD-P-16232 / TT-C-490',1,'Bay 2',60,50,82),
  ('EP-PA-001','Passivation — Citric Acid','PASSIVATION','ELECTROPLATING','Passivation','ASTM A967 / AMS2700',7,'Bay 4',80,60,82),
  ('EP-CD-001','Cadmium Plating','CADMIUM','ELECTROPLATING','Cadmium','AMS-QQ-P-416 / SAE AMS2400',1,'Bay 4',69,44,82),
  ('EP-AG-001','Silver Plating (Bright)','SILVER_PLATE','ELECTROPLATING','Silver Plating','AMS2410 / AMS-QQ-S-365',1,'Bay 4',69,50,100),
  ('EP-BO-001','Black Oxide — Alkaline','BLACK_OXIDE','ELECTROPLATING','Black Oxide','MIL-DTL-13924 / AMS2485',7,'Bay 2',55,33,45);

  DECLARE @b INT;
  SET @b=(SELECT bath_id FROM dbo.ChemBath WHERE bath_code='EP-AN2-001');
  INSERT INTO dbo.BathParameter (bath_id,param_name,unit,min_value,max_value,test_method) VALUES
   (@b,'Sulfuric Acid Concentration','g/L',165,210,'Titration per AMS2470'),
   (@b,'Temperature','°C',18,22,'Calibrated thermometer'),
   (@b,'Dissolved Aluminium','g/L',NULL,20,'Titration');
  SET @b=(SELECT bath_id FROM dbo.ChemBath WHERE bath_code='EP-EN-001');
  INSERT INTO dbo.BathParameter (bath_id,param_name,unit,min_value,max_value,test_method) VALUES
   (@b,'Nickel Metal','g/L',5.5,6.5,'Titration'),
   (@b,'Phosphorus Content','%',10.0,13.0,'XRF'),
   (@b,'Bath pH','pH',4.6,5.2,'pH meter'),
   (@b,'Temperature','°C',85,92,'Calibrated thermometer');
  SET @b=(SELECT bath_id FROM dbo.ChemBath WHERE bath_code='EP-ZN-001');
  INSERT INTO dbo.BathParameter (bath_id,param_name,unit,min_value,max_value,test_method) VALUES
   (@b,'Zinc Metal','g/L',7,15,'Titration'),
   (@b,'Sodium Hydroxide','g/L',100,140,'Titration');
  SET @b=(SELECT bath_id FROM dbo.ChemBath WHERE bath_code='EP-PA-001');
  INSERT INTO dbo.BathParameter (bath_id,param_name,unit,min_value,max_value,test_method) VALUES
   (@b,'Citric Acid Concentration','%',4.0,10.0,'Titration per ASTM A967'),
   (@b,'Temperature','°C',49,71,'Calibrated thermometer'),
   (@b,'pH','pH',1.8,2.2,'pH meter');
END
GO

PRINT 'Migration 029 — MOD-06 FPI/Electroplating split complete.';
GO
