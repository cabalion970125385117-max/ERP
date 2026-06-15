-- Migration 025: System Change Log
-- Tracks all ERP version changes, features, and fixes

IF NOT EXISTS (SELECT 1 FROM sysobjects WHERE name='ChangeLog' AND xtype='U')
BEGIN
  CREATE TABLE ChangeLog (
    entry_id      INT            IDENTITY(1,1) PRIMARY KEY,
    version       NVARCHAR(20)   NOT NULL,
    category      NVARCHAR(20)   NOT NULL CHECK (category IN ('FEATURE','BUGFIX','MIGRATION','CONFIG','SECURITY')),
    description   NVARCHAR(500)  NOT NULL,
    affected_modules NVARCHAR(200) NULL,
    notes         NVARCHAR(MAX)  NULL,
    created_by    INT            NOT NULL REFERENCES Users(user_id),
    created_at    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    is_active     BIT            NOT NULL DEFAULT 1
  );
  CREATE INDEX IX_ChangeLog_category   ON ChangeLog(category);
  CREATE INDEX IX_ChangeLog_created_at ON ChangeLog(created_at);
  CREATE INDEX IX_ChangeLog_version    ON ChangeLog(version);
END;

-- Seed with project history
INSERT INTO ChangeLog (version, category, description, affected_modules, notes, created_by) VALUES
('1.0.0','FEATURE','Initial release — Phase 1: QMS Core, Document Control, FPI, Personnel, Equipment, Bath Control, NCR/CAPA','MOD-01,MOD-02,MOD-03,MOD-04,MOD-05,MOD-06,MOD-07',NULL,1),
('1.1.0','FEATURE','Phase 2: Audit Management, Work Order, MPT Process, Certificate of Conformance','MOD-08,MOD-13,MOD-17,MOD-24',NULL,1),
('1.2.0','FEATURE','Phase 3: Sales & Customer Service, Customer Complaint & 8D Report','MOD-09,MOD-20',NULL,1),
('1.3.0','FEATURE','Phase 4: Production Management, Extended Laboratory','MOD-10,MOD-19',NULL,1),
('1.4.0','FEATURE','Phase 5: Maintenance, Purchasing & AVL, Inventory Management','MOD-11,MOD-12,MOD-14',NULL,1),
('1.5.0','FEATURE','Phase 6: HR Management, Communications, Leave & Attendance, Payroll','MOD-18,MOD-21,MOD-22,MOD-23',NULL,1),
('1.6.0','FEATURE','Phase 7: Finance — AR/AP, Journal Entries, Chart of Accounts','MOD-16',NULL,1),
('1.7.0','FEATURE','Phase 8: System Change Log and Bug Report modules','MOD-CHANGELOG,MOD-BUGREPORT',NULL,1),
('1.0.1','BUGFIX','Fixed KPI field name mismatch in MOD-04 (expired_certs vs certs_expired)','MOD-04','Fields renamed to match frontend expectations',1),
('1.0.2','BUGFIX','Fixed route ordering in MOD-01 reviews — /actions/:id matched before /:id','MOD-01','Moved action route above generic ID route',1),
('1.0.3','BUGFIX','Fixed atca-core.js duplicate init — replaced auto-init with singleton ATCA.initPage()','ALL','Eliminated double clock timers and duplicate alert polling',1);
GO
