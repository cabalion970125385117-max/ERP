-- MOD-22: Leave & Attendance Management
-- SoR §12
-- Migration 022

CREATE TABLE LeaveType (
    type_id             INT IDENTITY(1,1) PRIMARY KEY,
    name                NVARCHAR(100) NOT NULL UNIQUE,
    days_per_year       DECIMAL(5,1)  NOT NULL DEFAULT 14,
    carry_forward_max   DECIMAL(5,1)  NOT NULL DEFAULT 0,
    is_active           BIT           NOT NULL DEFAULT 1
);

INSERT INTO LeaveType (name, days_per_year, carry_forward_max) VALUES
    ('Annual Leave', 14, 7),
    ('Medical Leave', 14, 0),
    ('Hospitalisation Leave', 60, 0),
    ('Compassionate Leave', 3, 0),
    ('Unpaid Leave', 0, 0);

CREATE TABLE LeaveRequest (
    request_id          INT IDENTITY(1,1) PRIMARY KEY,
    staff_id            INT           NOT NULL REFERENCES StaffRecord(staff_id),
    leave_type_id       INT           NOT NULL REFERENCES LeaveType(type_id),
    start_date          DATE          NOT NULL,
    end_date            DATE          NOT NULL,
    days_taken          DECIMAL(5,1)  NOT NULL,
    reason              NVARCHAR(MAX),
    status              NVARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
    approved_by         INT REFERENCES Users(user_id),
    approved_at         DATETIME2,
    notes               NVARCHAR(MAX),
    created_by          INT REFERENCES Users(user_id),
    created_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active           BIT           NOT NULL DEFAULT 1
);

CREATE TABLE AttendanceRecord (
    record_id       INT IDENTITY(1,1) PRIMARY KEY,
    staff_id        INT          NOT NULL REFERENCES StaffRecord(staff_id),
    date            DATE         NOT NULL,
    status          NVARCHAR(20) NOT NULL CHECK (status IN ('PRESENT','ON_LEAVE','ABSENT','PUBLIC_HOLIDAY','HALF_DAY')),
    notes           NVARCHAR(500),
    recorded_by     INT REFERENCES Users(user_id),
    is_active       BIT          NOT NULL DEFAULT 1,
    UNIQUE (staff_id, date)
);

CREATE TABLE Mod22Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod22Sequence VALUES (0, 0);
