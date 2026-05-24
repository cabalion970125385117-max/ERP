-- ============================================================
-- ATCA-ERP | DATABASE MIGRATION 001
-- Core Framework: Users, Audit Log, Shared Reference Tables
-- SQL Server 2019/2022 | ATCA_ERP_DB
-- AS9100D §7.5 | NADCAP AC7114 | NAS410
-- ============================================================

USE ATCA_ERP_DB;
GO

-- ============================================================
-- SCHEMA: dbo (default)
-- ============================================================

-- ============================================================
-- TABLE: dbo.Users — RBAC User Accounts
-- AS9100D §7.5 (access control)
-- ============================================================
CREATE TABLE dbo.Users (
    user_id         INT             NOT NULL IDENTITY(1,1),
    username        NVARCHAR(50)    NOT NULL,
    password_hash   NVARCHAR(256)   NOT NULL,   -- BCrypt hash; NEVER store plaintext
    role            NVARCHAR(30)    NOT NULL
                        CONSTRAINT chk_users_role CHECK (
                            role IN ('ADMIN','QA_MANAGER','ENGINEER',
                                     'NDT_INSPECTOR','SUPERVISOR','READONLY')),
    full_name       NVARCHAR(100)   NOT NULL,
    employee_id     NVARCHAR(15)    NULL,        -- FK → Personnel (added in migration 002)
    is_active       BIT             NOT NULL DEFAULT 1,
    last_login      DATETIME2       NULL,
    failed_attempts TINYINT         NOT NULL DEFAULT 0,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_users_username UNIQUE (username)
);
GO

-- ============================================================
-- TABLE: dbo.AuditLog — Immutable Write Log
-- AS9100D §7.5.3 | AC7114 §1.2
-- Append-only: app service account has NO UPDATE/DELETE
-- ============================================================
CREATE TABLE dbo.AuditLog (
    audit_id        BIGINT          NOT NULL IDENTITY(1,1),
    event_utc       DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    user_id         INT             NULL,        -- NULL if pre-auth failure
    username        NVARCHAR(50)    NULL,
    lan_ip          NVARCHAR(45)    NULL,        -- IPv4/IPv6
    action          NVARCHAR(20)    NOT NULL
                        CONSTRAINT chk_audit_action CHECK (
                            action IN ('INSERT','UPDATE','SOFT_DELETE',
                                       'LOGIN','LOGOUT','LOGIN_FAIL','CERT_ALERT')),
    table_name      NVARCHAR(100)   NULL,
    record_id       NVARCHAR(50)    NULL,        -- string repr of PK
    old_value       NVARCHAR(MAX)   NULL,        -- JSON snapshot
    new_value       NVARCHAR(MAX)   NULL,        -- JSON snapshot
    module_id       NVARCHAR(10)    NULL,        -- e.g. 'MOD-01'
    CONSTRAINT pk_auditlog PRIMARY KEY (audit_id)
);
GO

-- ============================================================
-- TABLE: dbo.AlertLog — System Notifications
-- Cert expiry, bath out-of-tolerance, calibration overdue
-- ============================================================
CREATE TABLE dbo.AlertLog (
    alert_id        INT             NOT NULL IDENTITY(1,1),
    alert_utc       DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    alert_type      NVARCHAR(30)    NOT NULL
                        CONSTRAINT chk_alert_type CHECK (
                            alert_type IN ('CERT_EXPIRY','EYE_EXAM_EXPIRY',
                                           'CAL_OVERDUE','BATH_OUT_OF_SPEC',
                                           'CAPA_OVERDUE','NCR_OPEN','REVIEW_DUE')),
    severity        NVARCHAR(6)     NOT NULL
                        CONSTRAINT chk_alert_sev CHECK (severity IN ('RED','AMBER','GREEN')),
    module_id       NVARCHAR(10)    NULL,
    reference_id    NVARCHAR(50)    NULL,        -- FK ref to affected record
    message         NVARCHAR(500)   NOT NULL,
    acknowledged    BIT             NOT NULL DEFAULT 0,
    ack_user_id     INT             NULL,
    ack_utc         DATETIME2       NULL,
    CONSTRAINT pk_alertlog PRIMARY KEY (alert_id)
);
GO
