-- Esquema de la base de datos para el control de horas de pasantía.

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(180) NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  required_hours INTEGER NOT NULL DEFAULT 320 CHECK (required_hours >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un día de pasantía: agrupa varios segmentos de trabajo.
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

-- Cada tramo horario dentro de un día (por ejemplo, 07:00–10:00).
CREATE TABLE IF NOT EXISTS work_segments (
  id         SERIAL PRIMARY KEY,
  day_id     INTEGER NOT NULL REFERENCES work_days(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_work_days_user_date
  ON work_days (user_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_work_segments_day
  ON work_segments (day_id);
