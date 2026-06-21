import db from "../../db/database.js";
import { RaceSessionRow } from "./race-session.types.js";

export class RaceSessionDao {
  create(row: RaceSessionRow): void {
    db.prepare(`
      INSERT INTO race_sessions (id, started_at, ended_at, mode) VALUES (?, ?, ?, ?)
    `).run(row.id, row.started_at, row.ended_at, row.mode)
  }

  getById(raceSessionId: string): (RaceSessionRow | undefined) {
    return db.prepare(`
      SELECT * FROM race_sessions WHERE id = ?
    `).get(raceSessionId) as RaceSessionRow | undefined
  }

  getActive(): (RaceSessionRow | undefined) {
    return db.prepare(`
      SELECT * FROM race_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1
    `).get() as RaceSessionRow | undefined
  }

  end(raceSessionId: string, endedAt: number): void {
    db.prepare(`
      UPDATE race_sessions SET ended_at = ? WHERE id = ?
    `).run(endedAt, raceSessionId)
  }

  endAll(): void {
    db.prepare(`
      UPDATE race_sessions SET ended_at = ? WHERE ended_at IS NULL AND started_at IS NOT NULL
    `).run(Date.now())
  }
}