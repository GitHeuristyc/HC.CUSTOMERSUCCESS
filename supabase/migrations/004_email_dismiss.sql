-- Run this in: Supabase dashboard → SQL Editor → New query → Run
-- Dismiss manual de hilos de email: "este email no requiere respuesta".
-- Lo setea un usuario desde el panel (PATCH /api/email/threads); la routine
-- nunca escribe estas columnas (su upsert solo toca los campos de IngestRow),
-- así que el dismiss sobrevive a cada sync.

ALTER TABLE email_threads
  ADD COLUMN dismissed_at TIMESTAMPTZ,
  ADD COLUMN dismissed_by TEXT;
