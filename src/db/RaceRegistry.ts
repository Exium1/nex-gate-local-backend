import RaceSessionHandler from '../ws/RaceHandler.js'
import db from './database.js'
import { v4 as uuid } from 'uuid'

export type RaceSession = {
  id: string
  started_at: number
  ended_at: number | null
  pilot_name: string
}

export type Lap = {
  id: string
  race_session_id: string // Reference session id
  pilot_name: string // (Nullable)
  lap_time_ms?: number // Duration of lap (nullable)
  gate_count: number
  started_at: number // Timestamp of beginning
  // Status, if no lap time it's either DNF or active, most recent is active
}

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
  static getActiveRaceSession(pilot_name: string): (RaceSession | null) {
    return db.prepare(`
      SELECT * FROM race_sessions WHERE pilot_name = ? AND ended_at = null ORDER BY started_at DESC LIMIT 1
    `).get(pilot_name) as RaceSession | null
  }

  static startRaceSession(pilot_name: string): RaceSession {
    const actionSession = this.getActiveRaceSession(pilot_name);
    if (actionSession !== null && actionSession?.ended_at !== null) {
      throw new Error(`On-going race session for ${pilot_name}`);
    }

    const session: RaceSession = {
      id: uuid(),
      started_at: Date.now(),
      ended_at: null,
      pilot_name: pilot_name,
    };

    db.prepare(`
      INSERT INTO race_sessions (id, started_at, pilot_name) VALUES (?, ?, ?)
    `).run(session.id, session.started_at, session.pilot_name)

    return session;
  }

  static endRaceSession(pilot_name: string): void {
    const currentSession = this.getActiveRaceSession(pilot_name);

    if (currentSession == null || currentSession?.ended_at == null) {
      throw new Error(`No on-going race session found for ${pilot_name}`);
    }

    RaceSessionHandler.sessionsPerPilot.delete(pilot_name);

    db.prepare(`
      UPDATE race_sessions SET ended_at = ? WHERE id = ?
    `).run(Date.now(), currentSession.id)
  }

  // --- Laps ---
  static startLap(sessionId: string, pilot: string, gateCount: number): Lap {
    const lap: Lap = {
      id: uuid(),
      race_session_id: sessionId,
      pilot_name: pilot,
      gate_count: gateCount,
      started_at: Date.now(),
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
      SELECT * FROM laps WHERE pilot_name = ? AND lap_time_ms = null ORDER BY started_at DESC LIMIT 1
    `).get(pilotName) as Lap | null
  }

  static getActiveLap(pilotName: string, sessionId: string) {
    return db.prepare(`
      SELECT * FROM laps WHERE pilot_name = ? AND race_session_id = ? AND lap_time_ms = null ORDER BY started_at DESC LIMIT 1
    `).get(pilotName, sessionId) as Lap | null
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
}