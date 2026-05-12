-- Run this in: Supabase dashboard → SQL Editor → New query → Run

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  jira_account_id VARCHAR(100),
  role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL CHECK (source IN ('fathom', 'manual')),
  title VARCHAR(500) NOT NULL,
  body TEXT,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'completed')),
  assigned_to UUID REFERENCES users(id),
  fathom_link VARCHAR(500),
  fathom_meeting_id VARCHAR(100),
  linked_jira_key VARCHAR(20),
  meeting_date DATE,
  meeting_title VARCHAR(300),
  dedup_key VARCHAR(255) UNIQUE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_issue_key VARCHAR(20),
  reminder_id UUID REFERENCES reminders(id),
  author_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jira_issues_cache (
  issue_key VARCHAR(20) PRIMARY KEY,
  data JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_dedup_key ON reminders(dedup_key);
CREATE INDEX idx_notes_jira_issue_key ON notes(jira_issue_key);
CREATE INDEX idx_jira_cache_synced_at ON jira_issues_cache(synced_at);

-- Seed users
INSERT INTO users (name, email, jira_account_id, role) VALUES
('Jesus Rincon', 'jrincon@heuristyc.com', '712020:440220cd-0562-489b-bf5d-2903f49d6e4c', 'admin'),
('David Corredor', 'david@heuristyc.com', '633cccebfedc6169aed95b48', 'viewer');

-- Seed config
INSERT INTO config (key, value) VALUES
('excluded_projects', '["CST", "HP", "HR", "ARQ", "EOSCOMP"]'),
('alert_rules', '{"inactivity_days": 7, "highlight_awaiting_approval": true, "highlight_high_priority": true}'),
('sync_interval_minutes', '10'),
('routine_last_sweep', '"2026-04-20T07:00:00Z"');
