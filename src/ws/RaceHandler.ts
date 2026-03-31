import RaceRegistry, { GateEvent, Lap, RaceSession } from "../db/RaceRegistry.js";
import ClientRegistry from "./ClientRegistry.js";
import { v4 as uuid } from 'uuid'

export default class RaceSessionHandler {

  // === CACHE PER PILOT ===
  static sessionsPerPilot: Map<string, RaceSession> = new Map();
  static activeLapPerPilot: Map<string, Lap> = new Map();
  static previousGateEventPerPilot: Map<string, GateEvent> = new Map();

  static gateTriggered(gateId: number, timestamp: number, beamX: number, beamY: number) {

    // Update UI
    // ClientRegistry.broadcast({ type: 'gate_trigger', payload: { gate_id: gateId, timestamp, beam_x: beamX, beam_y: beamY }})
    
    // Ongoing lap
    const pilotName = "default"; // TODO: extract from trigger somehow
    const gateCount = 5; // TODO: extract from config somehow
    const session = this.sessionsPerPilot.get(pilotName) || RaceRegistry.getActiveRaceSession(pilotName);
    const lapTimeout = 180000; // 3 mins im ms

    console.log(`[${pilotName}] Gate ${gateId} triggered...`)

    if (!session) {
      console.log(`[${pilotName}] No session found...`)
      return;
    }
    
    this.sessionsPerPilot.set(pilotName, session);

    let lap = this.activeLapPerPilot.get(pilotName) || RaceRegistry.getActiveLap(pilotName, session.id);
    let intervalMs = 0;
    let broadcastedGateEvent = false;

    // If active lap is expired/timed out
    if (lap && (timestamp - lap.started_at) > lapTimeout) {
      this.activeLapPerPilot.delete(pilotName);
      lap = null;
    }

    if (lap) {
      this.activeLapPerPilot.set(pilotName, lap);

      // === GATE ORDER LOGIC ===
      let prevGateEvent = this.previousGateEventPerPilot.get(pilotName) || RaceRegistry.getPreviousGateEvent(session.id, pilotName);

      if (prevGateEvent) {
        intervalMs = timestamp - prevGateEvent?.triggered_at;
        const expectedGate = this.nextGateId(prevGateEvent.gate_id, gateCount);

        if (expectedGate === gateId) {
          if (gateId === 0) {
            console.log(`[${pilotName}] Lap complete. Recording final gate event...`)

            // === COMPLETED LAP ===
            let gateEvent: GateEvent = this.newGateEvent(gateId, session.id, lap.id,
              pilotName, beamX, beamY, timestamp, intervalMs)

            ClientRegistry.broadcast({ type: 'gate_event', payload: gateEvent})
            ClientRegistry.broadcast({ type: 'lap_complete', payload: {...lap, lap_time_ms: timestamp - lap.started_at }})

            RaceRegistry.recordGateEvent(gateEvent); // Save gate event, since new lap & event will be created.
            RaceRegistry.completeLap(lap.id, timestamp - lap.started_at);

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
      lap = RaceRegistry.startLap(session.id, pilotName, gateCount);
      intervalMs = 0;
      this.activeLapPerPilot.set(pilotName, lap);    
    }

    let gateEvent: GateEvent = {
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

    !broadcastedGateEvent && ClientRegistry.broadcast({ type: 'gate_event', payload: gateEvent})
    RaceRegistry.recordGateEvent(gateEvent);
    this.previousGateEventPerPilot.set(pilotName, gateEvent);
  }

  private static previousGateId(gateId: number, gateCount: number): number {
    return (gateId - 1) >= 0 ? gateId - 1 : gateCount - 1;
  }

  private static nextGateId(gateId: number, gateCount: number): number {
    return (gateId + 1) % (gateCount);
  }

  private static newGateEvent(gateId: number, sessionId: string, lapId: string, pilotName: string,
      beamX: number, beamY: number, triggeredAt: number, intervalMs: number): GateEvent {
    
    return {
      id: uuid(),
      gate_id: gateId,
      race_session_id: sessionId,
      lap_id: lapId,
      pilot_name: pilotName,
      beam_x: beamX,
      beam_y: beamY,
      triggered_at: triggeredAt,
      interval_ms: intervalMs
    }
  }
}