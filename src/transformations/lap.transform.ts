import { LapRow } from "../models/lap/lap.types.js";
import { Lap } from "../schemas/http/lap.schema.js";

export function toLap(row: LapRow): Lap {
  return {
    id: row.id,
    raceSessionId: row.race_session_id,
    pilotName: row.pilot_name,
    lapDuration: row.lap_time_ms,
    gateCount: row.gate_count,
    startedAt: row.started_at
  }
}