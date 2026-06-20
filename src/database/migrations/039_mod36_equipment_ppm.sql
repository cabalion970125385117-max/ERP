-- ============================================================
-- Migration 039 — MOD-36 Equipment Periodic Preventive Maintenance
-- ATCA-ERP | ATC Aviation Pte Ltd
-- Compliance: AS9100D §7.1.3, AMS 2750H (oven PM), NADCAP equipment requirements
-- ============================================================

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

CREATE TABLE EquipmentAsset (
  asset_id       INT IDENTITY(1,1) PRIMARY KEY,
  asset_tag      NVARCHAR(50)  NOT NULL UNIQUE,
  asset_name     NVARCHAR(200) NOT NULL,
  asset_category NVARCHAR(20)  NOT NULL,
  location       NVARCHAR(100),
  manufacturer   NVARCHAR(100),
  model_number   NVARCHAR(100),
  serial_number  NVARCHAR(100),
  install_date   DATE,
  status         NVARCHAR(20)  DEFAULT 'OPERATIONAL',
  mod30_oven_ref NVARCHAR(50)  NULL,
  is_active      BIT DEFAULT 1,
  created_at     DATETIME2 DEFAULT GETDATE(),
  CONSTRAINT chk_asset_cat    CHECK (asset_category IN ('OVEN','TANK','NDT_EQUIPMENT','ELECTRICAL','HVAC','INSTRUMENT','COMPRESSOR','PUMP','RECTIFIER','OTHER')),
  CONSTRAINT chk_asset_status CHECK (status          IN ('OPERATIONAL','UNDER_MAINTENANCE','OUT_OF_SERVICE','DECOMMISSIONED'))
);

CREATE TABLE PPMSchedule (
  schedule_id     INT IDENTITY(1,1) PRIMARY KEY,
  asset_id        INT REFERENCES EquipmentAsset(asset_id),
  schedule_name   NVARCHAR(200) NOT NULL,
  frequency       NVARCHAR(15)  NOT NULL,
  last_done_date  DATE,
  next_due_date   DATE NOT NULL,
  estimated_hours DECIMAL(5,2),
  assigned_role   NVARCHAR(50),
  is_active       BIT DEFAULT 1,
  notes           NVARCHAR(500),
  created_at      DATETIME2 DEFAULT GETDATE(),
  CONSTRAINT chk_ppm_freq CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','SEMI_ANNUAL','ANNUAL'))
);

CREATE TABLE PPMChecklist (
  task_id             INT IDENTITY(1,1) PRIMARY KEY,
  schedule_id         INT REFERENCES PPMSchedule(schedule_id),
  task_order          INT           NOT NULL,
  task_description    NVARCHAR(500) NOT NULL,
  requires_measurement BIT DEFAULT 0,
  measurement_unit    NVARCHAR(30),
  pass_criteria       NVARCHAR(200),
  is_mandatory        BIT DEFAULT 1
);

CREATE TABLE PPMLog (
  log_id            INT IDENTITY(1,1) PRIMARY KEY,
  schedule_id       INT REFERENCES PPMSchedule(schedule_id),
  asset_id          INT REFERENCES EquipmentAsset(asset_id),
  performed_date    DATE          NOT NULL,
  performed_by      NVARCHAR(100) NOT NULL,
  duration_hours    DECIMAL(5,2),
  status            NVARCHAR(15)  DEFAULT 'COMPLETED',
  findings          NVARCHAR(1000),
  corrective_action NVARCHAR(1000),
  created_at        DATETIME2 DEFAULT GETDATE(),
  CONSTRAINT chk_ppm_log_status CHECK (status IN ('COMPLETED','PARTIAL','FAILED','DEFERRED'))
);

-- ─────────────────────────────────────────────
-- View — PM Due Queue (RAG)
-- ─────────────────────────────────────────────

CREATE VIEW vw_PPMDue AS
SELECT
  s.schedule_id, s.asset_id, s.schedule_name, s.frequency,
  s.last_done_date, s.next_due_date, s.estimated_hours, s.assigned_role,
  a.asset_tag, a.asset_name, a.asset_category, a.location, a.status AS asset_status,
  DATEDIFF(DAY, GETDATE(), s.next_due_date) AS days_until_due,
  CASE
    WHEN s.next_due_date < CAST(GETDATE() AS DATE)                      THEN 'OVERDUE'
    WHEN DATEDIFF(DAY, GETDATE(), s.next_due_date) <= 7                 THEN 'DUE_SOON'
    ELSE 'OK'
  END AS pm_rag
FROM PPMSchedule s
JOIN EquipmentAsset a ON s.asset_id = a.asset_id
WHERE s.is_active = 1 AND a.is_active = 1;

-- ─────────────────────────────────────────────
-- Seed — Equipment Assets (15)
-- ─────────────────────────────────────────────

INSERT INTO EquipmentAsset (asset_tag, asset_name, asset_category, location, manufacturer, model_number, serial_number, install_date, status, mod30_oven_ref) VALUES
-- Ovens (linked to MOD-30)
('EQ-OVEN-004', 'Drying Oven 4 — Honeywell Al/Carbon Fibre',      'OVEN',         'Bay 2 Production', 'Despatch Industries', 'LCC-Series',     'DESP-LCC-0042', '2018-03-01', 'OPERATIONAL',      'ATCT OVEN 4'),
('EQ-OVEN-008', 'Baking & Heat Treatment Oven 8',                  'OVEN',         'Bay 3 Production', 'Grieve Corporation', 'NB-650',         'GRIEV-NB-0081', '2016-06-15', 'OPERATIONAL',      'ATCT OVEN 8'),
('EQ-OVEN-009', 'Baking & Heat Treatment Oven 9',                  'OVEN',         'Bay 3 Production', 'Grieve Corporation', 'NB-650',         'GRIEV-NB-0094', '2016-06-15', 'OPERATIONAL',      'ATCT OVEN 9'),
('EQ-OVEN-016', 'Muffle Furnace 16 — High-Temp',                   'OVEN',         'Bay 4 Production', 'Carbolite Gero',     'ELF 11/14B',     'CARB-ELF-0163', '2019-09-01', 'UNDER_MAINTENANCE','ATCT OVEN 16'),
-- Chemical tanks
('EQ-TANK-CAD1','Cadmium Cyanide Plating Tank #1',                 'TANK',         'Bay 2 Plating',    'ATCA In-house',      'Custom PP Tank', 'TANK-CAD-001',  '2015-01-01', 'OPERATIONAL',      NULL),
('EQ-TANK-ANO1','Type II Sulfuric Acid Anodizing Tank (Auto Line)','TANK',         'Bay 5 Anodize',    'Technic Inc',        'LPC-Series',     'TECH-LPC-0051', '2017-04-01', 'OPERATIONAL',      NULL),
('EQ-TANK-EN1', 'Electroless Nickel Plating Tank',                 'TANK',         'Bay 2 Plating',    'MacDermid Enthone',  'Custom PTFE',    'MACE-EN-0011',  '2018-08-01', 'OPERATIONAL',      NULL),
-- NDT equipment
('EQ-FPI-001',  'FPI Fluorescent Penetrant Inspection Unit',       'NDT_EQUIPMENT','NDT Bay FPI',      'Magnaflux',          'SYCLONE 30',     'MAGN-SC30-0012','2019-02-01', 'OPERATIONAL',      NULL),
('EQ-MPI-001',  'MPI Wet Fluorescent Bench Unit',                  'NDT_EQUIPMENT','NDT Bay MPI',      'Magnaflux',          'Y-8 Wet',        'MAGN-Y8-0007',  '2019-02-01', 'OPERATIONAL',      NULL),
-- Compressors
('EQ-COMP-001', 'Air Compressor #1 — Atlas Copco',                 'COMPRESSOR',   'Compressor Room',  'Atlas Copco',        'GA 18+',         'ATCO-GA18-0041','2017-11-01', 'OPERATIONAL',      NULL),
('EQ-COMP-002', 'Air Compressor #2 — Atlas Copco (Standby)',       'COMPRESSOR',   'Compressor Room',  'Atlas Copco',        'GA 18+',         'ATCO-GA18-0042','2017-11-01', 'OPERATIONAL',      NULL),
-- Rectifiers
('EQ-RECT-001', 'Plating Rectifier #1 — Anodize Line',             'RECTIFIER',    'Bay 5 Anodize',    'Dynacraft',          'SCR-2000',       'DYNC-SCR-0014', '2016-05-01', 'OPERATIONAL',      NULL),
('EQ-RECT-002', 'Plating Rectifier #2 — Cadmium/Zinc Line',        'RECTIFIER',    'Bay 2 Plating',    'Dynacraft',          'SCR-3000',       'DYNC-SCR-0028', '2018-01-01', 'OPERATIONAL',      NULL),
-- HVAC / exhaust
('EQ-HVAC-001', 'Chemical Fume Extraction Unit — Bays 2–3',        'HVAC',         'Roof / Bays 2–3',  'Fantech',            'CVX-1500',       'FANT-CVX-0009', '2016-03-01', 'OPERATIONAL',      NULL),
-- Instruments
('EQ-INST-001', 'Portable pH Meter & Probe Set',                   'INSTRUMENT',   'Bath Lab',         'Mettler-Toledo',     'FiveGo F2',      'METT-F2-0023',  '2021-07-01', 'OPERATIONAL',      NULL);

-- ─────────────────────────────────────────────
-- Seed — PPM Schedules (12)
-- Today ref: 2026-06-21
-- OVERDUE = next_due_date < 2026-06-21
-- DUE_SOON = within 7 days (≤ 2026-06-28)
-- OK = beyond 2026-06-28
-- ─────────────────────────────────────────────

INSERT INTO PPMSchedule (asset_id, schedule_name, frequency, last_done_date, next_due_date, estimated_hours, assigned_role, notes) VALUES
-- OVERDUE
(4,  'Muffle Furnace 16 Monthly Safety Inspection',       'MONTHLY',     '2026-05-01', '2026-06-01', 2.0,  'ENGINEER',    'AMS 2750H requirement — monthly thermocouple & door-seal check'),
(5,  'Cadmium Tank #1 Weekly Chemistry & Safety Check',   'WEEKLY',      '2026-06-07', '2026-06-14', 0.5,  'SUPERVISOR',  'pH, cyanide level spot-check; two-person rule applies'),
(10, 'Air Compressor #1 Monthly Service',                 'MONTHLY',     '2026-05-05', '2026-06-05', 1.5,  'SUPERVISOR',  'Oil level, filter, belt tension, safety valve test'),
(12, 'Plating Rectifier #1 Quarterly Service',            'QUARTERLY',   '2026-03-10', '2026-06-10', 3.0,  'ENGINEER',    'Output voltage/current calibration, cooling fan, capacitor check'),
-- DUE_SOON (within 7 days of 2026-06-21)
(1,  'Drying Oven 4 Weekly Temperature Uniformity Check', 'WEEKLY',      '2026-06-17', '2026-06-24', 0.5,  'SUPERVISOR',  'Spot-check 3 thermocouple positions against set-point'),
(9,  'MPI Bench Monthly Service & Field-Strength Check',  'MONTHLY',     '2026-05-25', '2026-06-25', 1.5,  'ENGINEER',    'Field strength verification per NAS410; UV lamp intensity check'),
(14, 'Fume Extraction Unit Monthly Airflow Check',        'MONTHLY',     '2026-05-26', '2026-06-26', 1.0,  'SUPERVISOR',  'Airflow velocity check at each hood; filter condition inspection'),
-- OK
(2,  'Oven 8 Quarterly Full PM Service',                  'QUARTERLY',   '2026-05-15', '2026-08-15', 4.0,  'ENGINEER',    'Full thermocouple, heater-element, door-seal, control board PM'),
(8,  'FPI Unit Annual Full Service',                      'ANNUAL',      '2025-12-01', '2026-12-01', 6.0,  'ENGINEER',    'Drain & clean all tanks, replace UV lamps, calibrate UV meter'),
(6,  'Anodizing Tank #1 Annual Deep Clean & Inspection',  'ANNUAL',      '2025-09-01', '2026-09-01', 8.0,  'ENGINEER',    'Full drain, internal inspection, anode renewal, leak test'),
(11, 'Air Compressor #2 Monthly Service',                 'MONTHLY',     '2026-06-10', '2026-07-10', 1.5,  'SUPERVISOR',  'Oil level, filter, belt tension, safety valve test'),
(15, 'pH Meter Annual Calibration & Probe Replacement',   'ANNUAL',      '2025-11-01', '2026-11-01', 0.5,  'SUPERVISOR',  'Two-point calibration pH 4 / pH 7; replace probe if drift > 0.1');

-- ─────────────────────────────────────────────
-- Seed — PPM Checklist Tasks (for schedule_id 1 — Muffle Furnace Monthly)
-- ─────────────────────────────────────────────

INSERT INTO PPMChecklist (schedule_id, task_order, task_description, requires_measurement, measurement_unit, pass_criteria, is_mandatory) VALUES
(1, 1, 'Verify thermocouple connections — check for corrosion or loose terminals', 0, NULL, 'No corrosion, all terminals tight', 1),
(1, 2, 'Record set-point temperature and actual temperature at 3 locations',       1, '°C', 'All readings within ±5°C of set-point', 1),
(1, 3, 'Inspect door seal gasket for cracks or heat damage',                       0, NULL, 'No visible cracks; seal makes full contact', 1),
(1, 4, 'Check heating element continuity',                                         1, 'Ohm', 'Per manufacturer spec (typically 8–12 Ω)', 1),
(1, 5, 'Clean interior — remove scale and oxidation residue',                      0, NULL, 'Interior clean; no spills or debris', 0),
(1, 6, 'Record ambient temperature and humidity at time of inspection',            1, '°C / %RH', 'Documented for audit trail', 0);

-- ─────────────────────────────────────────────
-- Seed — PPM Log (recent completed PMs — 6)
-- ─────────────────────────────────────────────

INSERT INTO PPMLog (schedule_id, asset_id, performed_date, performed_by, duration_hours, status, findings, corrective_action) VALUES
(5,  1,  '2026-06-17', 'Ahmad Bin Rashid',        0.5,  'COMPLETED', 'All 3 TC positions within ±3°C of set-point. No anomalies.', NULL),
(8,  2,  '2026-05-15', 'James Tan Wei Liang',     3.5,  'COMPLETED', 'Heater elements OK. Door seal slightly worn — flagged for next service.', 'Monitor door seal; replace at next quarterly PM if worsened.'),
(11, 11, '2026-06-10', 'Ahmad Bin Rashid',        1.5,  'COMPLETED', 'All checks passed. Oil level good. Belt tension nominal.', NULL),
(9,  8,  '2026-03-01', 'Hendrich Lim Jun Wei',    5.0,  'COMPLETED', 'Full service complete. UV lamps replaced (hrs: 2840). FPI unit fully operational.', 'UV lamps replaced as scheduled.'),
(3,  10, '2026-05-05', 'Ahmad Bin Rashid',        1.5,  'COMPLETED', 'All checks passed. Oil filter replaced. Safety valve tested — OK.', NULL),
(4,  12, '2026-03-10', 'James Tan Wei Liang',     2.8,  'COMPLETED', 'Quarterly service complete. Capacitor bank shows slight capacitance drop — 8% below nominal.', 'Capacitor bank flagged for replacement at next annual service.');
