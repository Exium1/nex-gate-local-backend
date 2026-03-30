// src/db/RaceRepository.ts
import db from './database.js'
import { v4 as uuid } from 'uuid'

// type Race = {
//   id: string
//   started_at: number
//   ended_at: number | null
//   status: 'active' | 'finished'
// }

// type Users = {
//   id: string
//   pilot_name: string
// }

type RaceSession = {
  id: string
  started_at: number
  ended_at: number | null
  pilot_name: string
  laps: string[] // Reference ids
}

type Lap = {
  id: string
  status: 'incomplete' | 'active' | 'finished' // If rest of lap is skipped (retriggers if gate 0 is hit when not supposed to)
  race_session_id: string // Reference session id
  pilot_name: string // (Nullable)
  lap_time_ms: number // Duration of lap
  started_at: number // Timestamp of beginning
  gate_events: string[] // Reference ids
}

type GateEvent = {
  id: string // UUID
  gate_id: string // Number or string
  race_session_id: string // Reference to active race session (nullable)
  lap_id: string // Reference to active lap (nullable)
  pilot_name: string // Reference to selected pilot (nullable)
  beam_x: number
  beam_y: number
  triggered_at: number // Timestamp (ns) relative to lap (first gate is 0)
  interval_ms: number  // Amount of ms since previous gate (first gate is 0)
}

export default class RaceRepository {
  
  // --- Races ---
  static getActiveRaceSession(pilot_name: string): (RaceSession | null) {
    return null;
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
      laps: [],
    };

    this.userSessions.set(pilot_name, session);
    return session;
  }

  static endRaceSession(pilot_name: string): void {
    const currentSession = this.userSessions.get(pilot_name);

    if (currentSession == null || currentSession?.ended_at == null) {
      throw new Error(`No on-going race session found for ${pilot_name}`);
    }

    // db.prepare(`
      // UPDATE races SET ended_at = ?, status = 'finished' WHERE id = ? AND status = 'active'
    // `).run(Date.now(), raceId)
  }

  // static startRace(): Race {
  //   const race: Race = {
  //     id: uuid(),
  //     started_at: Date.now(),
  //     ended_at: null,
  //     status: 'active'
  //   }
  //   db.prepare(`
  //     INSERT INTO races (id, started_at, status) VALUES (?, ?, ?)
  //   `).run(race.id, race.started_at, race.status)
  //   return race
  // }

  // static endRace(raceId: string): boolean {
  //   const result = db.prepare(`
  //     UPDATE races SET ended_at = ?, status = 'finished' WHERE id = ? AND status = 'active'
  //   `).run(Date.now(), raceId)
  //   return result.changes > 0
  // }

  static getActiveRace(): Race | null {
    return db.prepare(`
      SELECT * FROM races WHERE status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get() as Race | null
  }

  // --- Laps ---

  static recordLap(raceId: string, pilotName: string, lapNumber: number, lapTimeMs: number): Lap {
    const lap: Lap = {
      id: uuid(),
      race_id: raceId,
      pilot_name: pilotName,
      lap_number: lapNumber,
      lap_time_ms: lapTimeMs,
      recorded_at: Date.now()
    }
    db.prepare(`
      INSERT INTO laps (id, race_id, pilot_name, lap_number, lap_time_ms, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(lap.id, lap.race_id, lap.pilot_name, lap.lap_number, lap.lap_time_ms, lap.recorded_at)
    return lap
  }

  static getLapsForRace(raceId: string): Lap[] {
    return db.prepare(`
      SELECT * FROM laps WHERE race_id = ? ORDER BY recorded_at ASC
    `).all(raceId) as Lap[]
  }

  // --- Gate Events ---

  static recordGateEvent(event: GateEvent) {
    db.prepare(`
      INSERT INTO gate_events (id, race_id, gate_id, drone_id, beam_index, triggered_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), event.race_id, event.gate_id, event.drone_id, event.beam_index, event.triggered_at)
  }
}