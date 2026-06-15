-- MOD-18: Organisation & HR Management
-- AS9100D §7.2, §7.3
-- Migration 020

CREATE TABLE OrgEntity (
    entity_id           INT IDENTITY(1,1) PRIMARY KEY,
    entity_name         NVARCHAR(200) NOT NULL,
    division            NVARCHAR(200),
    department          NVARCHAR(200),
    team                NVARCHAR(200),
    parent_entity_id    INT REFERENCES OrgEntity(entity_id),
    is_active           BIT NOT NULL DEFAULT 1
);

-- Seed root entity
INSERT INTO OrgEntity (entity_name, division, department) VALUES ('ATC Aviation Pte Ltd', 'NDT & Special Process', 'Quality Assurance');

CREATE TABLE StaffRecord (
    staff_id                        INT IDENTITY(1,1) PRIMARY KEY,
    employee_id                     NVARCHAR(20)  NOT NULL UNIQUE,
    user_id                         INT REFERENCES Users(user_id),
    entity_id                       INT           NOT NULL REFERENCES OrgEntity(entity_id),
    full_name                       NVARCHAR(200) NOT NULL,
    job_title                       NVARCHAR(200) NOT NULL,
    department                      NVARCHAR(200),
    employment_type                 NVARCHAR(20)  NOT NULL DEFAULT 'PERMANENT' CHECK (employment_type IN ('PERMANENT','CONTRACT','PART_TIME','INTERN')),
    employment_date                 DATE          NOT NULL,
    probation_end_date              DATE,
    status                          NVARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RESIGNED','TERMINATED','ON_LEAVE')),
    onboarding_complete             BIT           NOT NULL DEFAULT 0,
    conflict_of_interest_declared   BIT           NOT NULL DEFAULT 0,
    conflict_of_interest_date       DATE,
    emergency_contact_name          NVARCHAR(200),
    emergency_contact_phone         NVARCHAR(50),
    notes                           NVARCHAR(MAX),
    created_by                      INT REFERENCES Users(user_id),
    created_at                      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    updated_at                      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    is_active                       BIT           NOT NULL DEFAULT 1
);

CREATE TABLE Mod18Sequence (last_num INT NOT NULL DEFAULT 0, year INT NOT NULL DEFAULT 0);
INSERT INTO Mod18Sequence VALUES (0, 0);
