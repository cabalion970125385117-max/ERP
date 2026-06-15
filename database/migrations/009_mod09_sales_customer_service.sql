-- =============================================================
-- ATCA-ERP v1.0 — Migration 009: MOD-09 Sales & Customer Service
-- AS9100D §8.2 (Customer Communication) | §8.4 (External Providers)
-- §8.2.3 (Contract Review) | §8.4.1 (GRN / Supplier Control)
-- Created: 2026-06-13
-- =============================================================

USE ATCA_ERP_DB;
GO

-- ── Customer Master ───────────────────────────────────────────
CREATE TABLE dbo.Customer (
  customer_id      INT IDENTITY(1,1) PRIMARY KEY,
  customer_code    NVARCHAR(20)   NOT NULL UNIQUE,   -- CUST-0001
  company_name     NVARCHAR(200)  NOT NULL,
  contact_person   NVARCHAR(100)  NULL,
  email            NVARCHAR(150)  NULL,
  phone            NVARCHAR(30)   NULL,
  address          NVARCHAR(500)  NULL,
  customer_type    NVARCHAR(20)   NOT NULL DEFAULT 'REGULAR'
    CHECK (customer_type IN ('REGULAR','OEM','TIER1','GOVERNMENT','INTERNAL')),
  industry         NVARCHAR(100)  NULL,
  approved_vendor  BIT            NOT NULL DEFAULT 0,
  credit_limit     DECIMAL(14,2)  NULL,
  credit_terms_days INT           NULL DEFAULT 30,
  notes            NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_by       INT            NULL REFERENCES dbo.Users(user_id),
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Part Master ───────────────────────────────────────────────
CREATE TABLE dbo.PartMaster (
  part_id          INT IDENTITY(1,1) PRIMARY KEY,
  part_number      NVARCHAR(100)  NOT NULL UNIQUE,
  part_description NVARCHAR(300)  NOT NULL,
  part_type        NVARCHAR(30)   NOT NULL DEFAULT 'SERVICE'
    CHECK (part_type IN ('COMPONENT','ASSEMBLY','RAW_MATERIAL','SERVICE','CONSUMABLE')),
  process_area     NVARCHAR(50)   NULL,        -- FPI, MPT, CHEM_PROC, NDT
  material_spec    NVARCHAR(100)  NULL,
  unit_of_measure  NVARCHAR(20)   NOT NULL DEFAULT 'EA',
  standard_price   DECIMAL(14,2)  NULL,
  customer_id      INT            NULL REFERENCES dbo.Customer(customer_id),
  revision         NVARCHAR(10)   NULL DEFAULT 'A',
  notes            NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_by       INT            NULL REFERENCES dbo.Users(user_id),
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Quotation Header ──────────────────────────────────────────
CREATE TABLE dbo.Quotation (
  quotation_id     INT IDENTITY(1,1) PRIMARY KEY,
  quotation_ref    NVARCHAR(20)   NOT NULL UNIQUE,   -- QT-2026-0001
  customer_id      INT            NOT NULL REFERENCES dbo.Customer(customer_id),
  quotation_date   DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  valid_until      DATE           NULL,
  currency         NVARCHAR(5)    NOT NULL DEFAULT 'SGD',
  subtotal         DECIMAL(14,2)  NOT NULL DEFAULT 0,
  gst_pct          DECIMAL(5,2)   NOT NULL DEFAULT 9.00,
  gst_amount       DECIMAL(14,2)  NOT NULL DEFAULT 0,
  total_amount     DECIMAL(14,2)  NOT NULL DEFAULT 0,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CONVERTED')),
  terms_conditions NVARCHAR(MAX)  NULL,
  notes            NVARCHAR(MAX)  NULL,
  prepared_by      INT            NOT NULL REFERENCES dbo.Users(user_id),
  approved_by      INT            NULL REFERENCES dbo.Users(user_id),
  approved_at      DATETIME2      NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Quotation Line Items ──────────────────────────────────────
CREATE TABLE dbo.QuotationLine (
  line_id          INT IDENTITY(1,1) PRIMARY KEY,
  quotation_id     INT            NOT NULL REFERENCES dbo.Quotation(quotation_id),
  line_seq         INT            NOT NULL DEFAULT 1,
  part_id          INT            NULL REFERENCES dbo.PartMaster(part_id),
  description      NVARCHAR(300)  NOT NULL,
  unit_of_measure  NVARCHAR(20)   NOT NULL DEFAULT 'EA',
  quantity         DECIMAL(12,3)  NOT NULL DEFAULT 1,
  unit_price       DECIMAL(14,2)  NOT NULL DEFAULT 0,
  discount_pct     DECIMAL(5,2)   NOT NULL DEFAULT 0,
  line_total       DECIMAL(14,2)  NOT NULL DEFAULT 0
);
GO

-- ── Contract Review ───────────────────────────────────────────
-- AS9100D §8.2.3: review before accepting order
CREATE TABLE dbo.ContractReview (
  review_id        INT IDENTITY(1,1) PRIMARY KEY,
  review_ref       NVARCHAR(20)   NOT NULL UNIQUE,   -- CR-2026-0001
  customer_id      INT            NOT NULL REFERENCES dbo.Customer(customer_id),
  quotation_id     INT            NULL REFERENCES dbo.Quotation(quotation_id),
  po_number        NVARCHAR(100)  NULL,
  po_date          DATE           NULL,
  review_date      DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  -- Review checklist (AS9100D §8.2.3)
  spec_reviewed    BIT            NOT NULL DEFAULT 0,
  capability_ok    BIT            NOT NULL DEFAULT 0,
  delivery_ok      BIT            NOT NULL DEFAULT 0,
  regulatory_ok    BIT            NOT NULL DEFAULT 0,
  customer_flow_ok BIT            NOT NULL DEFAULT 0,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','ON_HOLD')),
  reviewer_id      INT            NOT NULL REFERENCES dbo.Users(user_id),
  review_notes     NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── Goods Receiving Note (GRN) ────────────────────────────────
-- AS9100D §8.4.3: verification of externally provided products
CREATE TABLE dbo.GoodsReceivingNote (
  grn_id           INT IDENTITY(1,1) PRIMARY KEY,
  grn_ref          NVARCHAR(20)   NOT NULL UNIQUE,   -- GRN-2026-0001
  customer_id      INT            NULL REFERENCES dbo.Customer(customer_id),
  supplier_name    NVARCHAR(200)  NULL,
  delivery_note_no NVARCHAR(100)  NULL,
  received_date    DATE           NOT NULL DEFAULT CAST(GETUTCDATE() AS DATE),
  received_by      INT            NOT NULL REFERENCES dbo.Users(user_id),
  inspection_reqd  BIT            NOT NULL DEFAULT 1,
  inspection_done  BIT            NOT NULL DEFAULT 0,
  inspect_by       INT            NULL REFERENCES dbo.Users(user_id),
  inspect_result   NVARCHAR(20)   NULL
    CHECK (inspect_result IN ('ACCEPT','REJECT','CONDITIONAL',NULL)),
  grn_notes        NVARCHAR(MAX)  NULL,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACCEPTED','REJECTED','QUARANTINE')),
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── GRN Line Items ────────────────────────────────────────────
CREATE TABLE dbo.GrnLine (
  grn_line_id      INT IDENTITY(1,1) PRIMARY KEY,
  grn_id           INT            NOT NULL REFERENCES dbo.GoodsReceivingNote(grn_id),
  line_seq         INT            NOT NULL DEFAULT 1,
  part_id          INT            NULL REFERENCES dbo.PartMaster(part_id),
  description      NVARCHAR(300)  NOT NULL,
  qty_ordered      DECIMAL(12,3)  NULL,
  qty_received     DECIMAL(12,3)  NOT NULL DEFAULT 0,
  qty_accepted     DECIMAL(12,3)  NOT NULL DEFAULT 0,
  unit_of_measure  NVARCHAR(20)   NOT NULL DEFAULT 'EA',
  batch_lot_no     NVARCHAR(100)  NULL,
  expiry_date      DATE           NULL,
  condition        NVARCHAR(20)   NOT NULL DEFAULT 'GOOD'
    CHECK (condition IN ('GOOD','DAMAGED','SHORTAGE','OVER_DELIVERED'))
);
GO

-- ── Delivery Order ────────────────────────────────────────────
CREATE TABLE dbo.DeliveryOrder (
  do_id            INT IDENTITY(1,1) PRIMARY KEY,
  do_ref           NVARCHAR(20)   NOT NULL UNIQUE,   -- DO-2026-0001
  customer_id      INT            NOT NULL REFERENCES dbo.Customer(customer_id),
  review_id        INT            NULL REFERENCES dbo.ContractReview(review_id),
  delivery_date    DATE           NULL,
  shipped_date     DATETIME2      NULL,
  shipping_method  NVARCHAR(50)   NULL,
  tracking_number  NVARCHAR(100)  NULL,
  status           NVARCHAR(20)   NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','READY','SHIPPED','DELIVERED','CANCELLED')),
  delivery_address NVARCHAR(500)  NULL,
  prepared_by      INT            NOT NULL REFERENCES dbo.Users(user_id),
  released_by      INT            NULL REFERENCES dbo.Users(user_id),
  released_at      DATETIME2      NULL,
  do_notes         NVARCHAR(MAX)  NULL,
  is_active        BIT            NOT NULL DEFAULT 1,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- ── DO Line Items ─────────────────────────────────────────────
CREATE TABLE dbo.DeliveryOrderLine (
  do_line_id       INT IDENTITY(1,1) PRIMARY KEY,
  do_id            INT            NOT NULL REFERENCES dbo.DeliveryOrder(do_id),
  line_seq         INT            NOT NULL DEFAULT 1,
  part_id          INT            NULL REFERENCES dbo.PartMaster(part_id),
  description      NVARCHAR(300)  NOT NULL,
  quantity         DECIMAL(12,3)  NOT NULL DEFAULT 1,
  unit_of_measure  NVARCHAR(20)   NOT NULL DEFAULT 'EA',
  serial_numbers   NVARCHAR(500)  NULL
);
GO

-- ── Auto-number sequence helper ───────────────────────────────
CREATE TABLE dbo.Mod09Sequence (
  seq_key   NVARCHAR(20) NOT NULL PRIMARY KEY,
  last_num  INT          NOT NULL DEFAULT 0
);
GO
INSERT INTO dbo.Mod09Sequence (seq_key, last_num) VALUES
  ('CUSTOMER', 0), ('QUOTATION', 0), ('CONTRACT_REVIEW', 0),
  ('GRN', 0), ('DELIVERY_ORDER', 0);
GO

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IX_Customer_Code     ON dbo.Customer(customer_code);
CREATE INDEX IX_Quotation_Status  ON dbo.Quotation(status, is_active);
CREATE INDEX IX_ContractReview_Status ON dbo.ContractReview(status, is_active);
CREATE INDEX IX_GRN_Date          ON dbo.GoodsReceivingNote(received_date, is_active);
CREATE INDEX IX_DO_Status         ON dbo.DeliveryOrder(status, is_active);
GO

PRINT 'Migration 009 — MOD-09 Sales & Customer Service complete.';
