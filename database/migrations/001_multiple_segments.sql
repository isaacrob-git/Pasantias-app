-- Migración: de una jornada por día a varios segmentos por día.
-- Conserva los datos existentes de la tabla "entries".

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS required_hours INTEGER NOT NULL DEFAULT 320;

CREATE TABLE IF NOT EXISTS work_days (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date     DATE NOT NULL,
  break_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  total_minutes INTEGER NOT NULL CHECK (total_minutes > 0),
  notes         VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, work_date)
);

CREATE TABLE IF NOT EXISTS work_segments (
  id         SERIAL PRIMARY KEY,
  day_id     INTEGER NOT NULL REFERENCES work_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  CHECK (end_time > start_time)
);

DO $$
BEGIN
  IF to_regclass('public.entries') IS NOT NULL THEN
    -- Cada registro anterior se convierte en un día con un único segmento.
    INSERT INTO work_days
      (user_id, work_date, break_minutes, total_minutes, notes, created_at, updated_at)
    SELECT
      user_id, work_date, break_minutes, total_minutes, notes, created_at, updated_at
    FROM entries
    ON CONFLICT (user_id, work_date) DO NOTHING;

    INSERT INTO work_segments (day_id, start_time, end_time)
    SELECT d.id, e.start_time, e.end_time
    FROM entries e
    JOIN work_days d
      ON d.user_id = e.user_id
     AND d.work_date = e.work_date
    WHERE NOT EXISTS (
      SELECT 1
      FROM work_segments s
      WHERE s.day_id = d.id
        AND s.start_time = e.start_time
        AND s.end_time = e.end_time
    );
  END IF;
END $$;

DROP TABLE IF EXISTS entries;

CREATE INDEX IF NOT EXISTS idx_work_days_user_date
  ON work_days (user_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_work_segments_day
  ON work_segments (day_id);

COMMIT;
