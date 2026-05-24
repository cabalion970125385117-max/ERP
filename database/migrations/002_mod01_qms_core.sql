-- ============================================================
-- ATCA-ERP | DATABASE MIGRATION 002
-- MOD-01: QMS Core
-- AS9100D §4.1, §4.2, §5.1, §5.2, §5.3, §6.1, §6.2, §9.3
-- SQL Server 2019/2022 | ATCA_ERP_DB
-- ============================================================

USE ATCA_ERP_DB;
GO

-- ============================================================
-- TABLE: dbo.QmsPolicy — Quality Policy (§5.2)
-- Only one ACTIVE record at a time; previous = SUPERSEDED
-- ============================================================
CREATE TABLE dbo.QmsPolicy (
    policy_id       INT             NOT NULL IDENTITY(1,1),
    revision        NVARCHAR(5)     NOT NULL,       -- e.g. 'Rev A', 'Rev B'
    issue_date      DATE            NOT NULL,
    effective_date  DATE            NOT NULL,
    policy_text     NVARCHAR(MAX)   NOT NULL,       -- Full policy statement
    approved_by     INT             NOT NULL,        -- FK → Users (QA_MANAGER or ADMIN)
    status          NVARCHAR(12)    NOT NULL DEFAULT 'DRAFT'
                        CONSTRAINT chk_policy_status CHECK (
                            status IN ('DRAFT','APPROVED','SUPERSEDED')),
    is_active       BIT             NOT NULL DEFAULT 1,
    created_by      INT             NOT NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_qmspolicy PRIMARY KEY (policy_id),
    CONSTRAINT fk_qmspolicy_approved FOREIGN KEY (approved_by) REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_qmspolicy_created  FOREIGN KEY (created_by)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.QmsObjective — Quality Objectives (§6.2)
-- SMART objectives with KPI tracking; linked to review cycle
-- ============================================================
CREATE TABLE dbo.QmsObjective (
    objective_id    INT             NOT NULL IDENTITY(1,1),
    objective_ref   NVARCHAR(20)    NOT NULL,       -- e.g. 'OBJ-2026-001'
    title           NVARCHAR(200)   NOT NULL,
    description     NVARCHAR(MAX)   NULL,
    as9100d_clause  NVARCHAR(50)    NULL,           -- e.g. '6.2, 9.1'
    process_area    NVARCHAR(50)    NULL,           -- e.g. 'FPI','NDT','QA','HR'
    target_value    DECIMAL(10,2)   NULL,
    target_unit     NVARCHAR(30)    NULL,           -- e.g. '% pass rate', 'days', 'count'
    target_date     DATE            NOT NULL,
    measurement_freq NVARCHAR(15)   NOT NULL DEFAULT 'Monthly'
                        CONSTRAINT chk_obj_freq CHECK (
                            measurement_freq IN ('Daily','Weekly','Monthly','Quarterly','Annually')),
    status          NVARCHAR(12)    NOT NULL DEFAULT 'OPEN'
                        CONSTRAINT chk_obj_status CHECK (
                            status IN ('OPEN','ON_TRACK','AT_RISK','ACHIEVED','CLOSED')),
    owner_user_id   INT             NOT NULL,
    is_active       BIT             NOT NULL DEFAULT 1,
    created_by      INT             NOT NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_qmsobjective PRIMARY KEY (objective_id),
    CONSTRAINT uq_objective_ref UNIQUE (objective_ref),
    CONSTRAINT fk_obj_owner   FOREIGN KEY (owner_user_id) REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_obj_created FOREIGN KEY (created_by)    REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.QmsObjectiveMeasurement — KPI Data Points
-- Tracks actual vs target per objective per period
-- ============================================================
CREATE TABLE dbo.QmsObjectiveMeasurement (
    measurement_id  INT             NOT NULL IDENTITY(1,1),
    objective_id    INT             NOT NULL,
    period_label    NVARCHAR(20)    NOT NULL,       -- e.g. 'Jan 2026', 'Q1 2026'
    period_date     DATE            NOT NULL,        -- First day of period
    actual_value    DECIMAL(10,2)   NOT NULL,
    notes           NVARCHAR(500)   NULL,
    recorded_by     INT             NOT NULL,
    recorded_at     DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_objmeasure   PRIMARY KEY (measurement_id),
    CONSTRAINT fk_objm_obj    FOREIGN KEY (objective_id) REFERENCES dbo.QmsObjective(objective_id),
    CONSTRAINT fk_objm_user   FOREIGN KEY (recorded_by)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.ManagementReview — Mgmt Review Records (§9.3)
-- Scheduled reviews; links to agenda items and action items
-- ============================================================
CREATE TABLE dbo.ManagementReview (
    review_id       INT             NOT NULL IDENTITY(1,1),
    review_ref      NVARCHAR(20)    NOT NULL,       -- e.g. 'MR-2026-001'
    review_type     NVARCHAR(12)    NOT NULL DEFAULT 'Annual'
                        CONSTRAINT chk_rev_type CHECK (
                            review_type IN ('Annual','Semi-Annual','Quarterly','Special')),
    review_date     DATE            NOT NULL,
    location        NVARCHAR(100)   NULL DEFAULT 'ATCA Board Room',
    chaired_by      INT             NOT NULL,        -- FK → Users (QA_MANAGER)
    status          NVARCHAR(10)    NOT NULL DEFAULT 'PLANNED'
                        CONSTRAINT chk_rev_status CHECK (
                            status IN ('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')),
    -- AS9100D §9.3.2 Inputs (stored as structured text / JSON)
    input_audit_results         NVARCHAR(MAX)   NULL,
    input_customer_feedback     NVARCHAR(MAX)   NULL,
    input_process_performance   NVARCHAR(MAX)   NULL,
    input_ncr_capa_status       NVARCHAR(MAX)   NULL,
    input_prev_actions          NVARCHAR(MAX)   NULL,
    input_risks_opportunities   NVARCHAR(MAX)   NULL,
    input_resource_adequacy     NVARCHAR(MAX)   NULL,
    -- AS9100D §9.3.3 Outputs
    output_improvement_opps     NVARCHAR(MAX)   NULL,
    output_qms_changes          NVARCHAR(MAX)   NULL,
    output_resource_needs       NVARCHAR(MAX)   NULL,
    minutes_text                NVARCHAR(MAX)   NULL,
    approved_by                 INT             NULL,
    approved_at                 DATETIME2       NULL,
    is_active                   BIT             NOT NULL DEFAULT 1,
    created_by                  INT             NOT NULL,
    created_at                  DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_mgmtreview      PRIMARY KEY (review_id),
    CONSTRAINT uq_review_ref      UNIQUE (review_ref),
    CONSTRAINT fk_rev_chair       FOREIGN KEY (chaired_by)  REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_rev_approved    FOREIGN KEY (approved_by) REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_rev_created     FOREIGN KEY (created_by)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.MgmtReviewAttendee — Review Attendee Sign-Off
-- ============================================================
CREATE TABLE dbo.MgmtReviewAttendee (
    attendee_id     INT             NOT NULL IDENTITY(1,1),
    review_id       INT             NOT NULL,
    user_id         INT             NOT NULL,
    role_at_review  NVARCHAR(50)    NULL,           -- e.g. 'Chair', 'QA Manager', 'Observer'
    attended        BIT             NOT NULL DEFAULT 1,
    signed_at       DATETIME2       NULL,
    CONSTRAINT pk_attendee       PRIMARY KEY (attendee_id),
    CONSTRAINT fk_att_review     FOREIGN KEY (review_id) REFERENCES dbo.ManagementReview(review_id),
    CONSTRAINT fk_att_user       FOREIGN KEY (user_id)   REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.MgmtReviewAction — Action Items from Reviews
-- ============================================================
CREATE TABLE dbo.MgmtReviewAction (
    action_id       INT             NOT NULL IDENTITY(1,1),
    review_id       INT             NOT NULL,
    action_ref      NVARCHAR(25)    NOT NULL,       -- e.g. 'MR-2026-001-A01'
    description     NVARCHAR(500)   NOT NULL,
    owner_user_id   INT             NOT NULL,
    due_date        DATE            NOT NULL,
    completion_date DATE            NULL,
    status          NVARCHAR(12)    NOT NULL DEFAULT 'OPEN'
                        CONSTRAINT chk_action_status CHECK (
                            status IN ('OPEN','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED')),
    evidence        NVARCHAR(MAX)   NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_mgmtaction     PRIMARY KEY (action_id),
    CONSTRAINT uq_action_ref     UNIQUE (action_ref),
    CONSTRAINT fk_act_review     FOREIGN KEY (review_id)      REFERENCES dbo.ManagementReview(review_id),
    CONSTRAINT fk_act_owner      FOREIGN KEY (owner_user_id)  REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.OrgContext — Context of Organization (§4.1, §4.2)
-- Internal/external issues + interested parties
-- ============================================================
CREATE TABLE dbo.OrgContext (
    context_id      INT             NOT NULL IDENTITY(1,1),
    context_type    NVARCHAR(12)    NOT NULL
                        CONSTRAINT chk_ctx_type CHECK (
                            context_type IN ('INTERNAL','EXTERNAL','INT_PARTY')),
    category        NVARCHAR(50)    NULL,           -- e.g. 'Regulatory','Workforce','Customer'
    description     NVARCHAR(500)   NOT NULL,
    relevance       NVARCHAR(200)   NULL,           -- How it affects QMS
    review_date     DATE            NULL,
    next_review     DATE            NULL,
    is_active       BIT             NOT NULL DEFAULT 1,
    created_by      INT             NOT NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_orgcontext     PRIMARY KEY (context_id),
    CONSTRAINT fk_ctx_created    FOREIGN KEY (created_by) REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- TABLE: dbo.RiskRegister — Risk & Opportunity Register (§6.1)
-- FMEA-linked; opportunity tracking; AS9100D risk-based thinking
-- ============================================================
CREATE TABLE dbo.RiskRegister (
    risk_id         INT             NOT NULL IDENTITY(1,1),
    risk_ref        NVARCHAR(20)    NOT NULL,       -- e.g. 'RSK-2026-001'
    risk_type       NVARCHAR(12)    NOT NULL DEFAULT 'RISK'
                        CONSTRAINT chk_risk_type CHECK (risk_type IN ('RISK','OPPORTUNITY')),
    process_area    NVARCHAR(50)    NULL,           -- 'FPI','NDT','QA','HR','PLATING'
    description     NVARCHAR(500)   NOT NULL,
    cause           NVARCHAR(300)   NULL,
    consequence     NVARCHAR(300)   NULL,
    -- Risk rating (before treatment)
    likelihood_pre  TINYINT         NOT NULL DEFAULT 3
                        CONSTRAINT chk_risk_like_pre CHECK (likelihood_pre BETWEEN 1 AND 5),
    severity_pre    TINYINT         NOT NULL DEFAULT 3
                        CONSTRAINT chk_risk_sev_pre  CHECK (severity_pre  BETWEEN 1 AND 5),
    -- Computed: risk_score_pre = likelihood_pre * severity_pre (1–25)
    treatment       NVARCHAR(MAX)   NULL,
    -- Risk rating (after treatment)
    likelihood_post TINYINT         NULL
                        CONSTRAINT chk_risk_like_post CHECK (likelihood_post BETWEEN 1 AND 5),
    severity_post   TINYINT         NULL
                        CONSTRAINT chk_risk_sev_post  CHECK (severity_post  BETWEEN 1 AND 5),
    status          NVARCHAR(12)    NOT NULL DEFAULT 'OPEN'
                        CONSTRAINT chk_risk_status CHECK (
                            status IN ('OPEN','TREATED','ACCEPTED','CLOSED','MONITORING')),
    owner_user_id   INT             NOT NULL,
    review_date     DATE            NULL,
    as9100d_clause  NVARCHAR(50)    NULL,
    fmea_ref        NVARCHAR(30)    NULL,           -- Link to FMEA record if applicable
    is_active       BIT             NOT NULL DEFAULT 1,
    created_by      INT             NOT NULL,
    created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT pk_riskregister   PRIMARY KEY (risk_id),
    CONSTRAINT uq_risk_ref       UNIQUE (risk_ref),
    CONSTRAINT fk_risk_owner     FOREIGN KEY (owner_user_id) REFERENCES dbo.Users(user_id),
    CONSTRAINT fk_risk_created   FOREIGN KEY (created_by)    REFERENCES dbo.Users(user_id)
);
GO

-- ============================================================
-- COMPUTED COLUMN VIEW — Risk Score
-- ============================================================
CREATE VIEW dbo.vw_RiskRegister AS
SELECT
    r.*,
    (r.likelihood_pre  * r.severity_pre)  AS risk_score_pre,
    (r.likelihood_post * r.severity_post) AS risk_score_post,
    CASE
        WHEN (r.likelihood_pre * r.severity_pre) >= 15 THEN 'HIGH'
        WHEN (r.likelihood_pre * r.severity_pre) >= 8  THEN 'MEDIUM'
        ELSE 'LOW'
    END AS risk_level_pre,
    u_owner.full_name AS owner_name,
    u_created.full_name AS created_by_name
FROM dbo.RiskRegister r
LEFT JOIN dbo.Users u_owner   ON u_owner.user_id   = r.owner_user_id
LEFT JOIN dbo.Users u_created ON u_created.user_id  = r.created_by
WHERE r.is_active = 1;
GO

-- ============================================================
-- AUDIT TRIGGERS — MOD-01 Tables
-- Captures INSERT/UPDATE to AuditLog; never fires on DELETE
-- (Physical DELETE not permitted — app uses is_active=0)
-- ============================================================

-- Trigger: QmsPolicy
CREATE TRIGGER trg_QmsPolicy_Audit
ON dbo.QmsPolicy
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'QmsPolicy',
        CAST(i.policy_id AS NVARCHAR(50)),
        'MOD-01'
    FROM inserted i;
END;
GO

-- Trigger: QmsObjective
CREATE TRIGGER trg_QmsObjective_Audit
ON dbo.QmsObjective
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'QmsObjective',
        CAST(i.objective_id AS NVARCHAR(50)),
        'MOD-01'
    FROM inserted i;
END;
GO

-- Trigger: RiskRegister
CREATE TRIGGER trg_RiskRegister_Audit
ON dbo.RiskRegister
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.AuditLog (action, table_name, record_id, module_id)
    SELECT
        CASE WHEN EXISTS (SELECT 1 FROM deleted) THEN 'UPDATE' ELSE 'INSERT' END,
        'RiskRegister',
        CAST(i.risk_id AS NVARCHAR(50)),
        'MOD-01'
    FROM inserted i;
END;
GO

-- ============================================================
-- SEED DATA — ATCA Default Admin User (password must be reset)
-- BCrypt placeholder hash — change on first login
-- ============================================================
INSERT INTO dbo.Users (username, password_hash, role, full_name, is_active)
VALUES ('atca_admin', '$2b$12$CHANGE_ME_ON_FIRST_LOGIN_PLACEHOLDER', 'ADMIN', 'ATCA System Admin', 1);
GO

PRINT 'Migration 002 — MOD-01 QMS Core: COMPLETE';
GO
