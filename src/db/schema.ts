import db from './database.js'

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS race_sessions (
      id          TEXT    PRIMARY KEY,
      started_at  INTEGER NOT NULL,
      ended_at    INTEGER,               -- NULL while active
      mode        TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS laps (
      id               TEXT    PRIMARY KEY,
      race_session_id  TEXT    NOT NULL REFERENCES race_sessions(id),
      pilot_name       TEXT,                                  -- NULL until pilot is known
      lap_time_ms      INTEGER,
      gate_count       INTEGER NOT NULL,
      started_at       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gate_events (
      id               TEXT       PRIMARY KEY,
      gate_id          INTEGER    NOT NULL,
      race_session_id  TEXT       REFERENCES race_sessions(id),  -- NULL if triggered outside a session
      lap_id           TEXT       REFERENCES laps(id),           -- NULL if not part of a lap
      pilot_name       TEXT,                                     -- NULL if pilot unknown
      beam_x           INTEGER NOT NULL,
      beam_y           INTEGER NOT NULL,
      triggered_at     INTEGER NOT NULL,                         -- ns relative to lap start (0 for first gate)
      interval_ms      INTEGER NOT NULL DEFAULT 0                -- ms since previous gate (0 for first gate)
    );

    -- Indexes for the most common lookups
    CREATE INDEX IF NOT EXISTS idx_laps_race_session    ON laps(race_session_id);
    CREATE INDEX IF NOT EXISTS idx_gate_events_lap      ON gate_events(lap_id);
    CREATE INDEX IF NOT EXISTS idx_gate_events_session  ON gate_events(race_session_id);
  `)
}