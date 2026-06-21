import { LapDao } from "../models/lap/lap.dao.js";
import { LapRow } from "../models/lap/lap.types.js";
import { Lap } from "../schemas/http/lap.schema.js";
import { v4 as uuid } from 'uuid'
import { toLap } from "../transformations/lap.transform.js";

const dao = new LapDao();

export default class LapService {

  static startLap(raceSessionId: string, pilotName: string, gateCount: number): Lap {
    const lapRow: LapRow = {
      id: uuid(),
      race_session_id: raceSessionId,
      pilot_name: pilotName,
      gate_count: gateCount,
      started_at: Date.now(),
      lap_time_ms: null
    }
    
    dao.create(lapRow)
    return toLap(lapRow);
  }
  
  static completeLap(lapId: string, lapDuration: number) {
    dao.complete(lapId, lapDuration);
  }
  
  static getLapsInRaceSession(raceSessionId: string): Lap[] {
    const lapRows = dao.getByRaceSessionId(raceSessionId);
    return lapRows.map(lapRow => toLap(lapRow));
  }
  
  static getActiveLap(raceSessionId: string, pilotName: string): Lap | undefined {
    const lapRow = dao.getActiveLap(raceSessionId, pilotName);
    return lapRow ? toLap(lapRow) : undefined;
  }
  
  static getFastestLapByPilot(pilotName: string): Lap | undefined {
    const lapRow = dao.getFastestLapByPilot(pilotName);
    return lapRow ? toLap(lapRow) : undefined;
  }
}