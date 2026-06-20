-- ============================================================
-- Migration 038 — MOD-35 Government & Regulatory Certification Renewal
-- ATCA-ERP | ATC Aviation Pte Ltd
-- Compliance: NADCAP, AS9100D §7.1.2, MOM/WSH (Singapore)
-- ============================================================

-- ─────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────

CREATE TABLE RegulatoryBody (
  body_id       INT IDENTITY(1,1) PRIMARY KEY,
  body_name     NVARCHAR(100) NOT NULL,
  body_type     NVARCHAR(20)  NOT NULL,
  country       NVARCHAR(50),
  contact_email NVARCHAR(200),
  is_active     BIT DEFAULT 1,
  created_at    DATETIME2 DEFAULT GETDATE(),
  CONSTRAINT chk_rb_type CHECK (body_type IN ('NADCAP','CUSTOMER','GOVERNMENT','ISO_BODY','INDUSTRY'))
);

CREATE TABLE CertificationRegister (
  cert_id           INT IDENTITY(1,1) PRIMARY KEY,
  cert_name         NVARCHAR(200) NOT NULL,
  cert_number       NVARCHAR(100),
  body_id           INT REFERENCES RegulatoryBody(body_id),
  scope             NVARCHAR(500),
  cert_type         NVARCHAR(20)  NOT NULL,
  issue_date        DATE,
  expiry_date       DATE NOT NULL,
  renewal_lead_days INT  DEFAULT 90,
  status            NVARCHAR(25)  DEFAULT 'ACTIVE',
  cert_doc_ref      NVARCHAR(500),
  notes             NVARCHAR(1000),
  created_by        NVARCHAR(100),
  created_at        DATETIME2 DEFAULT GETDATE(),
  updated_at        DATETIME2 DEFAULT GETDATE(),
  CONSTRAINT chk_cert_type   CHECK (cert_type   IN ('ACCREDITATION','APPROVAL','LICENSE','PERMIT','QUALIFICATION','REGISTRATION')),
  CONSTRAINT chk_cert_status CHECK (status       IN ('ACTIVE','EXPIRED','SUSPENDED','RENEWAL_IN_PROGRESS','CANCELLED'))
);

CREATE TABLE CertRenewalAction (
  action_id    INT IDENTITY(1,1) PRIMARY KEY,
  cert_id      INT REFERENCES CertificationRegister(cert_id),
  action_type  NVARCHAR(25)  NOT NULL,
  action_date  DATETIME2 DEFAULT GETDATE(),
  due_date     DATE,
  performed_by NVARCHAR(100),
  notes        NVARCHAR(1000),
  status       NVARCHAR(20)  DEFAULT 'OPEN',
  CONSTRAINT chk_action_type   CHECK (action_type IN ('INITIATE','SUBMIT_APPLICATION','AUDIT_SCHEDULED','AUDIT_COMPLETE','CERT_RECEIVED','ESCALATE','NOTE')),
  CONSTRAINT chk_action_status CHECK (status       IN ('OPEN','COMPLETED','OVERDUE'))
);

-- ─────────────────────────────────────────────
-- View — Expiry RAG
-- ─────────────────────────────────────────────

CREATE VIEW vw_CertExpiry AS
SELECT
  c.cert_id, c.cert_name, c.cert_number, c.cert_type, c.status,
  c.issue_date, c.expiry_date, c.renewal_lead_days, c.scope, c.cert_doc_ref, c.notes,
  b.body_id, b.body_name, b.body_type, b.country,
  DATEDIFF(DAY, GETDATE(), c.expiry_date)    AS days_to_expiry,
  CASE
    WHEN c.expiry_date < CAST(GETDATE() AS DATE)                           THEN 'OVERDUE'
    WHEN DATEDIFF(DAY, GETDATE(), c.expiry_date) <= c.renewal_lead_days    THEN 'DUE_SOON'
    ELSE 'OK'
  END                                         AS expiry_rag,
  c.created_at, c.updated_at
FROM CertificationRegister c
LEFT JOIN RegulatoryBody b ON c.body_id = b.body_id
WHERE c.status NOT IN ('CANCELLED');

-- ─────────────────────────────────────────────
-- Seed — Regulatory Bodies (10)
-- ─────────────────────────────────────────────

INSERT INTO RegulatoryBody (body_name, body_type, country, contact_email) VALUES
('NADCAP / Performance Review Institute (PRI)',    'NADCAP',     'USA',       'nadcap@pri.org'),
('Boeing Commercial Airplanes',                    'CUSTOMER',   'USA',       'supplier@boeing.com'),
('Airbus SAS',                                     'CUSTOMER',   'France',    'supplier@airbus.com'),
('Pratt & Whitney (RTX)',                          'CUSTOMER',   'USA',       'supplier@pw.utc.com'),
('Rolls-Royce plc',                               'CUSTOMER',   'UK',        'supplier@rolls-royce.com'),
('Ministry of Manpower Singapore (MOM)',            'GOVERNMENT', 'Singapore', 'mom_enquiry@mom.gov.sg'),
('Workplace Safety & Health Council (WSHC)',        'GOVERNMENT', 'Singapore', 'wsq@wshc.sg'),
('Bureau Veritas Certification',                    'ISO_BODY',   'France',    'certification@bureauveritas.com'),
('Civil Aviation Authority of Singapore (CAAS)',   'GOVERNMENT', 'Singapore', 'caas@caas.gov.sg'),
('Singapore Standards Council (SSC/Enterprise)',   'INDUSTRY',   'Singapore', 'ssc@enterprisesg.gov.sg');

-- ─────────────────────────────────────────────
-- Seed — Certifications (12)
-- Today ref: 2026-06-21
-- RAG outcome noted per row; status reflects latest admin state
-- ─────────────────────────────────────────────

INSERT INTO CertificationRegister
  (cert_name, cert_number, body_id, scope, cert_type, issue_date, expiry_date, renewal_lead_days, status, cert_doc_ref, created_by)
VALUES
-- NADCAP (body 1) — annual; 90-day lead
('NADCAP Heat Treatment Accreditation',
  'NADCAP-HT-2025-SG042',  1,
  'AMS 2750H pyrometry, vacuum HT, precipitation hardening — all aerospace customers',
  'ACCREDITATION', '2025-07-01', '2026-07-01', 90, 'RENEWAL_IN_PROGRESS',
  'CERT/NADCAP/HT/2025', 'admin'),                          -- DUE_SOON (10 d)

('NADCAP Chemical Processing Accreditation',
  'NADCAP-CP-2025-SG042',  1,
  'Anodize Type I/II/III, cadmium/silver/gold/nickel plating, passivation, phosphating — AC7108/AC7110',
  'ACCREDITATION', '2025-09-15', '2026-09-15', 90, 'ACTIVE',
  'CERT/NADCAP/CP/2025', 'admin'),                          -- DUE_SOON (86 d, within 90-d lead)

('NADCAP Non-Destructive Testing Accreditation',
  'NADCAP-NDT-2024-SG042', 1,
  'FPI, MPI, RT/X-Ray — NAS410 Level II/III operators',
  'ACCREDITATION', '2024-10-01', '2026-04-01', 90, 'RENEWAL_IN_PROGRESS',
  'CERT/NADCAP/NDT/2024', 'admin'),                         -- OVERDUE (81 d ago)

-- Customer approvals (60-day lead)
('Boeing D6-82479 Approved Processor',
  'D6-82479-ATC-2024',     2,
  'Cadmium plating, anodize Type II, chemical film — Boeing commercial & defense',
  'APPROVAL', '2024-03-01', '2026-03-01', 60, 'EXPIRED',
  'CERT/CUST/BOEING/2024', 'admin'),                        -- OVERDUE (112 d ago)

('Airbus AIMS 04-00-002 Process Approval',
  'AIMS-ATC-SG-2025',      3,
  'Anodise, electroless nickel, passivation — Airbus A320/A350 supply chain',
  'APPROVAL', '2025-01-15', '2026-07-15', 60, 'ACTIVE',
  'CERT/CUST/AIRBUS/2025', 'admin'),                        -- DUE_SOON (24 d, within 60-d lead)

('Pratt & Whitney Special Process Approval',
  'PW-PROC-ATC-2025',      4,
  'Shot peen, anodize, plating — PW1100G-JM engine components',
  'APPROVAL', '2025-04-01', '2027-04-01', 60, 'ACTIVE',
  'CERT/CUST/PW/2025', 'admin'),                            -- OK (649 d)

('Rolls-Royce Approved Special Processor',
  'RR-APSP-2024-ATC',      5,
  'FPI, MPI, passivation — Trent XWB turbine series',
  'APPROVAL', '2024-11-01', '2025-11-01', 60, 'EXPIRED',
  'CERT/CUST/RR/2024', 'admin'),                            -- OVERDUE (232 d ago)

-- Singapore Government (MOM/WSHC/CAAS)
('MOM Factory Registration — Chemical Works',
  'MOM-FR-2025-12345',     6,
  'Factory registration for chemical processing operations — Bays 2–5',
  'LICENSE', '2025-01-01', '2026-12-31', 60, 'ACTIVE',
  'CERT/GOVT/MOM/FR/2025', 'admin'),                        -- OK (193 d)

('WSHC Workplace Safety Certificate',
  'WSHC-WSC-2025-ATC',     7,
  'Workplace safety management system — all bays, all chemical processes',
  'QUALIFICATION', '2025-03-01', '2027-03-01', 90, 'ACTIVE',
  'CERT/GOVT/WSHC/2025', 'admin'),                          -- OK (618 d)

('CAAS Approved Maintenance Organisation (AMO)',
  'CAAS-AMO-2025-1234',    9,
  'Component maintenance approval — NDT and surface treatment of aircraft parts',
  'APPROVAL', '2025-02-01', '2026-08-01', 90, 'ACTIVE',
  'CERT/GOVT/CAAS/2025', 'admin'),                          -- DUE_SOON (41 d, within 90-d lead)

-- QMS / ISO
('AS9100D Rev D Quality Management System',
  'BV-AS9100D-2024-SG042', 8,
  'Full QMS scope — NDT, special processes, heat treatment, chemical processing',
  'REGISTRATION', '2024-05-01', '2027-05-01', 120, 'ACTIVE',
  'CERT/ISO/AS9100D/2024', 'admin'),                        -- OK (679 d)

('ISO 9001:2015 Certification',
  'BV-ISO9001-2024-SG042', 8,
  'Quality management — commercial (non-aerospace) operations',
  'REGISTRATION', '2024-05-01', '2027-05-01', 120, 'ACTIVE',
  'CERT/ISO/9001/2024', 'admin');                           -- OK (679 d)

-- ─────────────────────────────────────────────
-- Seed — Renewal Actions
-- ─────────────────────────────────────────────

INSERT INTO CertRenewalAction (cert_id, action_type, action_date, due_date, performed_by, notes, status) VALUES
-- NADCAP NDT (cert_id 3) — renewal in progress
(3, 'INITIATE',          '2026-04-05', '2026-05-01', 'James Tan Wei Liang', 'NDT NADCAP renewal initiated — audit interval expired; PRI contacted', 'COMPLETED'),
(3, 'SUBMIT_APPLICATION','2026-04-18', '2026-05-15', 'James Tan Wei Liang', 'Online application submitted via eAuditNet portal, reference #PRE-SG042-NDT-2026', 'COMPLETED'),
(3, 'AUDIT_SCHEDULED',   '2026-05-22', '2026-07-20', 'James Tan Wei Liang', 'PRI audit team scheduled for 2026-07-20; readiness review to precede by 2 weeks', 'OPEN'),

-- NADCAP HT (cert_id 1) — renewal in progress
(1, 'INITIATE',          '2026-05-15', '2026-06-15', 'James Tan Wei Liang', 'HT NADCAP renewal initiated — expiry 2026-07-01; within 90-day lead window', 'COMPLETED'),
(1, 'SUBMIT_APPLICATION','2026-06-01', '2026-06-20', 'James Tan Wei Liang', 'Application submitted via eAuditNet; awaiting audit date assignment', 'OPEN'),

-- Boeing (cert_id 4) — expired, renewal in progress
(4, 'INITIATE',          '2026-02-15', '2026-03-15', 'Gary Tan Beng Huat',  'Boeing D6-82479 renewal initiated; Boeing supplier portal submission', 'COMPLETED'),
(4, 'SUBMIT_APPLICATION','2026-03-08', '2026-04-08', 'Gary Tan Beng Huat',  'Renewal submission via Boeing EXOSTAR portal. Awaiting Boeing audit team response', 'OPEN'),
(4, 'ESCALATE',          '2026-04-15', '2026-05-15', 'James Tan Wei Liang', 'ESCALATED — Boeing approval expired 2026-03-01. All D6-82479 jobs on hold. Chasing Boeing QE.', 'OPEN'),

-- CAAS AMO (cert_id 10) — due soon
(10, 'INITIATE',         '2026-06-10', '2026-07-10', 'Gary Tan Beng Huat',  'CAAS AMO renewal initiated; expiry 2026-08-01 (41 days). CAAS form CAAS/AW/OPS-2026 prepared', 'OPEN');
