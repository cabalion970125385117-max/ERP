-- Migration 026: Bug Report / Issue Tracker
-- Internal defect tracking for the ERP system itself

IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='BugReport' AND xtype='U')
BEGIN
  CREATE TABLE BugReport (
    bug_id              INT           IDENTITY(1,1) PRIMARY KEY,
    title               NVARCHAR(200) NOT NULL,
    description         NVARCHAR(MAX) NOT NULL,
    severity            NVARCHAR(20)  NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    module_affected     NVARCHAR(100) NULL,
    steps_to_reproduce  NVARCHAR(MAX) NULL,
    status              NVARCHAR(20)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','WONT_FIX')),
    resolution_notes    NVARCHAR(MAX) NULL,
    reported_by         INT           NOT NULL REFERENCES Users(user_id),
    resolved_by         INT           NULL     REFERENCES Users(user_id),
    reported_at         DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    resolved_at         DATETIME2     NULL,
    is_active           BIT           NOT NULL DEFAULT 1
  );
  CREATE INDEX IX_BugReport_status   ON BugReport(status);
  CREATE INDEX IX_BugReport_severity ON BugReport(severity);
END;
GO
