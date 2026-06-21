import { GateEventRow } from "../models/gate-event/gate-event.types.js";
import { GateEventDao } from "../models/gate-event/gate-events.dao.js";
import { GateEvent } from "../schemas/http/gate-event.schema.js";
import { toGateEvent } from "../transformations/gate-event.transform.js";
import { EnrichedGateEvent } from "../schemas/ws/client-outbound.schema.js";

const dao = new GateEventDao();

export default class GateEventService {

  static recordGateEvent(gateEventRow: GateEventRow): GateEvent {
    dao.create(gateEventRow);
    return toGateEvent(gateEventRow);
  }
  
  static getPreviousGateEvent(raceSessionId: string, pilotName: string): GateEvent | undefined {
    const gateEventRow = dao.getPreviousGate(raceSessionId, pilotName);
    return gateEventRow ? toGateEvent(gateEventRow) : undefined
  }
  
  static enrichGateEvent(gateEvent: GateEvent): EnrichedGateEvent {
    if (gateEvent.intervalMs === 0) return {
      ...gateEvent,
      color: null,
      allTimeFastestSplitDiffMs: null,
      sessionFastestSplitDiffMs: null,
      previousSplitDiffMs: null
    };
    
    const allTimeFastestGateEvent = dao.getAllTimeFastestGateEvent(gateEvent.gateId, gateEvent.pilotName);
    const sessionFastestGateEvent = dao.getSessionFastestGateEvent(gateEvent.gateId, gateEvent.pilotName, gateEvent.raceSessionId);
    const mostRecentGateEvent = dao.getMostRecentGateEvent(gateEvent.gateId, gateEvent.pilotName, gateEvent.raceSessionId);
    
    const allTimeFastestSplitDiffMs = allTimeFastestGateEvent ?
    gateEvent.intervalMs - allTimeFastestGateEvent.interval_ms : null;
    const sessionFastestSplitDiffMs = sessionFastestGateEvent ?
    gateEvent.intervalMs - sessionFastestGateEvent.interval_ms : null;
    const previousSplitDiffMs = mostRecentGateEvent ?
    gateEvent.intervalMs - mostRecentGateEvent.interval_ms : null;
    
    let color: "neutral" | "purple" | "yellow" | "green" = "neutral"
    
    if (allTimeFastestSplitDiffMs === null || allTimeFastestSplitDiffMs < 0) {
      color = "purple" // Pilot's all time fastest split for gate
    } else if (sessionFastestSplitDiffMs === null || sessionFastestSplitDiffMs < 0) {
      color = "green" // Pilot's best split in session for gate
    } else {
      color = "yellow"
    }
    
    return { ...gateEvent, color, allTimeFastestSplitDiffMs, sessionFastestSplitDiffMs, previousSplitDiffMs }
  }
}