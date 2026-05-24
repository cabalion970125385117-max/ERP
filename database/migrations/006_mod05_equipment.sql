-- ============================================================
-- ATCA-ERP | DATABASE MIGRATION 006
-- MOD-05: Equipment & Calibration Management
-- AS9100D §7.1.3 (Infrastructure) | §7.1.5 (Monitoring Resources)
-- NADCAP AC7114 | NAS410 §5.3
-- Run after 005_mod04_personnel.sql
-- ============================================================

USE ATCA_ERP_DB;
GO

-- ============================================================
-- TABLE: dbo.Equipment — Equipment Register
-- ============================================================
CREATE TABLE dbo.Equipment (
    equipment_id        INT             NOT NULL IDENTITY(1,1),
    equip_code          NVARCHAR(50)    NOT NULL,       -- e.g. ATCA-NDT-FPI-35IR
    description         NVARCHAR(200)   NOT NULL,
    make_model          NVARCHAR(100)   NULL,
    serial_number       NVARCHAR(100)   NULL,
    used_for            NVARCHAR(200)   NULL,           -- Process use description
    location            NVARCHAR(100)   NULL DEFAULT 'ATCA FPI Lab',
    equip_type          NVARCHAR(20)    NOT NULL
                            CONSTRAINT chk_equip_type CHECK (
                                equip_type IN ('UV_LAMP','THERMOMETER','PRESSURE_GAUGE',
                                               'OVEN','PHOTOMETER','TIMER','CALIPER',
                                               'BALANCE','TAM_PANEL','REFRACTOMETER',
                                               'IR_THERMOMETER','HYGROMETER','OTHER')),
    process_area        NVARCHAR(20)    NOT NULL DEFAULT 'FPI'
                            CONSTRAINT chk_equip_area CHECK (
                                process_area IN ('FPI','MPT','ECT','UT','PLATING','GENERAL')),
    -- Calibration requirements
    cal_required        BIT             NOT NULL DEFAULT 1,
    cal_interval_months TINYINT         NULL,           -- e.g. 6 = every 6 months
    acceptance_criteria NVARCHAR(300)   NULL,           -- e.g. 'UV: ≥1000 μW/cm² at 15 in'
    cal_vendor          NVARCHAR(100)   NULL,           -- Default cal vendor
    -- Status
    status              NVARCHAR(12)    NOT NULL DEFAULT 'ACTIVE'
                            CONSTRAINT chk_equip_status CHECK (
                                status IN ('ACTIVE','INACTIVE','RETIRED','OUT_FOR_CAL')),
    is_active           BIT             NOT NULL DEFAULT 1,
    created_by          INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_equipment         PRIMARY KEY (equipment_id),
    CONSTRAINT uq_equip_code        UNIQUE (equip_code),
    CONSTRAINT fk_equip_created_by  FOREIGN KEY (created_by) REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.CalibrationRecord — Calibration History
-- AS9100D §7.1.5.1 — Measurement Traceability
-- ============================================================
CREATE TABLE dbo.CalibrationRecord (
    cal_id              INT             NOT NULL IDENTITY(1,1),
    equipment_id        INT             NOT NULL,
    cal_ref             NVARCHAR(30)    NOT NULL,       -- e.g. ATCA-CAL-2026-001
    cal_date            DATE            NOT NULL,
    cal_due_date        DATE            NOT NULL,       -- cal_date + cal_interval_months
    cal_vendor          NVARCHAR(100)   NULL,
    cert_number         NVARCHAR(100)   NULL,           -- Vendor calibration cert number
    -- Result
    result              NVARCHAR(12)    NOT NULL DEFAULT 'PASS'
                            CONSTRAINT chk_cal_result CHECK (
                                result IN ('PASS','FAIL','CONDITIONAL','ADJUSTED')),
    out_of_tolerance    BIT             NOT NULL DEFAULT 0,
    deviation_noted     NVARCHAR(300)   NULL,           -- What was out of spec
    corrective_action   NVARCHAR(300)   NULL,
    -- Measurement values (optional structured storage)
    measured_value      NVARCHAR(100)   NULL,           -- e.g. '1250 μW/cm²'
    acceptance_criteria NVARCHAR(200)   NULL,           -- Snapshot at time of cal
    notes               NVARCHAR(500)   NULL,
    -- Audit trail
    recorded_by         INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_cal_record        PRIMARY KEY (cal_id),
    CONSTRAINT uq_cal_ref           UNIQUE (cal_ref),
    CONSTRAINT fk_cal_equipment     FOREIGN KEY (equipment_id) REFERENCES dbo.Equipment(equipment_id),
    CONSTRAINT fk_cal_recorded_by   FOREIGN KEY (recorded_by)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- VIEW: Equipment with latest calibration status
-- ============================================================
CREATE VIEW dbo.vw_EquipmentCalStatus AS
SELECT
    e.equipment_id,
    e.equip_code,
    e.description,
    e.make_model,
    e.serial_number,
    e.equip_type,
    e.process_area,
    e.location,
    e.cal_required,
    e.cal_interval_months,
    e.acceptance_criteria,
    e.status         AS equip_status,
    e.is_active,
    -- Latest calibration
    cr.cal_id        AS latest_cal_id,
    cr.cal_ref       AS latest_cal_ref,
    cr.cal_date      AS last_cal_date,
    cr.cal_due_date,
    cr.result        AS last_cal_result,
    cr.cal_vendor    AS last_cal_vendor,
    cr.cert_number   AS last_cert_number,
    cr.out_of_tolerance,
    DATEDIFF(DAY, GETUTCDATE(), cr.cal_due_date) AS days_until_cal_due,
    CASE
        WHEN e.cal_required = 0 THEN 'N/A'
        WHEN cr.cal_id IS NULL  THEN 'NEVER_CALIBRATED'
        WHEN cr.cal_due_date < CAST(GETUTCDATE() AS DATE) THEN 'OVERDUE'
        WHEN DATEDIFF(DAY, GETUTCDATE(), cr.cal_due_date) <= 30 THEN 'DUE_SOON'
        ELSE 'CURRENT'
    END AS cal_rag_status
FROM dbo.Equipment e
LEFT JOIN dbo.CalibrationRecord cr ON cr.cal_id = (
    SELECT TOP 1 cal_id FROM dbo.CalibrationRecord
    WHERE equipment_id = e.equipment_id
    ORDER BY cal_date DESC
)
WHERE e.is_active = 1;
GO

-- ============================================================
-- AUDIT TRIGGER
-- ============================================================
CREATE TRIGGER trg_Equipment_Audit
ON dbo.Equipment
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'Equipment', CAST(i.equipment_id AS NVARCHAR(50)), 'MOD-05'
    FROM inserted i;
END;
GO

CREATE TRIGGER trg_CalibrationRecord_Audit
ON dbo.CalibrationRecord
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT 'INSERT', 'CalibrationRecord', CAST(i.cal_id AS NVARCHAR(50)), 'MOD-05'
    FROM inserted i;
END;
GO

-- ============================================================
-- SEED DATA — Real ATCA Equipment (from REAL_DATA sheet)
-- ============================================================
INSERT INTO dbo.Equipment (equip_code, description, make_model, serial_number,
    used_for, equip_type, process_area, cal_required,
    cal_interval_months, acceptance_criteria, cal_vendor, created_by)
VALUES
('ATCA-NDT-FPI-20RP',  'Radiometer / UV Photometer',
    'Labino', 'EF679A47EB55',
    'UV intensity + ambient light measurement at 15 in',
    'PHOTOMETER', 'FPI', 1, 12,
    'UV-A ≥1000 μW/cm² at 15 in | White light ≤2 fc (ASTM E3022)',
    'Trescal', 1),
('ATCA-NDT-FPI-35IR',  'Infrared Thermometer',
    NULL, 'ATCA-NDT-FPI-35IR',
    'Part surface + ambient + penetrant temperature measurement',
    'IR_THERMOMETER', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-36IR',  'Infrared Thermometer (2nd)',
    NULL, 'ATCA-NDT-FPI-36IR',
    'Backup IR thermometer for FPI temperature checks',
    'IR_THERMOMETER', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-01TM',  'Digital Timer #1',
    NULL, NULL,
    'FPI dwell and development time control',
    'TIMER', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-02TM',  'Digital Timer #2',
    NULL, NULL, 'FPI timing', 'TIMER', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-03TM',  'Digital Timer #3',
    NULL, NULL, 'FPI timing', 'TIMER', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-04TM',  'Digital Timer #4',
    NULL, NULL, 'FPI timing', 'TIMER', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-05AG',  'Air Pressure Gauge #1',
    NULL, NULL,
    'Water wash spray pressure monitoring (max 40 PSI)',
    'PRESSURE_GAUGE', 'FPI', 1, 6, 'Max 40 PSI water / 25 PSI air',
    'Trescal', 1),
('ATCA-NDT-FPI-06AG',  'Air Pressure Gauge #2',
    NULL, NULL, 'FPI air pressure monitoring', 'PRESSURE_GAUGE', 'FPI', 1, 6, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-07AG',  'Air Pressure Gauge #3',
    NULL, NULL, 'FPI air pressure monitoring', 'PRESSURE_GAUGE', 'FPI', 1, 6, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-09DIWG','DI Water Pressure Gauge',
    NULL, NULL,
    'DI water pressure monitoring for wash station',
    'PRESSURE_GAUGE', 'FPI', 1, 12, NULL, 'Trescal', 1),
('ATCA-NDT-FPI-11DIWT','DI Water Temperature Gauge',
    NULL, NULL,
    'DI water temperature monitoring (10–38°C)',
    'THERMOMETER', 'FPI', 1, 12, '10–38°C (ASTM E1417)', 'Trescal', 1),
('OVEN-01',            'Air Circulated Drying Oven — Temperature Controller',
    NULL, NULL,
    'Part drying at 65°C ±3°C per FPI Master Process Procedure Rev 03',
    'OVEN', 'FPI', 1, 6, '65°C ±3°C',
    'Trescal / Nakcal / Bestlab', 1),
('OVEN-01-IND',        'Air Circulated Drying Oven — Temperature Indicator',
    NULL, NULL,
    'Secondary oven temperature display for process verification',
    'THERMOMETER', 'FPI', 1, 6, '65°C ±3°C', 'Bestlab', 1),
('REFRACT-01',         'Refractometer',
    NULL, 'REFRACT-01',
    'Weekly emulsifier concentration check',
    'REFRACTOMETER', 'FPI', 1, 12, NULL, NULL, 1),
('TAM-PSM5-WW-L2',    'PSM-5 TAM Panel — Water-Washable Level 2',
    'PSM-5', '46133',
    'Daily system performance check (water-washable Level 2)',
    'TAM_PANEL', 'FPI', 0, NULL,
    'Initial qualification + periodic degradation check per ATCA/FPI/TP/01',
    NULL, 1),
('TAM-PSM5-WW-L3',    'PSM-5 TAM Panel — Water-Washable Level 3',
    'PSM-5', '49753',
    'Daily system performance check (water-washable Level 3)',
    'TAM_PANEL', 'FPI', 0, NULL, NULL, NULL, 1),
('TAM-PSM5-PE-L3',    'PSM-5 TAM Panel — Post-Emulsified Level 3',
    'PSM-5', '58010',
    'Daily system performance check (post-emulsified Level 3)',
    'TAM_PANEL', 'FPI', 0, NULL, NULL, NULL, 1),
('TAM-PSM5-PE-L4',    'PSM-5 TAM Panel — Post-Emulsified Level 4',
    'PSM-5', '58011',
    'Daily system performance check (post-emulsified Level 4)',
    'TAM_PANEL', 'FPI', 0, NULL, NULL, NULL, 1),
('ATCA-NDT-FMPI-44AT','Digital Thermo-Hygrometer',
    NULL, NULL,
    'Ambient temperature and humidity monitoring in FPI lab',
    'HYGROMETER', 'FPI', 1, 12, NULL, 'Trescal', 1);
GO

PRINT 'Migration 006 — MOD-05 Equipment & Calibration: COMPLETE';
GO
