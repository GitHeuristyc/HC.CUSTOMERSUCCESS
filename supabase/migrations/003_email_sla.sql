-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- Email SLA: hilos de correo de clientes empujados por la routine de email.
-- El status (respondido/pendiente/en_riesgo/vencido) NO se persiste: lo deriva
-- el backend al leer, a partir de first_response_at + business_hours_elapsed
-- y la config `email_sla` vigente.

CREATE TABLE email_threads (
  thread_id              TEXT PRIMARY KEY,           -- conversationId de Outlook/Graph
  subject                TEXT NOT NULL DEFAULT '',
  sender_email           TEXT NOT NULL,
  sender_domain          TEXT NOT NULL,
  received_at            TIMESTAMPTZ NOT NULL,       -- primer mensaje entrante del hilo (UTC)
  first_response_at      TIMESTAMPTZ,                -- primer reply de @heuristyc.com; NULL = sin responder
  last_message_at        TIMESTAMPTZ NOT NULL,
  business_hours_elapsed DOUBLE PRECISION NOT NULL DEFAULT 0,
  business_hours_to_resolution DOUBLE PRECISION,     -- NULL si no resuelto
  resolved_at            TIMESTAMPTZ,                -- cuándo se consideró cerrado el hilo
  metadata               JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_threads_received_at ON email_threads(received_at);
CREATE INDEX idx_email_threads_pending ON email_threads(received_at)
  WHERE first_response_at IS NULL AND resolved_at IS NULL;

-- Seed config (defaults también viven en lib/config.ts)
INSERT INTO config (key, value) VALUES
('email_sla', '{
  "sla_target_hours": 24,
  "at_risk_threshold_hours": 20,
  "business_hours": { "days": [1, 2, 3, 4, 5], "start": "09:00", "end": "18:00" },
  "timezone": "America/New_York",
  "internal_domain": "heuristyc.com",
  "excluded_senders": ["no-reply", "noreply", "notifications@", "mailer-daemon", "donotreply"]
}');
