import { GateEvent } from "@exium1/nex-gate-local-shared";
import { GateEventRow } from "../models/gate-event/gate-event.types.js";
import { v4 as uuid } from 'uuid'

export function toGateEvent(row: GateEventRow): GateEvent {
  return {
    id: row.id,
    gateId: row.gate_id,
    raceSessionId: row.race_session_id,
    lapId: row.lap_id,
    pilotName: row.pilot_name,
    beamX: row.beam_x,
    beamY: row.beam_y,
    triggeredAt: row.triggered_at,
    intervalMs: row.interval_ms
  }
}

export function toGateEventRow(gateId: number, raceSessionId: string, lapId: string, pilotName: string,
    beamX: number, beamY: number, triggeredAt: number, lapDuration: number): GateEventRow {
  return {
    id: uuid(),
    gate_id: gateId,
    race_session_id: raceSessionId,
    lap_id: lapId,
    pilot_name: pilotName,
    beam_x: beamX,
    beam_y: beamY,
    triggered_at: triggeredAt,
    interval_ms: lapDuration,
  }
}