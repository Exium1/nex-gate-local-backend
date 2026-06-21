import { RaceSession } from '@exium1/nex-gate-local-shared'
import type { RaceSessionRow } from '../models/race-session/race-session.types.js'

export function toRaceSession(row: RaceSessionRow): RaceSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    mode: row.mode,
    isActive: row.ended_at === null,
  }
}