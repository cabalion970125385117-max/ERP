-- ============================================================
-- Migration 037 — MOD-34 Chemical & Hazmat Control
--                 + Alert Escalation Engine (x-cut)
-- Compliance: AC7108/AC7110, WSH Act (Singapore), REACH/RoHS
-- ============================================================

-- ── SDS Register ─────────────────────────────────────────────
CREATE TABLE ChemicalSDS (
    sds_id            INT IDENTITY(1,1) PRIMARY KEY,
    chemical_name     NVARCHAR(150)  NOT NULL,
    common_name       NVARCHAR(150),
    un_number         NVARCHAR(10),
    cas_number        NVARCHAR(20),
    hazard_class      NVARCHAR(20)   NOT NULL
        CONSTRAINT chk_sds_hazard CHECK (hazard_class IN (
            'FLAMMABLE','CORROSIVE','TOXIC','OXIDIZER',
            'CONTROLLED','ENVIRONMENTAL','INERT')),
    supplier          NVARCHAR(150),
    sds_version       NVARCHAR(20),
    issue_date        DATE,
    expiry_date       DATE,
    review_interval_months INT        DEFAULT 12,
    is_controlled     BIT            DEFAULT 0,   -- cyanide / cadmium
    special_handling  NVARCHAR(500),
    ppe_required      NVARCHAR(300),
    storage_conditions NVARCHAR(300),
    disposal_method   NVARCHAR(300),
    status            NVARCHAR(20)   DEFAULT 'ACTIVE'
        CONSTRAINT chk_sds_status CHECK (status IN (
            'ACTIVE','SUPERSEDED','WITHDRAWN')),
    created_by        INT,
    created_at        DATETIME2      DEFAULT GETDATE(),
    updated_at        DATETIME2      DEFAULT GETDATE()
);

-- ── Chemical Inventory ────────────────────────────────────────
CREATE TABLE ChemicalInventory (
    inventory_id    INT IDENTITY(1,1) PRIMARY KEY,
    sds_id          INT            NOT NULL REFERENCES ChemicalSDS(sds_id),
    location        NVARCHAR(100)  NOT NULL,   -- bay / storage room
    quantity        DECIMAL(10,3)  DEFAULT 0,
    quantity_unit   NVARCHAR(10)   DEFAULT 'kg'
        CONSTRAINT chk_inv_unit CHECK (quantity_unit IN ('kg','L','g','mL')),
    batch_number    NVARCHAR(50),
    received_date   DATE,
    expiry_date     DATE,
    min_stock_kg    DECIMAL(10,3)  DEFAULT 0,
    notes           NVARCHAR(500),
    is_active       BIT            DEFAULT 1,
    updated_at      DATETIME2      DEFAULT GETDATE()
);

-- ── Bath Make-up Formula ──────────────────────────────────────
CREATE TABLE BathMakeupFormula (
    formula_id      INT IDENTITY(1,1) PRIMARY KEY,
    bath_type_code  NVARCHAR(50)   NOT NULL,   -- matches ChemBath.bath_type_code
    process_area    NVARCHAR(100),
    chemical_name   NVARCHAR(150)  NOT NULL,
    sds_id          INT            REFERENCES ChemicalSDS(sds_id),
    qty_per_1000L   DECIMAL(10,3)  NOT NULL,   -- kg per 1000 L bath volume
    unit            NVARCHAR(10)   DEFAULT 'kg'
        CONSTRAINT chk_fml_unit CHECK (unit IN ('kg','L','g','mL','%')),
    concentration_target NVARCHAR(50),          -- e.g. '165–185 g/L'
    add_sequence    INT            DEFAULT 1,   -- order of addition
    safety_note     NVARCHAR(300),
    is_active       BIT            DEFAULT 1
);

-- ── Bath Replenishment Queue ──────────────────────────────────
CREATE TABLE BathReplenishment (
    replenishment_id  INT IDENTITY(1,1) PRIMARY KEY,
    replenishment_ref AS ('REP-' + FORMAT(replenishment_id,'D4')) PERSISTED,
    bath_id           INT            REFERENCES ChemBath(bath_id),
    sds_id            INT            REFERENCES ChemicalSDS(sds_id),
    trigger_type      NVARCHAR(20)   DEFAULT 'MANUAL'
        CONSTRAINT chk_rep_trigger CHECK (trigger_type IN (
            'MANUAL','OUT_OF_SPEC','SCHEDULED','LOW_STOCK')),
    param_name        NVARCHAR(100),
    current_value     DECIMAL(10,3),
    target_value      DECIMAL(10,3),
    quantity_to_add   DECIMAL(10,3),
    add_unit          NVARCHAR(10)   DEFAULT 'kg'
        CONSTRAINT chk_rep_unit CHECK (add_unit IN ('kg','L','g','mL')),
    status            NVARCHAR(20)   DEFAULT 'PENDING'
        CONSTRAINT chk_rep_status CHECK (status IN (
            'PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
    initiated_by      INT,
    initiated_at      DATETIME2      DEFAULT GETDATE(),
    completed_by      INT,
    completed_at      DATETIME2,
    notes             NVARCHAR(500)
);

-- ── Escalation Rules (Alert Escalation Engine) ────────────────
CREATE TABLE EscalationRule (
    rule_id           INT IDENTITY(1,1) PRIMARY KEY,
    rule_name         NVARCHAR(150)  NOT NULL,
    module_id         NVARCHAR(10)   NOT NULL,  -- 'mod03', 'mod06', etc.
    alert_field       NVARCHAR(100)  NOT NULL,  -- field name in alerts/summary
    threshold_value   DECIMAL(10,2)  DEFAULT 0,
    operator          NVARCHAR(5)    DEFAULT 'GT'
        CONSTRAINT chk_esc_op CHECK (operator IN ('GT','LT','GTE','LTE','EQ')),
    level             NVARCHAR(10)   DEFAULT 'WARNING'
        CONSTRAINT chk_esc_level CHECK (level IN ('WARNING','ALERT','CRITICAL')),
    notify_roles      NVARCHAR(200),             -- comma-separated role list
    escalation_delay_hours INT        DEFAULT 0,
    message_template  NVARCHAR(500),
    is_active         BIT            DEFAULT 1,
    created_by        INT,
    created_at        DATETIME2      DEFAULT GETDATE()
);

-- ── Escalation Log ────────────────────────────────────────────
CREATE TABLE EscalationLog (
    log_id            INT IDENTITY(1,1) PRIMARY KEY,
    rule_id           INT            NOT NULL REFERENCES EscalationRule(rule_id),
    triggered_at      DATETIME2      DEFAULT GETDATE(),
    alert_value       DECIMAL(10,2),
    level             NVARCHAR(10),
    notified_roles    NVARCHAR(200),
    acknowledged_by   INT,
    acknowledged_at   DATETIME2,
    notes             NVARCHAR(300)
);

-- ── Auto-number sequence ──────────────────────────────────────
CREATE TABLE Mod34Sequence (
    seq_year INT NOT NULL,
    seq_no   INT NOT NULL DEFAULT 0,
    PRIMARY KEY (seq_year)
);
INSERT INTO Mod34Sequence (seq_year) VALUES (YEAR(GETDATE()));

-- ── Views ─────────────────────────────────────────────────────
CREATE VIEW vw_SDSExpiry AS
SELECT
    s.sds_id, s.chemical_name, s.common_name, s.hazard_class,
    s.is_controlled, s.supplier, s.sds_version,
    s.expiry_date,
    DATEDIFF(DAY, GETDATE(), s.expiry_date) AS days_to_expiry,
    CASE
        WHEN s.expiry_date < GETDATE()              THEN 'OVERDUE'
        WHEN s.expiry_date < DATEADD(DAY,30,GETDATE()) THEN 'DUE_SOON'
        ELSE 'OK'
    END AS expiry_rag,
    s.status
FROM ChemicalSDS s
WHERE s.status = 'ACTIVE';

CREATE VIEW vw_ReplenishmentQueue AS
SELECT
    r.replenishment_id, r.replenishment_ref,
    b.bath_name, b.bay_location,
    r.trigger_type, r.param_name,
    r.current_value, r.target_value, r.quantity_to_add, r.add_unit,
    r.status, r.initiated_at,
    s.chemical_name, s.is_controlled,
    DATEDIFF(HOUR, r.initiated_at, GETDATE()) AS hours_open
FROM BathReplenishment r
LEFT JOIN ChemBath      b ON r.bath_id = b.bath_id
LEFT JOIN ChemicalSDS   s ON r.sds_id  = s.sds_id;

-- ── Seed: SDS Register (12 chemicals) ────────────────────────
INSERT INTO ChemicalSDS
    (chemical_name, common_name, un_number, cas_number, hazard_class,
     supplier, sds_version, issue_date, expiry_date, review_interval_months,
     is_controlled, special_handling, ppe_required, storage_conditions, disposal_method, status)
VALUES
-- 1 Sulfuric Acid
('Sulfuric Acid', 'Battery Acid / Anodizing Electrolyte', 'UN1830', '7664-93-9',
 'CORROSIVE', 'Univar Solutions', 'Rev 4', '2025-01-15', '2027-01-15', 24, 0,
 'Always add acid to water, never water to acid. Provide secondary containment.',
 'Full face shield, acid-resistant gloves, apron, chemical safety boots',
 'Locked corrosives cabinet, separate from bases and oxidizers',
 'Neutralise with sodium bicarbonate solution, dispose via licensed contractor', 'ACTIVE'),
-- 2 Nitric Acid
('Nitric Acid (65%)', 'Passivation / Bright Dip', 'UN2031', '7697-37-2',
 'CORROSIVE', 'Thermo Fisher Scientific', 'Rev 3', '2025-03-01', '2027-03-01', 24, 0,
 'Strong oxidiser — keep away from organics and flammables. Fume hood use mandatory.',
 'Full face shield, chemical-resistant gloves, apron, lab coat',
 'Ventilated corrosives cabinet, incompatible with organics',
 'Dilute and neutralise; dispose via licensed chemical waste contractor', 'ACTIVE'),
-- 3 Chromic Acid
('Chromic Acid (Chromium Trioxide)', 'Hard Chrome Bath', 'UN1463', '1333-82-0',
 'TOXIC', 'Atotech', 'Rev 6', '2024-11-01', '2026-11-01', 24, 0,
 'Carcinogen (Cr VI). Mandatory local exhaust ventilation. Restricted — requires permit.',
 'Full face shield, chemical-resistant gloves, apron, supplied-air respirator during mixing',
 'Locked flammable/oxidiser store. Dedicated secondary containment tray.',
 'Cr VI reduction to Cr III, then licensed disposal', 'ACTIVE'),
-- 4 Sodium Hydroxide
('Sodium Hydroxide (Caustic Soda)', 'Etch / Degreaser', 'UN1824', '1310-73-2',
 'CORROSIVE', 'Brenntag', 'Rev 3', '2025-06-01', '2027-06-01', 24, 0,
 'Highly exothermic dissolution. Add pellets to water slowly.',
 'Safety goggles, chemical-resistant gloves, apron',
 'Corrosives cabinet, store away from acids',
 'Neutralise with dilute acid, dispose as alkaline effluent via trade effluent consent', 'ACTIVE'),
-- 5 Cadmium Cyanide Plating Solution (CONTROLLED)
('Cadmium Cyanide Plating Solution', 'Cad Plating Bath (AMS 2400)', 'UN1891', '592-01-8',
 'CONTROLLED', 'MacDermid Enthone', 'Rev 8', '2025-02-01', '2026-02-01', 12, 1,
 'CONTROLLED — Cyanide + Cadmium. Two-person rule for make-up. Acid MUST NOT contact — HCN evolved. Dedicated ventilation mandatory.',
 'Full face shield, cyanide-resistant gloves, apron, standby cyanide antidote kit',
 'Locked secure cabinet. Class 6.1 segregation. Weekly inventory check.',
 'Licensed cyanide-destruction contractor only. Pre-approval from EHS Manager required.', 'ACTIVE'),
-- 6 Sodium Cyanide (CONTROLLED)
('Sodium Cyanide (Solid)', 'Gold/Silver Cyanide Bath Make-up', 'UN1689', '143-33-9',
 'CONTROLLED', 'Cyanco', 'Rev 7', '2025-04-01', '2026-04-01', 12, 1,
 'CONTROLLED — Cyanide. Two-person rule for handling. Acid ABSOLUTELY PROHIBITED in same area. Antidote kit mandatory on-site.',
 'Full face shield, cyanide-resistant gloves, chemical-resistant suit, self-contained breathing apparatus during mixing',
 'Locked secure vault. Separated from all acids. Controlled access log maintained.',
 'Licensed cyanide-destruction only. Regulatory notification required before disposal.', 'ACTIVE'),
-- 7 Phosphoric Acid
('Phosphoric Acid (85%)', 'Phosphating Bath / Anodize Additive', 'UN1805', '7664-38-2',
 'CORROSIVE', 'ICL Group', 'Rev 2', '2025-05-01', '2027-05-01', 24, 0,
 'Less aggressive than H2SO4 but still corrosive. Good ventilation required.',
 'Safety goggles, chemical-resistant gloves, apron',
 'Corrosives cabinet, cool dry location',
 'Dilute and neutralise, comply with trade effluent consent', 'ACTIVE'),
-- 8 Nickel Sulphamate (EN Bath Base)
('Nickel Sulphamate Solution', 'Electroless Nickel Bath', 'UN3077', '13770-89-3',
 'ENVIRONMENTAL', 'Atotech', 'Rev 5', '2024-12-01', '2026-12-01', 24, 0,
 'Nickel compounds are sensitisers and potential carcinogens. Avoid skin contact.',
 'Chemical-resistant gloves, safety goggles, apron',
 'Temperature-controlled store (5–30°C). Keep container closed.',
 'Nickel recovery / licensed heavy-metal waste contractor', 'ACTIVE'),
-- 9 Silver Nitrate
('Silver Nitrate Solution (30%)', 'Silver Plating Bath', 'UN1493', '7761-88-8',
 'OXIDIZER', 'Metalor Technologies', 'Rev 3', '2025-01-01', '2027-01-01', 24, 0,
 'Strong oxidiser. Stains skin and clothing black irreversibly. Keep away from organics.',
 'Safety goggles, chemical-resistant gloves, apron',
 'Amber/opaque containers, away from light and organics',
 'Recovery of silver by licensed contractor. Do not pour to drain.', 'ACTIVE'),
-- 10 Ammonium Bifluoride
('Ammonium Bifluoride', 'Titanium Etch / Surface Prep', 'UN2854', '1341-49-7',
 'TOXIC', 'Solvay', 'Rev 4', '2025-03-15', '2027-03-15', 24, 0,
 'Fluoride burns are delayed and deeply penetrating. Calcium gluconate gel MUST be available.',
 'Full face shield, heavy-duty chemical-resistant gloves, apron',
 'Locked fluoride store, separate from strong acids',
 'Fluoride precipitation with calcium hydroxide, licensed disposal', 'ACTIVE'),
-- 11 Acetone
('Acetone', 'Degreaser / Parts Cleaning', 'UN1090', '67-64-1',
 'FLAMMABLE', 'Shell Chemicals', 'Rev 2', '2025-07-01', '2027-07-01', 24, 0,
 'Highly flammable. No ignition sources in use area. Ground containers when transferring.',
 'Safety goggles, nitrile gloves',
 'Flammable materials cabinet, away from heat and ignition sources',
 'Licensed solvent waste contractor', 'ACTIVE'),
-- 12 Hydrochloric Acid
('Hydrochloric Acid (30%)', 'Pickling / Acid Dip Pre-treatment', 'UN1789', '7647-01-0',
 'CORROSIVE', 'Brenntag', 'Rev 3', '2025-08-01', '2027-08-01', 24, 0,
 'Fuming — mandatory local exhaust ventilation. Reacts with cyanides producing HCN.',
 'Full face shield, chemical-resistant gloves, apron',
 'Ventilated corrosives cabinet. Physically separated from any cyanide compounds.',
 'Neutralise with sodium bicarbonate, dispose via trade effluent consent', 'ACTIVE');

-- ── Seed: Chemical Inventory ──────────────────────────────────
INSERT INTO ChemicalInventory
    (sds_id, location, quantity, quantity_unit, received_date, expiry_date, min_stock_kg, notes)
VALUES
(1,  'BAY2 Chemical Store',  45.0,  'kg',  '2026-05-10', '2028-05-10', 20.0, 'Carboy, 98% concentrated'),
(2,  'BAY3 Chemical Store',  12.0,  'L',   '2026-04-15', '2028-04-15', 5.0,  '65% solution'),
(3,  'BAY4 Chrome Area',     8.5,   'kg',  '2026-03-01', '2027-03-01', 3.0,  'Flake form — keep dry'),
(4,  'BAY2 Chemical Store',  30.0,  'kg',  '2026-05-20', '2028-05-20', 15.0, 'Pellet form'),
(5,  'BAY4 Secure Cabinet',  2.0,   'L',   '2026-02-01', '2026-12-01', 1.0,  'Ready-made solution — weekly level check'),
(6,  'Secure Vault',         0.5,   'kg',  '2026-04-01', '2026-10-01', 0.25, 'Solid — counted daily'),
(7,  'BAY3 Chemical Store',  20.0,  'kg',  '2026-05-01', '2028-05-01', 8.0,  '85% food grade'),
(8,  'BAY2 EN Area',         50.0,  'L',   '2026-01-15', '2027-01-15', 20.0, 'Bulk drum'),
(9,  'BAY4 Precious Metal Store', 5.0, 'L', '2026-03-10', '2028-03-10', 2.0, '30% solution'),
(10, 'BAY5 Chemical Store',  3.0,   'kg',  '2026-02-20', '2028-02-20', 1.0,  'Anhydrous flake'),
(11, 'Flammables Cabinet',   20.0,  'L',   '2026-06-01', '2027-06-01', 10.0, 'Standard drum'),
(12, 'BAY3 Chemical Store',  18.0,  'L',   '2026-05-15', '2028-05-15', 8.0,  '30% solution');

-- ── Seed: Bath Make-up Formulas ───────────────────────────────
INSERT INTO BathMakeupFormula
    (bath_type_code, process_area, chemical_name, sds_id, qty_per_1000L, unit, concentration_target, add_sequence, safety_note)
VALUES
-- Hard Anodize (Sulfuric Acid)
('HARD_ANODIZE', 'BAY2', 'Sulfuric Acid (98%)',        1, 178.0, 'kg', '165–185 g/L', 1, 'Add acid to DI water slowly with cooling. Max 15°C.'),
-- EN Bath
('EN',           'BAY2', 'Nickel Sulphamate Solution',  8,  200.0, 'L', '5–6 g/L Ni', 1, 'Heat bath to 85°C before adding reducer.'),
-- Cad Plating
('CAD_PLATE',    'BAY4', 'Cadmium Cyanide Plating Solution', 5, 120.0, 'L', 'Per AMS 2400 §4.2', 1, 'TWO-PERSON RULE. No acids in bay during make-up.'),
('CAD_PLATE',    'BAY4', 'Sodium Hydroxide',            4,  20.0, 'kg', '75–90 g/L NaOH', 2, 'Add after cad solution, never before.'),
-- Silver Plate
('SILVER_PLATE', 'BAY4', 'Silver Nitrate Solution (30%)', 9, 80.0,  'L', '30–40 g/L Ag', 1, 'Keep away from organics. Use amber container.'),
-- Phosphating
('PHOSPHATE',    'BAY3', 'Phosphoric Acid (85%)',        7, 35.0,  'kg', '30–40 g/L', 1, 'Add to water, stir well before heating.'),
-- Passivation
('PASSIVATION',  'BAY5', 'Nitric Acid (65%)',            2, 22.0,  'L',  '20–25% v/v', 1, 'Always add acid to water. Do not exceed 35°C.');

-- ── Seed: Replenishment Queue (3 items) ───────────────────────
-- Note: bath_id values reference ChemBath seed rows (assumed IDs 1,3,5)
INSERT INTO BathReplenishment
    (bath_id, sds_id, trigger_type, param_name, current_value, target_value, quantity_to_add, add_unit, status, initiated_by)
VALUES
(1,  1, 'OUT_OF_SPEC',  'H2SO4 Concentration',    158.0, 175.0, 3.2,  'kg',  'PENDING',     1),
(3,  8, 'SCHEDULED',    'Ni Concentration',         4.2,   5.5,  18.0, 'L',   'IN_PROGRESS', 1),
(5,  9, 'LOW_STOCK',    'Silver Ion Concentration', 28.0,  35.0,  2.5, 'L',   'PENDING',     1);

-- ── Seed: Escalation Rules ────────────────────────────────────
INSERT INTO EscalationRule
    (rule_name, module_id, alert_field, threshold_value, operator, level, notify_roles, escalation_delay_hours, message_template, is_active)
VALUES
('Bath Out-of-Spec — ALERT',  'mod06', 'out_of_spec',       0, 'GT', 'ALERT',    'SUPERVISOR,ENGINEER',    0,  'MOD-06: {value} bath(s) out of specification. Immediate action required.', 1),
('Bath Out-of-Spec — CRITICAL','mod06','out_of_spec',        3, 'GT', 'CRITICAL', 'QA_MANAGER,ADMIN',       1,  'MOD-06: CRITICAL — {value} baths OOS >1h. Production hold recommended.', 1),
('Overdue Pyrometry TUS/SAT', 'mod30', 'overdue_pyrometry',  0, 'GT', 'ALERT',    'ENGINEER,QA_MANAGER',    0,  'MOD-30: {value} oven(s) have overdue TUS or SAT. Schedule immediately.', 1),
('TC Expiring Within 30 Days','mod30', 'tc_expiring',        0, 'GT', 'WARNING',  'SUPERVISOR,ENGINEER',    0,  'MOD-30: {value} thermocouple(s) expiring within 30 days.', 1),
('Open NCRs — ALERT',         'mod07', 'open_ncr',          10, 'GT', 'ALERT',    'QA_MANAGER',             24, 'MOD-07: {value} open NCRs. Review backlog and prioritise closure.', 1),
('Overdue CAPA — CRITICAL',   'mod07', 'overdue_capa',       0, 'GT', 'CRITICAL', 'QA_MANAGER,ADMIN',       0,  'MOD-07: {value} CAPAs overdue. AS9100D §10.2 compliance at risk.', 1),
('Operator Competency Expiring','mod31','expiring_90d',       0, 'GT', 'WARNING',  'SUPERVISOR,ENGINEER',    0,  'MOD-31: {value} operator competency approval(s) expiring within 90 days.', 1),
('SDS Expiring — WARNING',    'mod34', 'sds_expiring_30d',   0, 'GT', 'WARNING',  'ENGINEER,QA_MANAGER',    0,  'MOD-34: {value} Safety Data Sheet(s) expiring within 30 days. Review required.', 1),
('Equipment Calibration OOT', 'mod05', 'cal_overdue',        0, 'GT', 'ALERT',    'SUPERVISOR,QA_MANAGER',  0,  'MOD-05: {value} equipment item(s) calibration overdue. Quarantine and schedule.', 1),
('ECN Overdue',               'mod33', 'ecn_overdue',        0, 'GT', 'ALERT',    'QA_MANAGER',             0,  'MOD-33: {value} ECN(s) overdue for action. Review change control register.', 1);
