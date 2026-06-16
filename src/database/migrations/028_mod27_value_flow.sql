-- =============================================================================
-- MOD-27: Value Flow Tracker
-- AS9100D §8.5 (Production & Service Provision) | Process Traceability
-- Migration: 028_mod27_value_flow.sql
-- Depends on: 014_mod13_work_order.sql (WorkOrder), 009_mod09_sales_customer_service.sql (GRN)
--
-- MOD-27 is a READ-ONLY visualisation module. It introduces no new tables.
-- The only schema change is an explicit GRN -> WorkOrder foreign key so the
-- value-flow lookup can resolve a GRN to its downstream job without relying on
-- free-text matching of WorkOrder.order_reference.
-- =============================================================================

USE ATCA_ERP_DB;
GO

-- ── Add grn_id FK to WorkOrder (idempotent) ──────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.WorkOrder') AND name = 'grn_id'
)
BEGIN
    ALTER TABLE dbo.WorkOrder
        ADD grn_id INT NULL
            CONSTRAINT FK_WorkOrder_Grn
            FOREIGN KEY REFERENCES dbo.GoodsReceivingNote(grn_id);
END
GO

-- ── Index for reverse lookup (GRN -> WO) ─────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_WorkOrder_GrnId' AND object_id = OBJECT_ID('dbo.WorkOrder')
)
BEGIN
    CREATE INDEX IX_WorkOrder_GrnId ON dbo.WorkOrder (grn_id) WHERE grn_id IS NOT NULL;
END
GO

-- ── Backfill: match existing free-text order_reference to grn_ref ─────────────
-- (safe — only fills rows where grn_id is still NULL and the match is unambiguous)
UPDATE wo
SET wo.grn_id = g.grn_id
FROM dbo.WorkOrder wo
JOIN dbo.GoodsReceivingNote g ON g.grn_ref = wo.order_reference
WHERE wo.grn_id IS NULL AND g.is_active = 1;
GO

PRINT 'Migration 028 — MOD-27 Value Flow Tracker (WorkOrder.grn_id) complete.';
