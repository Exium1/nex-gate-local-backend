import db from './database.js'

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS races (
      id          TEXT PRIMARY KEY,
      started_at  INTEGER NOT NULL,
      ended_at    INTEGER,
      status      TEXT NOT NULL DEFAULT 'active'  -- active | finished
    );

    CREATE TABLE IF NOT EXISTS laps (
      id          TEXT PRIMARY KEY,
      race_id     TEXT NOT NULL REFERENCES races(id),
      pilot_name  TEXT NOT NULL,
      lap_number  INTEGER NOT NULL,
      lap_time_ms INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gate_events (
      id          TEXT PRIMARY KEY,
      race_id     TEXT NOT NULL REFERENCES races(id),
      gate_id     TEXT NOT NULL,
      drone_id    TEXT NOT NULL,
      beam_index  INTEGER NOT NULL,
      triggered_at INTEGER NOT NULL
    );
  `)
}