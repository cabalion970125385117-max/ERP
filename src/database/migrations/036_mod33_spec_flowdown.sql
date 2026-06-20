-- ============================================================
-- ATCA-ERP v1.0 — Migration 036
-- MOD-33: Spec & Flowdown / Frozen Process Control + ECN + AAM
-- NADCAP Frozen Process | AS9100D §8.1.x, §8.5.6 | NADCAP AAM
-- ============================================================
-- Spec library, parameter flowdown from spec → process recipe,
-- frozen-parameter change requires customer approval (ECN),
-- links PCM ↔ Qualification. AAM = Acceptance Authority Matrix.
-- ============================================================

USE ATCA_ERP_DB;
GO

/* ── SpecLibrary ─────────────────────────────────────────────────
   Master list of customer, industry, and internal specifications
   that drive process parameters across bays.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='SpecLibrary')
CREATE TABLE dbo.SpecLibrary (
    spec_id             INT IDENTITY(1,1) PRIMARY KEY,
    spec_code           NVARCHAR(50) NOT NULL UNIQUE,  -- e.g. BAC5019, SEP014, AMS2470
    spec_title          NVARCHAR(200) NOT NULL,
    revision            NVARCHAR(20) NOT NULL DEFAULT 'Rev A',
    customer_code       NVARCHAR(50) NULL,   -- NULL = industry standard (AMS, MIL, etc.)
    spec_type           NVARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
                        CHECK (spec_type IN ('CUSTOMER','INDUSTRY','INTERNAL')),
    process_area        NVARCHAR(100) NULL,   -- primary process area it governs
    capability_id       INT NULL,            -- FK → PcmCapability (optional link)

    -- Frozen process flags (NADCAP)
    is_frozen           BIT NOT NULL DEFAULT 0,
    frozen_since        DATE NULL,
    freeze_approved_by  INT NULL,            -- FK → Users

    -- Approval
    status              NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','SUPERSEDED','WITHDRAWN','DRAFT')),
    approved_by         INT NULL,
    approved_date       DATE NULL,
    superseded_by       NVARCHAR(50) NULL,   -- spec_code that replaces this

    notes               NVARCHAR(500) NULL,
    created_by          INT NULL,
    created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── SpecParameter ───────────────────────────────────────────────
   The controlled parameters that flow down from a spec into recipes.
   Frozen params require an ECN for any change.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='SpecParameter')
CREATE TABLE dbo.SpecParameter (
    param_id        INT IDENTITY(1,1) PRIMARY KEY,
    spec_id         INT NOT NULL REFERENCES dbo.SpecLibrary(spec_id),
    param_name      NVARCHAR(100) NOT NULL,
    param_category  NVARCHAR(50) NULL,    -- e.g. 'Bath Chemistry','Temperature','Time','pH'
    value_nominal   NVARCHAR(50) NULL,
    value_min       NVARCHAR(50) NULL,
    value_max       NVARCHAR(50) NULL,
    unit            NVARCHAR(20) NULL,
    tolerance       NVARCHAR(50) NULL,
    is_frozen       BIT NOT NULL DEFAULT 0,  -- this specific parameter is frozen
    is_critical     BIT NOT NULL DEFAULT 0,  -- CTQ — critical to quality
    test_method     NVARCHAR(100) NULL,
    frequency       NVARCHAR(50) NULL,       -- e.g. 'Every batch','Weekly','Monthly'
    notes           NVARCHAR(300) NULL,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── ProcessRecipe ───────────────────────────────────────────────
   A validated process recipe linked to a spec. When the spec is
   frozen, the recipe is locked; changes require an approved ECN.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='ProcessRecipe')
CREATE TABLE dbo.ProcessRecipe (
    recipe_id       INT IDENTITY(1,1) PRIMARY KEY,
    recipe_ref      AS ('RCP-' + FORMAT(recipe_id,'0000')) PERSISTED,
    spec_id         INT NOT NULL REFERENCES dbo.SpecLibrary(spec_id),
    capability_id   INT NULL,   -- FK → PcmCapability
    recipe_name     NVARCHAR(100) NOT NULL,
    version         NVARCHAR(10) NOT NULL DEFAULT '1.0',
    process_area    NVARCHAR(100) NULL,
    bay             NVARCHAR(10) NULL,

    -- Parameter snapshot (JSON blob of critical params at freeze time)
    parameter_snapshot NVARCHAR(MAX) NULL,  -- JSON string

    is_frozen       BIT NOT NULL DEFAULT 0,
    frozen_at       DATETIME2 NULL,
    frozen_by       INT NULL,   -- FK → Users

    status          NVARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','APPROVED','FROZEN','SUPERSEDED')),
    approved_by     INT NULL,
    approved_at     DATETIME2 NULL,

    notes           NVARCHAR(500) NULL,
    created_by      INT NULL,
    created_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── ECN (Engineering Change Notice) ─────────────────────────────
   Frozen-parameter change requires customer approval (ECN workflow).
   AS9100D §8.5.6. Once the customer approves, the recipe can be
   unfrozen → updated → re-frozen under the new ECN reference.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='ECN')
CREATE TABLE dbo.ECN (
    ecn_id              INT IDENTITY(1,1) PRIMARY KEY,
    ecn_ref             AS ('ECN-' + FORMAT(YEAR(GETUTCDATE()),'0000') + '-' + FORMAT(ecn_id,'0000')) PERSISTED,
    title               NVARCHAR(200) NOT NULL,
    description         NVARCHAR(MAX) NULL,
    change_type         NVARCHAR(30) NOT NULL DEFAULT 'PARAMETER_CHANGE'
                        CHECK (change_type IN ('PARAMETER_CHANGE','SPEC_REVISION','PROCESS_CHANGE','EQUIPMENT_CHANGE','SUPPLIER_CHANGE','OTHER')),
    affected_spec_id    INT NULL REFERENCES dbo.SpecLibrary(spec_id),
    affected_recipe_id  INT NULL REFERENCES dbo.ProcessRecipe(recipe_id),
    affected_capability_id INT NULL,  -- FK → PcmCapability

    -- What is changing
    old_value           NVARCHAR(500) NULL,
    new_value           NVARCHAR(500) NULL,
    justification       NVARCHAR(MAX) NULL,

    -- Impact assessment
    customer_approval_required BIT NOT NULL DEFAULT 1,
    nadcap_notification_required BIT NOT NULL DEFAULT 0,
    risk_level          NVARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                        CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),

    -- Workflow
    status              NVARCHAR(25) NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','PENDING_REVIEW','PENDING_CUSTOMER','CUSTOMER_APPROVED','CUSTOMER_REJECTED','APPROVED','REJECTED','IMPLEMENTED','WITHDRAWN')),
    submitted_by        INT NULL,   -- FK → Users
    submitted_at        DATETIME2 NULL,
    reviewed_by         INT NULL,
    reviewed_at         DATETIME2 NULL,
    customer_ref        NVARCHAR(100) NULL,  -- customer's own approval reference
    customer_approved_by NVARCHAR(100) NULL, -- free-text (external contact)
    customer_approval_date DATE NULL,
    approved_by         INT NULL,   -- internal QA_MANAGER
    approved_at         DATETIME2 NULL,
    implemented_by      INT NULL,
    implemented_at      DATETIME2 NULL,
    target_date         DATE NULL,

    notes               NVARCHAR(500) NULL,
    created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── AAM (Acceptance Authority Matrix) ───────────────────────────
   Who may accept/release/approve what. Includes the 2-person rule
   for destructive or irreversible operations. AS9100D §8.6, NADCAP.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='AAM')
CREATE TABLE dbo.AAM (
    aam_id              INT IDENTITY(1,1) PRIMARY KEY,
    process_area        NVARCHAR(100) NOT NULL,
    action_type         NVARCHAR(100) NOT NULL,   -- e.g. 'Approve CoC','Release lot','Sign traveler step'
    min_role            NVARCHAR(30) NOT NULL,     -- minimum RBAC role required
    two_person_required BIT NOT NULL DEFAULT 0,   -- 2-person integrity rule
    second_role         NVARCHAR(30) NULL,         -- role of second person (if 2-person)
    requires_operator_pin BIT NOT NULL DEFAULT 0, -- must use MOD-31 PIN sign-off
    requires_qam_approval BIT NOT NULL DEFAULT 0, -- QA_MANAGER must co-sign
    is_irreversible     BIT NOT NULL DEFAULT 0,   -- destructive / irreversible op
    effective_date      DATE NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
    approved_by         INT NULL,   -- FK → Users
    notes               NVARCHAR(300) NULL,
    is_active           BIT NOT NULL DEFAULT 1,
    created_at          DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);
GO

/* ── Mod33Sequence ───────────────────────────────────────────────
   Audit trail for ECN status transitions and spec freeze events.
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Mod33Sequence')
CREATE TABLE dbo.Mod33Sequence (
    seq_id      INT IDENTITY(1,1) PRIMARY KEY,
    entity_type NVARCHAR(20) NOT NULL,  -- 'ECN','SPEC','RECIPE','AAM'
    entity_id   INT NOT NULL,
    action      NVARCHAR(40) NOT NULL,
    action_by   INT NULL,
    action_at   DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    old_status  NVARCHAR(25) NULL,
    new_status  NVARCHAR(25) NULL,
    notes       NVARCHAR(300) NULL
);
GO

/* ── vw_ECNSummary ───────────────────────────────────────────────
   ECN register with spec title for quick display.
----------------------------------------------------------------- */
IF EXISTS (SELECT 1 FROM sys.views WHERE name='vw_ECNSummary')
    DROP VIEW dbo.vw_ECNSummary;
GO
CREATE VIEW dbo.vw_ECNSummary AS
SELECT
    e.ecn_id, e.ecn_ref, e.title, e.change_type, e.risk_level, e.status,
    e.customer_approval_required, e.nadcap_notification_required,
    e.submitted_at, e.customer_approval_date, e.implemented_at, e.target_date,
    s.spec_code, s.spec_title, s.customer_code,
    DATEDIFF(day, e.submitted_at, GETUTCDATE()) AS days_open
FROM dbo.ECN e
LEFT JOIN dbo.SpecLibrary s ON s.spec_id = e.affected_spec_id;
GO

/* ── Seed SpecLibrary with real ATC customer/process specs ───────
   Based on ATC-PCM-001 Column Headers (BAC, SEP, SPOP, EPRO, MIL…)
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.SpecLibrary WHERE spec_code='BAC5019')
INSERT INTO dbo.SpecLibrary (spec_code, spec_title, revision, customer_code, spec_type, process_area, is_frozen, status) VALUES
  ('BAC5019', 'Boeing Anodize Coating (Chromic/Sulfuric)', 'Rev T', 'Boeing', 'CUSTOMER', 'Anodizing', 1, 'ACTIVE'),
  ('BAC5719', 'Boeing Chemical Film Coating (Alodine)', 'Rev F', 'Boeing', 'CUSTOMER', 'Chemical Film', 1, 'ACTIVE'),
  ('SEP014',  'Safran Special Electroless Nickel Process', 'Rev 5', 'Safran', 'CUSTOMER', 'Electroless Nickel', 1, 'ACTIVE'),
  ('SPOP-311','Spirit AeroSystems Passivation Process', 'Rev B', 'Spirit', 'CUSTOMER', 'Passivation', 0, 'ACTIVE'),
  ('EPRO-7',  'Airbus Electroplating Process Order 7',   'Rev 3', 'Airbus', 'CUSTOMER', 'Cadmium Plating', 1, 'ACTIVE'),
  ('AMS2470', 'Hard Anodizing of Aluminum Alloys (AMS)', 'Rev H', NULL,    'INDUSTRY', 'Anodizing', 0, 'ACTIVE'),
  ('AMS2480', 'Hard Chrome Plating of Steel Parts',       'Rev C', NULL,    'INDUSTRY', 'Chrome Plating', 0, 'ACTIVE'),
  ('AMS2750', 'Pyrometry Requirements for Thermal Processing Equip', 'Rev H', NULL, 'INDUSTRY', 'Heat Treatment', 1, 'ACTIVE'),
  ('MIL-A-8625','Anodic Coatings for Aluminum (MIL-SPEC)', 'Rev F', NULL,  'INDUSTRY', 'Anodizing', 0, 'ACTIVE'),
  ('ATCA-WI-001','ATCA Internal Work Instruction — FPI Setup',     'Rev 2', NULL, 'INTERNAL', 'FPI', 0, 'ACTIVE');
GO

/* ── Seed AAM entries ────────────────────────────────────────────
   Based on NADCAP / AS9100D roles typical for an aerospace NDT shop
----------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.AAM WHERE action_type='Approve Certificate of Conformance')
INSERT INTO dbo.AAM (process_area, action_type, min_role, two_person_required, second_role, requires_operator_pin, requires_qam_approval, is_irreversible, notes) VALUES
  ('All',            'Approve Certificate of Conformance', 'QA_MANAGER', 1, 'ENGINEER', 0, 1, 0, 'AS9100D §8.6 — QA_MANAGER must sign; ENGINEER counter-signs.'),
  ('FPI',            'Release FPI Lot to Next Operation',  'SUPERVISOR',  0, NULL,       1, 0, 0, 'Operator PIN sign-off required on traveler step.'),
  ('MPT',            'Release MPT Lot to Next Operation',  'SUPERVISOR',  0, NULL,       1, 0, 0, 'Operator PIN sign-off required.'),
  ('Cadmium Plating','Approve Cadmium Bath Make-Up',       'ENGINEER',    1, 'QA_MANAGER',0,1, 0, '2-person required — controlled substance (cyanide cadmium).'),
  ('Heat Treatment', 'Sign Off TUS/SAT Test Result',       'ENGINEER',    0, NULL,       0, 0, 0, 'Engineer records TUS/SAT; QA reviews overdue.'),
  ('All',            'Raise Engineering Change Notice (ECN)','ENGINEER',  0, NULL,       0, 1, 1, 'Frozen-process change — irreversible until customer approves.'),
  ('All',            'Approve ECN (Internal Release)',     'QA_MANAGER',  1, 'ENGINEER', 0, 1, 1, 'QA_MANAGER + ENGINEER dual approval for frozen-process ECNs.'),
  ('NDT',            'Sign Level III Interpretation Report','ENGINEER',   0, NULL,       1, 0, 0, 'NAS410 Level III PIN sign-off.'),
  ('All',            'Archive/Withdraw Active Spec',       'ADMIN',       1, 'QA_MANAGER',0,1, 1, 'Withdrawal of active spec is irreversible without ECN.'),
  ('All',            'Unlock Frozen Process Recipe',       'QA_MANAGER',  1, 'ADMIN',    0, 1, 1, 'Must have approved ECN. QA_MANAGER + ADMIN dual unlock.');
GO
