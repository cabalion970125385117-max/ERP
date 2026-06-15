-- Migration 026: Chat System
-- WhatsApp-style internal messaging for ATCA-ERP
-- Supports direct messages (1-to-1) and group rooms

CREATE TABLE dbo.ChatRoom (
  room_id    INT IDENTITY(1,1) PRIMARY KEY,
  name       NVARCHAR(100)  NULL,               -- NULL for DIRECT rooms
  room_type  NVARCHAR(10)   NOT NULL DEFAULT 'DIRECT',  -- DIRECT | GROUP
  created_by INT            NOT NULL REFERENCES dbo.Users(user_id),
  created_at DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  is_active  BIT            NOT NULL DEFAULT 1
);

CREATE TABLE dbo.ChatParticipant (
  participant_id INT IDENTITY(1,1) PRIMARY KEY,
  room_id        INT NOT NULL REFERENCES dbo.ChatRoom(room_id),
  user_id        INT NOT NULL REFERENCES dbo.Users(user_id),
  joined_at      DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT uq_chat_participant UNIQUE (room_id, user_id)
);
CREATE INDEX ix_chatparticipant_user ON dbo.ChatParticipant(user_id);

CREATE TABLE dbo.ChatMessage (
  message_id INT IDENTITY(1,1) PRIMARY KEY,
  room_id    INT             NOT NULL REFERENCES dbo.ChatRoom(room_id),
  sender_id  INT             NOT NULL REFERENCES dbo.Users(user_id),
  body       NVARCHAR(2000)  NOT NULL,
  sent_at    DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  is_deleted BIT             NOT NULL DEFAULT 0
);
CREATE INDEX ix_chatmessage_room_sent ON dbo.ChatMessage(room_id, sent_at);
