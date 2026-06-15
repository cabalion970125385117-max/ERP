-- MOD-12: Purchasing & Supplier/AVL Management
-- AS9100D §8.4 | Counterfeit Prevention | Customer-Directed Sources
-- Migration 018

CREATE TABLE Supplier (
    supplier_id             INT IDENTITY(1,1) PRIMARY KEY,
    supplier_code           NVARCHAR(20)   NOT NULL UNIQUE,
    name                    NVARCHAR(200)  NOT NULL,
    contact_name            NVARCHAR(100),
    email                   NVARCHAR(200),
    phone                   NVARCHAR(50),
    address                 NVARCHAR(500),
    approval_status         NVARCHAR(20)   NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('APPROVED','CONDITIONAL','SUSPENDED','BLACKLISTED')),
    avl_scope               NVARCHAR(500),
    accreditation_body      NVARCHAR(200),
    accreditation_ref       NVARCHAR(100),
    accreditation_expiry    DATE,
    performance_score       INT CHECK (performance_score BETWEEN 0 AND 100),
    notes                   NVARCHAR(MAX),
    created_by              INT REFERENCES Users(user_id),
    created_at              DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    is_active               BIT            NOT NULL DEFAULT 1
);

CREATE TABLE PurchaseRequisition (
    pr_id               INT IDENTITY(1,1) PRIMARY KEY,
    pr_number           NVARCHAR(20)  NOT NULL UNIQUE,
    raised_by           INT           NOT NULL REFERENCES Users(user_id),
    item_description    NVARCHAR(500) NOT NULL,
    qty                 DECIMAL(10,3) NOT NULL,
    unit                NVARCHAR(20)  NOT NULL,
    required_date       DATE          NOT NULL,
    supplier_id         INT REFERENCES Supplier(supplier_id),
    estimated_cost      DECIMAL(12,2),
    justification       NVARCHAR(MAX),
    status              NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PO_RAISED','FULFILLED','CANCELLED')),
    approved_by         INT REFERENCES Users(user_id),
    approved_at         DATETIME2,
    notes               NVARCHAR(MAX),
    created_by          INT REFERENCES Users(user_id),
    created_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active           BIT           NOT NULL DEFAULT 1
);

CREATE TABLE PurchaseOrder (
    po_id                       INT IDENTITY(1,1) PRIMARY KEY,
    po_number                   NVARCHAR(20)   NOT NULL UNIQUE,
    pr_id                       INT REFERENCES PurchaseRequisition(pr_id),
    supplier_id                 INT            NOT NULL REFERENCES Supplier(supplier_id),
    line_items                  NVARCHAR(MAX),  -- JSON array
    flowdown_requirements       NVARCHAR(MAX),
    right_of_access             BIT            NOT NULL DEFAULT 0,
    customer_directed_source    BIT            NOT NULL DEFAULT 0,
    total_value                 DECIMAL(12,2),
    status                      NVARCHAR(20)   NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','ACKNOWLEDGED','RECEIVED','CLOSED','CANCELLED')),
    issued_by                   INT REFERENCES Users(user_id),
    issued_at                   DATETIME2,
    created_by                  INT REFERENCES Users(user_id),
    created_at                  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    updated_at                  DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    is_active                   BIT            NOT NULL DEFAULT 1
);

CREATE TABLE Mod12Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod12Sequence VALUES (0, 0);
