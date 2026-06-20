-- =============================================================================
-- MOD-28 — Process Capability Master (PCM)
-- Mirrors ATC-PCM-001 Rev A (Process Capability Matrix)
-- AS9100D §8.5 / customer & NADCAP special-process capability register
-- Migration: 030_mod28_pcm.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- ── Process families (the PCM process sheets, grouped) ───────────────────────
CREATE TABLE dbo.PcmProcess (
  pcm_process_id INT IDENTITY(1,1) PRIMARY KEY,
  process_name   NVARCHAR(120) NOT NULL UNIQUE,   -- 'Anodizing','Electroless Nickel',...
  process_group  NVARCHAR(30)  NOT NULL           -- 'ELECTROPLATING' | 'NDT' | 'CLEANROOM' | 'COATING' | 'OTHER'
                   CONSTRAINT CK_PcmProc_Group CHECK (process_group IN ('ELECTROPLATING','NDT','CLEANROOM','COATING','OTHER')),
  bay            NVARCHAR(20)  NULL,
  max_len_cm     DECIMAL(6,1)  NULL,
  max_wid_cm     DECIMAL(6,1)  NULL,
  max_dep_cm     DECIMAL(6,1)  NULL,
  is_upcoming    BIT NOT NULL DEFAULT 0,           -- PCM "red font / upcoming service"
  is_active      BIT NOT NULL DEFAULT 1
);
GO

-- ── Capability rows — (process × customer/category × specification) ──────────
CREATE TABLE dbo.PcmCapability (
  capability_id  INT IDENTITY(1,1) PRIMARY KEY,
  capability_ref NVARCHAR(20)  NOT NULL UNIQUE,    -- PCM-2026-0001
  pcm_process_id INT NOT NULL REFERENCES dbo.PcmProcess(pcm_process_id),
  customer_category NVARCHAR(120) NOT NULL,        -- 'General','Boeing','Airbus (Jin Pao)','Pratt & Whitney',...
  customer_id    INT NULL REFERENCES dbo.Customer(customer_id),
  specification  NVARCHAR(300) NOT NULL,           -- 'BAC 5019 Rev AA','SEP014 Indice D','SPOP-311',...
  tier1_class    NVARCHAR(MAX) NULL,
  tier2_class    NVARCHAR(MAX) NULL,
  tier3_class    NVARCHAR(MAX) NULL,
  tier4_class    NVARCHAR(MAX) NULL,
  max_len_cm     DECIMAL(6,1)  NULL,
  max_wid_cm     DECIMAL(6,1)  NULL,
  max_dep_cm     DECIMAL(6,1)  NULL,
  is_upcoming    BIT NOT NULL DEFAULT 0,
  notes          NVARCHAR(MAX) NULL,
  is_active      BIT NOT NULL DEFAULT 1,
  created_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at     DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO
CREATE INDEX IX_PcmCap_Process  ON dbo.PcmCapability(pcm_process_id, is_active);
CREATE INDEX IX_PcmCap_Customer ON dbo.PcmCapability(customer_category, is_active);
GO

-- ── PCM document revision history (mirrors HIST sheet) ───────────────────────
CREATE TABLE dbo.PcmRevision (
  rev_id        INT IDENTITY(1,1) PRIMARY KEY,
  document_no   NVARCHAR(30) NOT NULL DEFAULT 'ATC-PCM-001',
  revision      NVARCHAR(5)  NOT NULL,
  rev_date      DATE NOT NULL,
  originator    NVARCHAR(100) NULL,
  change_details NVARCHAR(MAX) NULL,
  reason        NVARCHAR(MAX) NULL
);
GO

CREATE TABLE dbo.Mod28Sequence (seq_key NVARCHAR(20) PRIMARY KEY, last_num INT NOT NULL DEFAULT 0);
INSERT INTO dbo.Mod28Sequence (seq_key, last_num) VALUES ('CAPABILITY', 0);
GO

INSERT INTO dbo.PcmRevision (document_no, revision, rev_date, originator, change_details, reason) VALUES
  ('ATC-PCM-001','A','2026-01-07','JF TEH','Initial release','-');
GO

PRINT 'Migration 030 — MOD-28 Process Capability Master schema complete.';
GO
-- NOTE: capability/process rows are seeded from ATC-PCM-001 via tools/import_pcm.py
-- (generates 031_pcm_seed.sql + the atca-demo.js / preview_server.py demo data).
GO
