-- =============================================================================
-- MOD-17: MPT (Magnetic Particle Testing) Process Control
-- NADCAP AC7114 | NAS410 | AS9100D §8.5
-- Migration: 015_mod17_mpt_process.sql
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- MPT Job (analogous to FpiJob in MOD-03)
CREATE TABLE dbo.MptJob (
    mpt_job_id       INT IDENTITY(1,1) PRIMARY KEY,
    job_number       NVARCHAR(20)  NOT NULL UNIQUE,    -- MPT-YYYY-NNNN
    work_order_id    INT           NULL,               -- link to MOD-13 WorkOrder
    customer_name    NVARCHAR(200) NOT NULL,
    part_number      NVARCHAR(100) NOT NULL,
    part_description NVARCHAR(200) NULL,
    part_serial_no   NVARCHAR(100) NULL,
    quantity         INT           NOT NULL DEFAULT 1,
    material_spec    NVARCHAR(100) NULL,               -- e.g. AMS2641
    technique        NVARCHAR(20)  NOT NULL DEFAULT 'WET_FLUORESCENT',
                                                       -- WET_FLUORESCENT | WET_VISIBLE | DRY
    magnetisation_method NVARCHAR(30) NULL,            -- CIRCULAR | LONGITUDINAL | MULTIDIRECTIONAL
    demagnetisation_required BIT  NOT NULL DEFAULT 1,
    priority         NVARCHAR(10)  NOT NULL DEFAULT 'NORMAL',
    planned_date     DATE          NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'RECEIVED',
                                                       -- RECEIVED | IN_PROGRESS | PENDING_REVIEW | ACCEPTED | REJECTED | ON_HOLD
    disposition      NVARCHAR(20)  NULL,               -- ACCEPT | REJECT | CONDITIONAL
    special_instructions NVARCHAR(MAX) NULL,
    customer_po      NVARCHAR(100) NULL,
    assigned_inspector_id INT      NULL REFERENCES dbo.Personnel(personnel_id),
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active        BIT           NOT NULL DEFAULT 1
);

-- MPT Inspection Steps (6-step AC7114 process for MPT)
-- Step 1: Pre-Clean | Step 2: Equipment Setup | Step 3: Magnetisation
-- Step 4: Particle Application | Step 5: Examination | Step 6: Demagnetisation + Post-Clean
CREATE TABLE dbo.MptInspectionStep (
    step_id          INT IDENTITY(1,1) PRIMARY KEY,
    mpt_job_id       INT           NOT NULL REFERENCES dbo.MptJob(mpt_job_id),
    step_number      INT           NOT NULL,           -- 1–6
    step_name        NVARCHAR(100) NOT NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                                                       -- PENDING | IN_PROGRESS | COMPLETE | SKIPPED
    -- Step-specific data fields
    -- Step 1: Pre-Clean
    cleaning_method  NVARCHAR(100) NULL,
    solvent_used     NVARCHAR(100) NULL,
    -- Step 2: Equipment Setup
    equipment_id     INT           NULL,               -- FK to Equipment (MOD-05)
    equipment_checked BIT          NULL,
    uv_lamp_intensity_fc DECIMAL(8,2) NULL,            -- UV intensity in foot-candles
    uv_lamp_ok       BIT          NULL,
    ambient_light_fc DECIMAL(8,2) NULL,
    ambient_light_ok BIT          NULL,
    -- Step 3: Magnetisation
    current_type     NVARCHAR(10)  NULL,               -- AC | HWDC | FWDC
    current_amps     DECIMAL(8,2)  NULL,
    field_strength_gauss DECIMAL(8,2) NULL,
    field_strength_ok BIT          NULL,
    -- Step 4: Particle Application
    particle_type    NVARCHAR(100) NULL,               -- brand/grade
    particle_conc    DECIMAL(8,2)  NULL,               -- mg/mL (bath concentration)
    particle_conc_ok BIT          NULL,
    -- Step 5: Examination
    indications_found BIT          NULL,               -- any indications?
    indication_count INT           NULL,
    indication_notes NVARCHAR(MAX) NULL,
    -- Step 6: Demagnetisation
    residual_field_gauss DECIMAL(8,2) NULL,
    demagnetised_ok  BIT          NULL,
    post_clean_done  BIT          NULL,
    -- Common
    performed_by_id  INT           NULL REFERENCES dbo.Personnel(personnel_id),
    performed_at     DATETIME2     NULL,
    notes            NVARCHAR(MAX) NULL,
    UNIQUE (mpt_job_id, step_number)
);

-- MPT Result (final disposition + cert data)
CREATE TABLE dbo.MptResult (
    result_id        INT IDENTITY(1,1) PRIMARY KEY,
    mpt_job_id       INT           NOT NULL UNIQUE REFERENCES dbo.MptJob(mpt_job_id),
    overall_result   NVARCHAR(10)  NOT NULL,           -- ACCEPT | REJECT | CONDITIONAL
    acceptance_criteria NVARCHAR(200) NULL,            -- spec referenced
    number_of_parts_accepted INT   NULL,
    number_of_parts_rejected INT   NULL,
    findings_summary NVARCHAR(MAX) NULL,
    reviewed_by_id   INT           NULL REFERENCES dbo.Personnel(personnel_id),
    reviewed_at      DATETIME2     NULL,
    cert_number      NVARCHAR(50)  NULL,
    cert_issued_at   DATETIME2     NULL,
    created_by       INT           NOT NULL,
    created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- Sequence
CREATE TABLE dbo.Mod17Sequence (
    seq_key   NVARCHAR(30) PRIMARY KEY,
    last_num  INT NOT NULL DEFAULT 0,
    last_year INT NOT NULL DEFAULT 0
);

INSERT INTO dbo.Mod17Sequence (seq_key, last_num, last_year) VALUES
    ('MPT_JOB', 0, 2026);
GO
