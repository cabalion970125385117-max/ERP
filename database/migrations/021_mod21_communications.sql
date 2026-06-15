-- MOD-21: Communication & Announcement
-- AS9100D §7.3, §7.4
-- Migration 021

CREATE TABLE Announcement (
    announcement_id     INT IDENTITY(1,1) PRIMARY KEY,
    title               NVARCHAR(300) NOT NULL,
    body                NVARCHAR(MAX) NOT NULL,
    priority            NVARCHAR(20)  NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','IMPORTANT','URGENT')),
    target_roles        NVARCHAR(500),  -- comma-separated role names, NULL = all
    linked_doc_id       INT REFERENCES Document(doc_id),
    published_by        INT           NOT NULL REFERENCES Users(user_id),
    published_at        DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    expires_at          DATETIME2,
    is_active           BIT           NOT NULL DEFAULT 1
);

CREATE TABLE AnnouncementAck (
    ack_id              INT IDENTITY(1,1) PRIMARY KEY,
    announcement_id     INT           NOT NULL REFERENCES Announcement(announcement_id),
    user_id             INT           NOT NULL REFERENCES Users(user_id),
    acknowledged_at     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UNIQUE (announcement_id, user_id)
);

CREATE TABLE Mod21Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod21Sequence VALUES (0, 0);
