import RaceSessionHandler from '../ws/RaceSessionHandler.js'
import db from './database.js'
import { v4 as uuid } from 'uuid'

export type RaceSession = {
  id: string
  started_at: number
  ended_at: number | null,
  mode: "time_trial" | "set" | "race"
}

export type Lap = {
  id: string
  race_session_id: string // Reference session id
  pilot_name: string // (Nullable)
  lap_time_ms: number | null // Duration of lap (nullable)
  gate_count: number
  started_at: number // Timestamp of beginning
  // Status, if no lap time it's either DNF or active, most recent is active
}

export type RichGateEvent = {
  color?: "purple" | "yellow" | "green" | "red" | "neutral"
  prev_split_diff_ms?: number // Difference in interval from previous gate hit
  best_split_diff_ms?: number // Difference in interval from best gate
  best_session_split_diff_ms?: number // Difference in interval from previous gate
} & GateEvent

export type GateEvent = {
  id: string // UUID
  gate_id: number // Number
  race_session_id: string // Reference to active race session (nullable)
  lap_id: string // Reference to active lap (nullable)
  pilot_name: string // Reference to selected pilot (nullable)
  beam_x: number
  beam_y: number
  triggered_at: number // Timestamp (ns) relative to lap (first gate is 0)
  interval_ms: number  // Amount of ms since previous gate (first gate is 0)
}

export default class RaceRegistry {
  
  // --- Race Sessions ---
  static getSession(raceSessionId: string): (RaceSession | undefined) {
    return db.prepare(`
      SELECT * FROM race_sessions WHERE id = ?
    `).get(raceSessionId) as RaceSession | undefined
  }

  static getActiveRaceSession(): (RaceSession | undefined) {
    return db.prepare(`
      SELECT * FROM race_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1
    `).get() as RaceSession | undefined
  }

  static startRaceSession(): RaceSession {
    const activeSession = this.getActiveRaceSession();
    if (activeSession) {
      throw new Error(`Already an on-going race session.`);
    }

    console.log("Starting race session...");

    const session: RaceSession = {
      id: uuid(),
      started_at: Date.now(),
      ended_at: null,
      mode: "time_trial"
    };

    db.prepare(`
      INSERT INTO race_sessions (id, started_at, mode) VALUES (?, ?, ?)
    `).run(session.id, session.started_at, session.mode)

    return session;
  }

  static endRaceSession(): void {
    const activeSession = this.getActiveRaceSession();
    if (!activeSession) {
      // throw new Error(`No on-going race session found.`);
      return;
    }

    console.log("Ending race session...");

    RaceSessionHandler.sessionsPerPilot.clear;
    RaceSessionHandler.activeLapPerPilot.clear;
    RaceSessionHandler.previousGateEventPerPilot.clear;

    db.prepare(`
      UPDATE race_sessions SET ended_at = ? WHERE id = ?
    `).run(Date.now(), activeSession.id)
  }

  static endAllRaceSessions(): void {
    db.prepare(`
      UPDATE race_sessions SET ended_at = ? WHERE ended_at IS NULL AND started_at IS NOT NULL
    `).run(Date.now())
  }

  // --- Laps ---
  static startLap(sessionId: string, pilot: string, gateCount: number): Lap {
    const lap: Lap = {
      id: uuid(),
      race_session_id: sessionId,
      pilot_name: pilot,
      gate_count: gateCount,
      started_at: Date.now(),
      lap_time_ms: null
    }

    db.prepare(`
      INSERT INTO laps (id, race_session_id, pilot_name, gate_count, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(lap.id, lap.race_session_id, lap.pilot_name, lap.gate_count, lap.started_at);

    return lap;
  }

  static completeLap(lapId: string, lapTime: number) {
    db.prepare(`
      UPDATE laps SET lap_time_ms = ? WHERE id = ?  
    `).run(lapTime, lapId);
  }

  static getLapsForRace(sessionId: string): Lap[] {
    return db.prepare(`
      SELECT * FROM laps WHERE race_session_id = ? ORDER BY started_at ASC
    `).all(sessionId) as Lap[]
  }

  // Get most recent active lap from pilot
  static getPilotActiveLap(pilotName: string) {
    return db.prepare(`
      SELECT * FROM laps WHERE pilot_name = ? AND lap_time_ms IS NULL ORDER BY started_at DESC LIMIT 1
    `).get(pilotName) as Lap | null
  }

  static getActiveLap(pilotName: string, sessionId: string) {
    return db.prepare(`
      SELECT * FROM laps WHERE pilot_name = ? AND race_session_id = ? AND lap_time_ms IS NULL ORDER BY started_at DESC LIMIT 1
    `).get(pilotName, sessionId) as Lap | null
  }

  static getFastestLap(pilotName: string) {
    return db.prepare(`
      SELECT * FROM laps WHERE pilot_name = ? AND lap_time_ms IS NOT NULL ORDER BY lap_time_ms ASC LIMIT 1
    `).get(pilotName) as Lap | null
  }

  // --- Gate Events ---
  static recordGateEvent(event: GateEvent) {
    db.prepare(`
      INSERT INTO gate_events (id, gate_id, race_session_id, lap_id, pilot_name, beam_x, beam_y, triggered_at, interval_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuid(), event.gate_id, event.race_session_id, event.lap_id,
        event.pilot_name, event.beam_x, event.beam_y, event.triggered_at, event.interval_ms)
  }

  static getPreviousGateEvent(sessionId: string, pilotName: string): GateEvent | null {
    return db.prepare(`
      SELECT * FROM gate_events WHERE race_session_id = ? AND pilot_name = ? ORDER BY triggered_at DESC LIMIT 1
    `).get(sessionId, pilotName) as GateEvent | null
  }

  
  // Assign a color (purple / yellow / green) to gate and diff from previous lap gate
  static enrichData(gateEvent: GateEvent): RichGateEvent {
    try {
      // Get all laps from pilot with same lap id (not same session id) (purple will mean PERSONAL best across all 
      // sessions. this might change in the future if multiplayer is supported)

      // Get the one with the lowest interval (exclude 0 ms)

      if (gateEvent.interval_ms === 0) return gateEvent; // Don't enrich first gate (no reference stats)

      // === PILOT'S ALL TIME FASTEST SPLIT ===
      const fastestSplit = db.prepare(`
        SELECT * FROM gate_events WHERE gate_id = ? AND pilot_name = ? AND interval_ms != 0 ORDER BY interval_ms ASC LIMIT 1`
      ).get(gateEvent.gate_id, gateEvent.pilot_name) as GateEvent | null
      const best_split_diff_ms = fastestSplit ? gateEvent.interval_ms - fastestSplit.interval_ms : undefined;

      // === PILOT'S CURRENT SESSION FASTEST SPLIT ===
      const fastestSplitOfSession = db.prepare(`
        SELECT * FROM gate_events WHERE gate_id = ? AND pilot_name = ? AND race_session_id = ? AND interval_ms != 0 ORDER BY interval_ms ASC LIMIT 1`
      ).get(gateEvent.gate_id, gateEvent.pilot_name, gateEvent.race_session_id) as GateEvent | null
      const best_session_split_diff_ms = fastestSplitOfSession ? gateEvent.interval_ms - fastestSplitOfSession.interval_ms : undefined;
      
      // === PILOT'S PREVIOUS SPLIT ===
      const mostRecentSplit = db.prepare(`
        SELECT * FROM gate_events WHERE gate_id = ? AND pilot_name = ? AND race_session_id = ? AND interval_ms != 0 ORDER BY triggered_at DESC LIMIT 1`
      ).get(gateEvent.gate_id, gateEvent.pilot_name, gateEvent.race_session_id) as GateEvent | null
      const prev_split_diff_ms = mostRecentSplit ? gateEvent.interval_ms - mostRecentSplit.interval_ms : undefined;

      let color: "neutral" | "purple" | "yellow" | "green" = "neutral"

      if (best_split_diff_ms === undefined || best_split_diff_ms < 0) {
        color = "purple" // Pilot's all time fastest split for gate
      } else if (best_session_split_diff_ms === undefined || best_session_split_diff_ms < 0) {
        color = "green" // Pilot's best split in session for gate
      } else {
        color = "yellow"
      }
      
      return { ...gateEvent, color, best_split_diff_ms, best_session_split_diff_ms, prev_split_diff_ms }
    } catch (e) {
      console.log(`Failed to enrich gate event. ` + e)
      return gateEvent;
    }
  }
}