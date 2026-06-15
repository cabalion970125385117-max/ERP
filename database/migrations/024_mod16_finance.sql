-- MOD-16: Finance (GL, AR/AP, Cost Accounting, Assets, Budget)
-- AS9100D §7.1.1 (resources) | SoR §11
-- Migration 024

-- Chart of Accounts
CREATE TABLE Account (
    account_id      INT IDENTITY(1,1) PRIMARY KEY,
    account_code    NVARCHAR(20)  NOT NULL UNIQUE,
    name            NVARCHAR(200) NOT NULL,
    type            NVARCHAR(20)  NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','COST_OF_SALES')),
    parent_id       INT REFERENCES Account(account_id),
    is_active       BIT           NOT NULL DEFAULT 1
);

-- Seed chart of accounts
INSERT INTO Account (account_code, name, type) VALUES
    ('1000', 'Cash & Bank', 'ASSET'),
    ('1100', 'Accounts Receivable', 'ASSET'),
    ('1200', 'Inventory', 'ASSET'),
    ('1500', 'Fixed Assets', 'ASSET'),
    ('2000', 'Accounts Payable', 'LIABILITY'),
    ('2100', 'Accruals', 'LIABILITY'),
    ('3000', 'Retained Earnings', 'EQUITY'),
    ('4000', 'Revenue - NDT Services', 'REVENUE'),
    ('4100', 'Revenue - Special Process', 'REVENUE'),
    ('5000', 'Cost of Sales - Labour', 'COST_OF_SALES'),
    ('5100', 'Cost of Sales - Materials', 'COST_OF_SALES'),
    ('6000', 'Operating Expenses', 'EXPENSE'),
    ('6100', 'Maintenance Expenses', 'EXPENSE');

-- Journal Entry Header
CREATE TABLE JournalEntry (
    entry_id        INT IDENTITY(1,1) PRIMARY KEY,
    entry_number    NVARCHAR(20)  NOT NULL UNIQUE,
    entry_date      DATE          NOT NULL,
    description     NVARCHAR(500) NOT NULL,
    reference       NVARCHAR(100),
    status          NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','REVERSED')),
    posted_by       INT REFERENCES Users(user_id),
    posted_at       DATETIME2,
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1
);

-- Journal Entry Lines
CREATE TABLE JournalLine (
    line_id         INT IDENTITY(1,1) PRIMARY KEY,
    entry_id        INT           NOT NULL REFERENCES JournalEntry(entry_id),
    account_id      INT           NOT NULL REFERENCES Account(account_id),
    debit           DECIMAL(14,2) NOT NULL DEFAULT 0,
    credit          DECIMAL(14,2) NOT NULL DEFAULT 0,
    description     NVARCHAR(300)
);

-- Accounts Receivable Invoice
CREATE TABLE ArInvoice (
    invoice_id      INT IDENTITY(1,1) PRIMARY KEY,
    invoice_number  NVARCHAR(20)  NOT NULL UNIQUE,
    customer_name   NVARCHAR(200) NOT NULL,
    customer_id     INT REFERENCES Customer(customer_id),
    do_id           INT REFERENCES DeliveryOrder(do_id),
    invoice_date    DATE          NOT NULL,
    due_date        DATE          NOT NULL,
    amount_sgd      DECIMAL(14,2) NOT NULL,
    gst_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(14,2) NOT NULL,
    status          NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','PAID','OVERDUE','VOID')),
    paid_at         DATETIME2,
    notes           NVARCHAR(MAX),
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1
);

-- Accounts Payable Invoice
CREATE TABLE ApInvoice (
    invoice_id      INT IDENTITY(1,1) PRIMARY KEY,
    invoice_number  NVARCHAR(20)  NOT NULL UNIQUE,
    supplier_id     INT           NOT NULL REFERENCES Supplier(supplier_id),
    po_id           INT REFERENCES PurchaseOrder(po_id),
    invoice_date    DATE          NOT NULL,
    due_date        DATE          NOT NULL,
    amount_sgd      DECIMAL(14,2) NOT NULL,
    gst_amount      DECIMAL(14,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(14,2) NOT NULL,
    status          NVARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','PAID','OVERDUE','VOID')),
    paid_at         DATETIME2,
    notes           NVARCHAR(MAX),
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1
);

-- Fixed Asset Register
CREATE TABLE FixedAsset (
    asset_id            INT IDENTITY(1,1) PRIMARY KEY,
    asset_code          NVARCHAR(20)  NOT NULL UNIQUE,
    name                NVARCHAR(200) NOT NULL,
    category            NVARCHAR(100),
    purchase_date       DATE          NOT NULL,
    purchase_cost       DECIMAL(14,2) NOT NULL,
    useful_life_years   INT           NOT NULL,
    residual_value      DECIMAL(14,2) NOT NULL DEFAULT 0,
    depreciation_method NVARCHAR(20)  NOT NULL DEFAULT 'STRAIGHT_LINE' CHECK (depreciation_method IN ('STRAIGHT_LINE','DECLINING_BALANCE')),
    accumulated_depn    DECIMAL(14,2) NOT NULL DEFAULT 0,
    net_book_value      DECIMAL(14,2) NOT NULL,
    status              NVARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISPOSED','WRITTEN_OFF')),
    account_id          INT REFERENCES Account(account_id),
    notes               NVARCHAR(MAX),
    created_by          INT REFERENCES Users(user_id),
    created_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active           BIT           NOT NULL DEFAULT 1
);

-- Budget
CREATE TABLE Budget (
    budget_id       INT IDENTITY(1,1) PRIMARY KEY,
    budget_year     INT           NOT NULL,
    department      NVARCHAR(200) NOT NULL,
    account_id      INT           NOT NULL REFERENCES Account(account_id),
    annual_budget   DECIMAL(14,2) NOT NULL,
    q1_budget       DECIMAL(14,2),
    q2_budget       DECIMAL(14,2),
    q3_budget       DECIMAL(14,2),
    q4_budget       DECIMAL(14,2),
    notes           NVARCHAR(MAX),
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1,
    UNIQUE (budget_year, department, account_id)
);

CREATE TABLE Mod16Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod16Sequence VALUES (0, 0);
