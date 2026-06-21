import { RaceSessionDao } from "../models/race-session/race-session.dao.js";
import { v4 as uuid } from 'uuid'
import { RaceSessionRow } from "../models/race-session/race-session.types.js";
import { toRaceSession } from "../transformations/race-session.transform.js";
import RaceSessionHandler from "./RaceSessionHandler.js";
import { RaceSession } from "@exium1/nex-gate-local-shared";

const dao = new RaceSessionDao();

export default class RaceSessionService {
  
  static startRaceSession(): RaceSession {
    if (dao.getActive()) {
      throw new Error(`There is an ongoing race session`)
    }
    
    console.log("Starting race session...")
    
    const raceSessionRow: RaceSessionRow = {
      id: uuid(),
      started_at: Date.now(),
      ended_at: null,
      mode: "time_trial"
    }
    
    dao.create(raceSessionRow);
    return toRaceSession(raceSessionRow);
  }
  
  static getRaceSession(id: string): RaceSession | undefined {
    const row = dao.getById(id);
    return row ? toRaceSession(row) : undefined;
  }
  
  static getActiveRaceSession(): RaceSession | undefined {
    const row = dao.getActive();
    return row ? toRaceSession(row) : undefined;
  }
  
  static endActiveRaceSession(): void {
    const activeRaceSession = dao.getActive();
    
    if (!activeRaceSession) {
      throw new Error(`No ongoing race session to end`)
    }
    
    console.log("Ending race session...");
    
    RaceSessionHandler.sessionsPerPilot.clear;
    RaceSessionHandler.activeLapPerPilot.clear;
    RaceSessionHandler.previousGateEventPerPilot.clear;
    
    dao.end(activeRaceSession.id, Date.now())
  }
  
  static endAllRaceSessions(): void {
    console.log("Ending all race session...");
    dao.endAll();
  }
}