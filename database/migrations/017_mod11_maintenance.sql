-- MOD-11: Maintenance Management
-- AS9100D §7.1.3 | NADCAP Equipment Control
-- Migration 017

CREATE TABLE MaintenanceAsset (
    asset_id        INT IDENTITY(1,1) PRIMARY KEY,
    asset_code      NVARCHAR(20)  NOT NULL UNIQUE,
    name            NVARCHAR(200) NOT NULL,
    category        NVARCHAR(30)  NOT NULL CHECK (category IN ('PRODUCTION','FACILITY','LAB','SAFETY','RECTIFIER')),
    make            NVARCHAR(100),
    model           NVARCHAR(100),
    serial_no       NVARCHAR(100),
    location        NVARCHAR(200),
    equipment_id    INT REFERENCES Equipment(equipment_id),  -- nullable FK to MOD-05
    status          NVARCHAR(30)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','UNDER_MAINTENANCE','DECOMMISSIONED')),
    notes           NVARCHAR(MAX),
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1
);

CREATE TABLE PmSchedule (
    schedule_id     INT IDENTITY(1,1) PRIMARY KEY,
    asset_id        INT           NOT NULL REFERENCES MaintenanceAsset(asset_id),
    frequency_type  NVARCHAR(20)  NOT NULL CHECK (frequency_type IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL')),
    frequency_value INT           NOT NULL DEFAULT 1,
    last_done_date  DATE,
    next_due_date   DATE          NOT NULL,
    nadcap_flag     BIT           NOT NULL DEFAULT 0,
    procedure_ref   NVARCHAR(100),
    description     NVARCHAR(500),
    assigned_to     INT REFERENCES Users(user_id),
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1
);

CREATE TABLE MaintenanceRecord (
    record_id               INT IDENTITY(1,1) PRIMARY KEY,
    asset_id                INT           NOT NULL REFERENCES MaintenanceAsset(asset_id),
    schedule_id             INT REFERENCES PmSchedule(schedule_id),
    type                    NVARCHAR(20)  NOT NULL CHECK (type IN ('PM','CM','INSPECTION')),
    performed_by            INT           NOT NULL REFERENCES Users(user_id),
    start_datetime          DATETIME2     NOT NULL,
    end_datetime            DATETIME2,
    downtime_mins           INT,
    outcome                 NVARCHAR(20)  NOT NULL CHECK (outcome IN ('PASS','FAIL','DEFERRED','PENDING')),
    root_cause              NVARCHAR(MAX),
    findings                NVARCHAR(MAX),
    recalibration_required  BIT           NOT NULL DEFAULT 0,
    ncr_raised              BIT           NOT NULL DEFAULT 0,
    ncr_ref                 NVARCHAR(30),
    notes                   NVARCHAR(MAX),
    created_by              INT REFERENCES Users(user_id),
    created_at              DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active               BIT           NOT NULL DEFAULT 1
);

CREATE TABLE WorkPermit (
    permit_id           INT IDENTITY(1,1) PRIMARY KEY,
    permit_number       NVARCHAR(20)  NOT NULL UNIQUE,
    asset_id            INT           NOT NULL REFERENCES MaintenanceAsset(asset_id),
    hazard_type         NVARCHAR(30)  NOT NULL CHECK (hazard_type IN ('ELECTRICAL','MECHANICAL','CHEMICAL','HEIGHT','CONFINED_SPACE','HOT_WORK')),
    description         NVARCHAR(500) NOT NULL,
    safety_precautions  NVARCHAR(MAX),
    ppe_required        NVARCHAR(500),
    authorised_by       INT REFERENCES Users(user_id),
    authorised_at       DATETIME2,
    status              NVARCHAR(20)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACTIVE','CLOSED','CANCELLED')),
    created_by          INT REFERENCES Users(user_id),
    created_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active           BIT           NOT NULL DEFAULT 1
);

CREATE TABLE Mod11Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod11Sequence VALUES (0, 0);
