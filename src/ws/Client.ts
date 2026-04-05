import { WebSocket } from "@fastify/websocket";
import { Role } from "../types/roles.js";
import { v4 as uuid } from 'uuid'
import ClientRegistry from "./ClientRegistry.js";
import RaceRegistry from "../db/RaceRegistry.js";

export default class Client {
  ws: WebSocket // WS
  id: string // UUID
  role: Role = Role.Spectator

  constructor(ws: WebSocket, clientId?: string, role: Role = Role.Spectator, pilotName?: string) {
    if (!ws || typeof ws.send !== 'function') {
      throw new Error('Invalid WebSocket instance');
    }
    
    this.ws = ws;
    this.id = clientId || uuid();

    ClientRegistry.add(this);
  }

  send(data: object) {
    this.ws.send(JSON.stringify(data));
  }

  remove() {
    if (this.role === Role.Director) {
      ClientRegistry.director = null;
    }

    ClientRegistry.clients.delete(this.id);

    try {
      if (ClientRegistry.clients.size == 0) RaceRegistry.endRaceSession();
    } catch (_) {}
    
    this.ws.close();
  }

  setRole(role: Role) {
    this.role = role
  }
}