// import RaceRegistry, { GateEvent, Lap } from "../db/RaceRegistry.js";
import { RaceSessionRow } from "../models/race-session/race-session.types.js";
import { clientConnector } from "../realtime/clients/ClientConnector.js";
import { v4 as uuid } from 'uuid'
import RaceSessionService from "./race-session.service.js";
import { RaceSession } from "../schemas/http/race-session.schema.js";
import { Lap } from "../schemas/http/lap.schema.js";
import { GateEvent } from "../schemas/http/gate-event.schema.js";
import LapService from "./lap.service.js";
import GateEventService from "./gate-event.service.js";
import { toGateEvent, toGateEventRow } from "../transformations/gate-event.transform.js";
import { GateEventRow } from "../models/gate-event/gate-event.types.js";

export default class RaceSessionHandler {

  // === CACHE PER PILOT ===
  static sessionsPerPilot: Map<string, RaceSession> = new Map();
  static activeLapPerPilot: Map<string, Lap> = new Map();
  static previousGateEventPerPilot: Map<string, GateEvent> = new Map();

  static gateTriggered(gateId: number, timestamp: number, beamX: number, beamY: number) {

    // Ongoing lap
    const pilotName = "default"; // TODO: extract from trigger somehow
    const gateCount = 3; // TODO: extract from config somehow
    const session = this.sessionsPerPilot.get(pilotName) ?? RaceSessionService.getActiveRaceSession();
    const lapTimeout = 180000; // 3 mins im ms

    console.log(`[${pilotName}] Gate ${gateId} triggered...`)

    if (!session) {
      console.log(`[${pilotName}] No session found...`)
      return;
    }
    
    this.sessionsPerPilot.set(pilotName, session);

    let lap = this.activeLapPerPilot.get(pilotName) ?? LapService.getActiveLap(session.id, pilotName);
    let intervalMs = 0;
    let broadcastedGateEvent = false;

    // If active lap is expired/timed out
    if (lap && (timestamp - lap.startedAt) > lapTimeout) {
      this.activeLapPerPilot.delete(pilotName);
      lap = undefined;
    }

    if (lap) {
      this.activeLapPerPilot.set(pilotName, lap);

      // === GATE ORDER LOGIC ===
      let prevGateEvent = this.previousGateEventPerPilot.get(pilotName) ?? GateEventService.getPreviousGateEvent(session.id, pilotName);

      if (prevGateEvent) {
        intervalMs = timestamp - prevGateEvent?.triggeredAt;
        const expectedGate = this.nextGateId(prevGateEvent.gateId, gateCount);

        if (expectedGate === gateId) {
          if (gateId === 0) {
            console.log(`[${pilotName}] Lap complete. Recording final gate event...`)

            // === COMPLETED LAP ===
            let gateEventRow: GateEventRow = toGateEventRow(gateId, session.id, lap.id,
              pilotName, beamX, beamY, timestamp, intervalMs)

            // Broadcast FIRST for latency and enrichment logic
            clientConnector.broadcast({ type: 'rich_gate_event', payload: GateEventService.enrichGateEvent(toGateEvent(gateEventRow))})
            clientConnector.broadcast({ type: 'lap_complete', payload: {...lap, lap_time_ms: timestamp - lap.startedAt }})

            GateEventService.recordGateEvent(gateEventRow); // Save gate event, since new lap & event will be created. Needs to be AFTER enriching
            LapService.completeLap(lap.id, timestamp - lap.startedAt);

            broadcastedGateEvent = true;
          }
        } else {
          console.log(`[${pilotName}] Expected Gate ${expectedGate} instead...`);
          if (gateId !== 0) return; // Dismiss trigger (out of order gate that isn't restart lap)
        }
      } else {
        console.log(`[${pilotName}] No previous Gate ${this.previousGateId(gateId, gateCount)} event found...`);
        if (gateId !== 0) return; // Dismiss trigger no prev or gate 0 event found
      }
    } else {
      console.log(`[${pilotName}] No ongoing lap found or lap expired...`)
      if (gateId !== 0) return; // Dismiss trigger unless gate 0
    }

    // === LAP CREATION OVERRIDES ===
    if (gateId === 0) {
      console.log(`[${pilotName}] Gate 0 override. Starting new lap...`);
      lap = LapService.startLap(session.id, pilotName, gateCount);
      intervalMs = 0;
      this.activeLapPerPilot.set(pilotName, lap);    
    }

    let gateEventRow: GateEventRow = {
      id: uuid(),
      gate_id: gateId,
      race_session_id: session.id,
      lap_id: lap!.id, // Lap will be created in override
      pilot_name: pilotName,
      beam_x: beamX,
      beam_y: beamY,
      triggered_at: timestamp,
      interval_ms: intervalMs
    }

    !broadcastedGateEvent && clientConnector.broadcast({ type: 'rich_gate_event', payload: GateEventService.enrichGateEvent(toGateEvent(gateEventRow))})
    GateEventService.recordGateEvent(gateEventRow);
    this.previousGateEventPerPilot.set(pilotName, toGateEvent(gateEventRow));
  }

  private static previousGateId(gateId: number, gateCount: number): number {
    return (gateId - 1) >= 0 ? gateId - 1 : gateCount - 1;
  }

  private static nextGateId(gateId: number, gateCount: number): number {
    return (gateId + 1) % (gateCount);
  }
}