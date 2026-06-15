-- MOD-14: Inventory Management
-- AS9100D §8.5.4 (customer property), §7.1.4 (environment)
-- Migration 019

CREATE TABLE InventoryItem (
    item_id                 INT IDENTITY(1,1) PRIMARY KEY,
    item_code               NVARCHAR(20)  NOT NULL UNIQUE,
    name                    NVARCHAR(200) NOT NULL,
    description             NVARCHAR(500),
    category                NVARCHAR(30)  NOT NULL CHECK (category IN ('CHEMICAL','CONSUMABLE','SPARE_PART','PPE','MATERIAL','TOOL')),
    unit                    NVARCHAR(20)  NOT NULL,
    location                NVARCHAR(200),
    reorder_level           DECIMAL(10,3) NOT NULL DEFAULT 0,
    current_stock           DECIMAL(10,3) NOT NULL DEFAULT 0,
    storage_conditions      NVARCHAR(200),
    hazardous_flag          BIT           NOT NULL DEFAULT 0,
    incompatible_materials  NVARCHAR(500),
    sds_ref                 NVARCHAR(100),
    shelf_life_days         INT,
    supplier_id             INT REFERENCES Supplier(supplier_id),
    unit_cost               DECIMAL(10,2),
    created_by              INT REFERENCES Users(user_id),
    created_at              DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at              DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active               BIT           NOT NULL DEFAULT 1
);

CREATE TABLE InventoryMovement (
    movement_id     INT IDENTITY(1,1) PRIMARY KEY,
    item_id         INT           NOT NULL REFERENCES InventoryItem(item_id),
    movement_type   NVARCHAR(20)  NOT NULL CHECK (movement_type IN ('RECEIPT','REQUEST','ISSUE','TRANSFER','DISPOSAL','ADJUSTMENT')),
    qty             DECIMAL(10,3) NOT NULL,
    lot_number      NVARCHAR(100),
    batch_ref       NVARCHAR(100),
    linked_wo_id    INT REFERENCES WorkOrder(work_order_id),
    moved_by        INT           NOT NULL REFERENCES Users(user_id),
    moved_at        DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    notes           NVARCHAR(MAX),
    is_active       BIT           NOT NULL DEFAULT 1
);

CREATE TABLE StockCount (
    count_id        INT IDENTITY(1,1) PRIMARY KEY,
    count_date      DATE          NOT NULL,
    counted_by      INT           NOT NULL REFERENCES Users(user_id),
    status          NVARCHAR(20)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','COMPLETED')),
    notes           NVARCHAR(MAX),
    created_by      INT REFERENCES Users(user_id),
    created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active       BIT           NOT NULL DEFAULT 1
);

CREATE TABLE StockCountLine (
    line_id         INT IDENTITY(1,1) PRIMARY KEY,
    count_id        INT           NOT NULL REFERENCES StockCount(count_id),
    item_id         INT           NOT NULL REFERENCES InventoryItem(item_id),
    expected_qty    DECIMAL(10,3) NOT NULL DEFAULT 0,
    actual_qty      DECIMAL(10,3),
    variance        AS (actual_qty - expected_qty) PERSISTED,
    notes           NVARCHAR(MAX)
);

CREATE TABLE Mod14Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod14Sequence VALUES (0, 0);
