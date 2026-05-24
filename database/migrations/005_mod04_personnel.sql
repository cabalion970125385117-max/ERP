-- ============================================================
-- ATCA-ERP | DATABASE MIGRATION 005
-- MOD-04: Personnel Qualification & Certification (NAS410)
-- AS9100D §7.1.2 (Competence) | §7.2 (Competence) | §7.3 (Awareness)
-- NADCAP AC7114 §1.4 | NAS410 §6, §7, §8, §9
-- Run after 004_mod07_ncr_capa.sql
-- ============================================================

USE ATCA_ERP_DB;
GO

-- ============================================================
-- TABLE: dbo.Personnel — NDT Personnel Register
-- ============================================================
CREATE TABLE dbo.Personnel (
    personnel_id        INT             NOT NULL IDENTITY(1,1),
    employee_id         NVARCHAR(15)    NOT NULL,       -- ATCA employee number
    full_name           NVARCHAR(100)   NOT NULL,
    designation         NVARCHAR(20)    NOT NULL DEFAULT 'INSPECTOR'
                            CONSTRAINT chk_pers_desig CHECK (
                                designation IN ('LEVEL_1','LEVEL_2','LEVEL_3',
                                                'TRAINEE','SUPERVISOR','ADMIN_STAFF')),
    employment_type     NVARCHAR(12)    NOT NULL DEFAULT 'PERMANENT'
                            CONSTRAINT chk_pers_emp CHECK (
                                employment_type IN ('PERMANENT','CONTRACT','TRAINEE')),
    date_joined         DATE            NOT NULL,
    date_left           DATE            NULL,
    -- Link to system user account
    user_id             INT             NULL,           -- FK → Users (optional)
    -- NAS410 NDT Org Chart role
    ndt_org_role        NVARCHAR(100)   NULL,           -- e.g. 'Responsible Level III (PT)'
    -- Contact
    email               NVARCHAR(100)   NULL,
    is_active           BIT             NOT NULL DEFAULT 1,
    created_by          INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_personnel        PRIMARY KEY (personnel_id),
    CONSTRAINT uq_personnel_empid  UNIQUE (employee_id),
    CONSTRAINT fk_pers_user        FOREIGN KEY (user_id)     REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_pers_created_by  FOREIGN KEY (created_by)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.NdtCertification — Method Certifications per Person
-- NAS410 §6 (Qualification) | §7 (Certification)
-- ============================================================
CREATE TABLE dbo.NdtCertification (
    cert_id             INT             NOT NULL IDENTITY(1,1),
    personnel_id        INT             NOT NULL,
    method              NVARCHAR(5)     NOT NULL
                            CONSTRAINT chk_cert_method CHECK (
                                method IN ('PT','MT','ET','UT','VT','RT')),
    ndt_level           NVARCHAR(5)     NOT NULL
                            CONSTRAINT chk_cert_level CHECK (
                                ndt_level IN ('I','II','III','TRAINEE')),
    cert_scheme         NVARCHAR(10)    NOT NULL DEFAULT 'NAS410'
                            CONSTRAINT chk_cert_scheme CHECK (
                                cert_scheme IN ('NAS410','EN4179','ASNT','CSWIP','PCN','OTHER')),
    cert_number         NVARCHAR(50)    NULL,
    issuing_authority   NVARCHAR(100)   NULL,           -- e.g. CAAS, internal Level III
    issue_date          DATE            NOT NULL,
    expiry_date         DATE            NOT NULL,       -- NAS410: typically 5 years
    -- Vision requirement (NAS410 §9)
    vision_exam_due     DATE            NULL,           -- Annual; derived = issue_date + 1yr
    -- Status
    status              NVARCHAR(10)    NOT NULL DEFAULT 'ACTIVE'
                            CONSTRAINT chk_cert_status CHECK (
                                status IN ('ACTIVE','EXPIRED','SUSPENDED','REVOKED','PENDING')),
    notes               NVARCHAR(500)   NULL,
    is_active           BIT             NOT NULL DEFAULT 1,
    created_by          INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_ndtcert           PRIMARY KEY (cert_id),
    CONSTRAINT fk_cert_personnel    FOREIGN KEY (personnel_id) REFERENCES dbo.Personnel(personnel_id),
    CONSTRAINT fk_cert_created_by   FOREIGN KEY (created_by)   REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.TrainingRecord — NAS410 Training Hours Log
-- NAS410 §6.2 — Minimum Training Hours
-- ============================================================
CREATE TABLE dbo.TrainingRecord (
    training_id         INT             NOT NULL IDENTITY(1,1),
    personnel_id        INT             NOT NULL,
    method              NVARCHAR(5)     NOT NULL
                            CONSTRAINT chk_tr_method CHECK (
                                method IN ('PT','MT','ET','UT','VT','RT','GENERAL')),
    training_type       NVARCHAR(12)    NOT NULL
                            CONSTRAINT chk_tr_type CHECK (
                                training_type IN ('GENERAL','SPECIFIC','PRACTICAL','OJT','REFRESHER')),
    training_date       DATE            NOT NULL,
    hours               DECIMAL(5,1)    NOT NULL
                            CONSTRAINT chk_tr_hours CHECK (hours > 0),
    course_title        NVARCHAR(200)   NULL,
    instructor          NVARCHAR(100)   NULL,
    training_org        NVARCHAR(100)   NULL,           -- e.g. ATCA internal, ASNT
    cert_reference      NVARCHAR(50)    NULL,           -- Certificate/attendance ref
    notes               NVARCHAR(500)   NULL,
    recorded_by         INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_training          PRIMARY KEY (training_id),
    CONSTRAINT fk_tr_personnel      FOREIGN KEY (personnel_id) REFERENCES dbo.Personnel(personnel_id),
    CONSTRAINT fk_tr_recorded_by    FOREIGN KEY (recorded_by)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.EyeExam — Annual Vision Test Records
-- NAS410 §9 — Vision Examination (Jaeger J1; colour vision)
-- ============================================================
CREATE TABLE dbo.EyeExam (
    exam_id             INT             NOT NULL IDENTITY(1,1),
    personnel_id        INT             NOT NULL,
    exam_date           DATE            NOT NULL,
    expiry_date         DATE            NOT NULL,       -- exam_date + 1 year (NAS410 §9.3)
    -- Test results
    near_vision         NVARCHAR(5)     NOT NULL DEFAULT 'J1'
                            CONSTRAINT chk_eye_near CHECK (
                                near_vision IN ('J1','J2','J3','FAIL')),
    colour_vision       NVARCHAR(5)     NOT NULL DEFAULT 'PASS'
                            CONSTRAINT chk_eye_colour CHECK (
                                colour_vision IN ('PASS','FAIL','WAIVED')),
    result              NVARCHAR(5)     NOT NULL
                            CONSTRAINT chk_eye_result CHECK (
                                result IN ('PASS','FAIL')),
    examiner            NVARCHAR(100)   NULL,
    exam_location       NVARCHAR(100)   NULL,
    notes               NVARCHAR(500)   NULL,
    is_active           BIT             NOT NULL DEFAULT 1,
    created_by          INT             NOT NULL,
    created_at          DATETIME2       NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT pk_eyeexam           PRIMARY KEY (exam_id),
    CONSTRAINT fk_eye_personnel     FOREIGN KEY (personnel_id) REFERENCES dbo.Personnel(personnel_id),
    CONSTRAINT fk_eye_created_by    FOREIGN KEY (created_by)   REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- VIEW: Personnel with current cert and eye exam status
-- ============================================================
CREATE VIEW dbo.vw_PersonnelStatus AS
SELECT
    p.personnel_id,
    p.employee_id,
    p.full_name,
    p.designation,
    p.employment_type,
    p.ndt_org_role,
    p.date_joined,
    p.is_active,
    -- Latest eye exam
    ey.exam_id          AS latest_eye_exam_id,
    ey.exam_date        AS eye_exam_date,
    ey.expiry_date      AS eye_exam_expiry,
    ey.result           AS eye_exam_result,
    DATEDIFF(DAY, GETUTCDATE(), ey.expiry_date) AS eye_exam_days_remaining,
    -- Cert count
    (SELECT COUNT(*) FROM dbo.NdtCertification c
        WHERE c.personnel_id = p.personnel_id AND c.is_active = 1
          AND c.status = 'ACTIVE') AS active_cert_count,
    (SELECT COUNT(*) FROM dbo.NdtCertification c
        WHERE c.personnel_id = p.personnel_id AND c.is_active = 1
          AND c.status = 'ACTIVE' AND c.expiry_date < GETUTCDATE()) AS expired_cert_count
FROM dbo.Personnel p
LEFT JOIN dbo.EyeExam ey ON ey.exam_id = (
    SELECT TOP 1 exam_id FROM dbo.EyeExam
    WHERE personnel_id = p.personnel_id AND is_active = 1
    ORDER BY exam_date DESC
)
WHERE p.is_active = 1;
GO

-- ============================================================
-- AUDIT TRIGGER
-- ============================================================
CREATE TRIGGER trg_NdtCertification_Audit
ON dbo.NdtCertification
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'NdtCertification', CAST(i.cert_id AS NVARCHAR(50)), 'MOD-04'
    FROM inserted i;
END;
GO

-- ============================================================
-- SEED DATA — Real ATCA Personnel (from PERSONNEL sheet)
-- Passwords are NOT set here; personnel without user accounts
-- are linked when a system user account is created via MOD-25
-- ============================================================
INSERT INTO dbo.Personnel (employee_id, full_name, designation, employment_type, date_joined,
    ndt_org_role, created_by)
VALUES
('ATCA-001', 'James Tan',     'SUPERVISOR', 'PERMANENT', '2020-01-01',
    'Quality Assurance Manager', 1),
('ATCA-002', 'Hendrich Lim',  'LEVEL_3',    'PERMANENT', '2018-01-01',
    'Responsible Level III (PT, MT, ET, UT)', 1),
('ATCA-003', 'Cabal Lo',      'SUPERVISOR', 'PERMANENT', '2019-01-01',
    'Operations Manager / HOD', 1),
('ATCA-004', 'Gary Tan',      'LEVEL_2',    'PERMANENT', '2022-01-01',
    'NDT Level II (PT)', 1),
('ATCA-005', 'Azman Ayub',    'TRAINEE',    'PERMANENT', '2023-01-01',
    'NDT Level I Trainee (PT)', 1),
('ATCA-006', 'Hariharan',     'TRAINEE',    'PERMANENT', '2023-06-01',
    'NDT Level I Trainee (PT + MPT)', 1);
GO

PRINT 'Migration 005 — MOD-04 Personnel & NAS410: COMPLETE';
GO
