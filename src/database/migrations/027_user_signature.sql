-- Migration 027: User Signature Photo
-- Stores base64-encoded signature image per user (for electronic sign-off)
-- Kept in Users table for single-join access; NVARCHAR(MAX) holds ~500KB base64

ALTER TABLE dbo.Users
  ADD signature_data NVARCHAR(MAX) NULL,
      signature_updated_at DATETIME2 NULL;
