import db from "../../db/database.js";
import { GateEventRow } from "./gate-event.types.js";

export class GateEventDao {
  create(row: GateEventRow): void {
    db.prepare(`
      INSERT INTO gate_events (id, gate_id, race_session_id, lap_id, pilot_name, beam_x, beam_y, triggered_at, interval_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.gate_id, row.race_session_id, row.lap_id,
        row.pilot_name, row.beam_x, row.beam_y, row.triggered_at, row.interval_ms)
  }

  getPreviousGate(raceSessionId: string, pilotName: string): GateEventRow | undefined {
    return db.prepare(`
      SELECT * FROM gate_events WHERE race_session_id = ? AND pilot_name = ? ORDER BY triggered_at DESC LIMIT 1
    `).get(raceSessionId, pilotName) as GateEventRow | undefined
  }

  /**
   * PILOT'S ALL TIME FASTEST SPLIT
   * @param gateId 
   * @param pilotName 
   * @returns 
   */
  getAllTimeFastestGateEvent(gateId: number, pilotName: string): GateEventRow | undefined {
    return db.prepare(`
      SELECT * FROM gate_events WHERE gate_id = ? AND pilot_name = ? AND interval_ms != 0 ORDER BY interval_ms ASC LIMIT 1`
    ).get(gateId, pilotName) as GateEventRow | undefined
  }

  /**
   * PILOT'S CURRENT SESSION FASTEST SPLIT
   * @param gateId 
   * @param pilotName 
   * @param raceSessionId 
   * @returns 
   */
  getSessionFastestGateEvent(gateId: number, pilotName: string, raceSessionId: string): GateEventRow | undefined {
    return db.prepare(`
      SELECT * FROM gate_events WHERE gate_id = ? AND pilot_name = ? AND race_session_id = ? AND interval_ms != 0 ORDER BY interval_ms ASC LIMIT 1`
    ).get(gateId, pilotName, raceSessionId) as GateEventRow | undefined
  }

  /**
   * PILOT'S PREVIOUS SPLIT
   * @param gateId 
   * @param pilotName 
   * @param raceSessionId 
   * @returns 
   */
  getMostRecentGateEvent(gateId: number, pilotName: string, raceSessionId: string): GateEventRow | undefined {
    return db.prepare(`
      SELECT * FROM gate_events WHERE gate_id = ? AND pilot_name = ? AND race_session_id = ? AND interval_ms != 0 ORDER BY triggered_at DESC LIMIT 1`
    ).get(gateId, pilotName, raceSessionId) as GateEventRow | undefined
  }
}