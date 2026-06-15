-- MOD-23: Payroll Processing
-- SoR §12 | Driven by MOD-22 attendance
-- Migration 023

CREATE TABLE PayrollRun (
    run_id              INT IDENTITY(1,1) PRIMARY KEY,
    pay_period_start    DATE          NOT NULL,
    pay_period_end      DATE          NOT NULL,
    run_by              INT           NOT NULL REFERENCES Users(user_id),
    status              NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','DISBURSED')),
    total_gross         DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_net           DECIMAL(14,2) NOT NULL DEFAULT 0,
    notes               NVARCHAR(MAX),
    approved_by         INT REFERENCES Users(user_id),
    approved_at         DATETIME2,
    disbursed_at        DATETIME2,
    created_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active           BIT           NOT NULL DEFAULT 1
);

CREATE TABLE PayrollLine (
    line_id         INT IDENTITY(1,1) PRIMARY KEY,
    run_id          INT           NOT NULL REFERENCES PayrollRun(run_id),
    staff_id        INT           NOT NULL REFERENCES StaffRecord(staff_id),
    basic_pay       DECIMAL(10,2) NOT NULL DEFAULT 0,
    allowances      DECIMAL(10,2) NOT NULL DEFAULT 0,
    overtime_pay    DECIMAL(10,2) NOT NULL DEFAULT 0,
    deductions      DECIMAL(10,2) NOT NULL DEFAULT 0,
    gross_pay       DECIMAL(10,2) NOT NULL DEFAULT 0,
    cpf_employee    DECIMAL(10,2) NOT NULL DEFAULT 0,
    cpf_employer    DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_pay         DECIMAL(10,2) NOT NULL DEFAULT 0,
    days_worked     DECIMAL(5,1),
    days_absent     DECIMAL(5,1),
    notes           NVARCHAR(MAX)
);

CREATE TABLE Mod23Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod23Sequence VALUES (0, 0);
