import db from "../../db/database.js";
import { LapRow } from "./lap.types.js";

export class LapDao {
  create(row: LapRow): void {
    db.prepare(`
      INSERT INTO laps (id, race_session_id, pilot_name, lap_time_ms, gate_count, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(row.id, row.race_session_id, row.pilot_name, row.lap_time_ms, row.gate_count, row.started_at);
  }

  complete(lapId: string, lapTime: number): void {
    db.prepare(`
      UPDATE laps SET lap_time_ms = ? WHERE id = ?  
    `).run(lapTime, lapId);
  }

  /**
   * Get the laps in a given race session.
   * @param raceSessionId - Race session id to get laps for.
   * @returns List of laps in race session in ascending order.
   */
  getByRaceSessionId(raceSessionId: string): LapRow[] {
    return db.prepare(`
      SELECT * FROM laps WHERE race_session_id = ? ORDER BY started_at ASC
    `).all(raceSessionId) as LapRow[]
  }

  /**
   * Get the COMPLETED laps in a given race session.
   * @param raceSessionId - Race session id to get laps for.
   * @returns List of completed laps in race session in ascending order.
   */
  getCompletedByRaceSessionId(raceSessionId: string): LapRow[] {
    return db.prepare(`
      SELECT * FROM laps WHERE race_session_id = ? AND lap_time_ms IS NOT NULL ORDER BY started_at ASC
    `).all(raceSessionId) as LapRow[]
  }

  getActiveLap(raceSessionId: string, pilotName: string): LapRow | undefined {
    return db.prepare(`
      SELECT * FROM laps WHERE pilot_name = ? AND race_session_id = ? AND lap_time_ms IS NULL ORDER BY started_at DESC LIMIT 1
    `).get(pilotName, raceSessionId) as LapRow | undefined
  }

  getFastestLapByPilot(pilotName: string): LapRow | undefined {
    return db.prepare(`
      SELECT * FROM laps WHERE pilot_name = ? AND lap_time_ms IS NOT NULL ORDER BY lap_time_ms ASC LIMIT 1
    `).get(pilotName) as LapRow | undefined
  }
}