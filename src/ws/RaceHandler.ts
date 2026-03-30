import RaceRegistry, { GateEvent } from "../db/RaceRegistry.js";
import ClientRegistry from "./ClientRegistry.js";
import { v4 as uuid } from 'uuid'

export default class RaceSessionHandler {

  // static gates: Set<Gate

  static gateTriggered(gateId: number, timestamp: number, beamX: number, beamY: number) {

    ClientRegistry.broadcast({ type: 'gate_event', gateId, timestamp })
    
    // If gate 0, start a lap
    // If not session, start a session

    // Ongoing lap
    const pilotName = "default"; // TODO: extract from trigger somehow
    const gateCount = 10; // TODO: extract from config somehow
    const session = RaceRegistry.getActiveRaceSession(pilotName);

    if (!session) {
      console.log("Gate trigger, but no session was found.")
      return;
    }
    
    let lap = RaceRegistry.getPilotActiveLap(pilotName);

    if (lap) {
      // Check if gate is correctly coming after previous
    } else {
      // Dismiss unless gate 0      
      console.log("No ongoing lap found...")
      if (gateId == 0) {
        console.log("First gate triggered, starting lap...");
        lap = RaceRegistry.startLap(session.id, pilotName, gateCount);
      } else return;
    }

    let gateEvent: GateEvent = {
      id: uuid(),
      gate_id: gateId,
      race_session_id: session.id,
      lap_id: lap.id,
      pilot_name: pilotName,
      beam_x: beamX,
      beam_y: beamY,
      triggered_at: timestamp,
      interval_ms: null
    }

    RaceRegistry.recordGateEvent(gateEvent);




    // Check cache for previous gate. Is this expected & get interval_ms

    // Ongoing session
  }
}