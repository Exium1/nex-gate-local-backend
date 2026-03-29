import { WebSocket } from "@fastify/websocket";
import { Role } from "../types/roles.js";
import { v4 as uuid } from 'uuid'
import ClientRegistry from "./ClientRegistry.js";

export default class Client {
  ws: WebSocket // WS
  id: string // UUID
  role: Role = Role.Spectator
  pilotName?: string

  constructor(ws: WebSocket, clientId?: string, role: Role = Role.Spectator, pilotName?: string) {
    if (!ws || typeof ws.send !== 'function') {
      throw new Error('Invalid WebSocket instance');
    }
    
    this.ws = ws;
    this.id = clientId || uuid();
    this.pilotName = pilotName;

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
    this.ws.close();
  }

  setRole(role: Role) {
    this.role = role
  }

  setPilotName(name: string) {
    this.pilotName = name
  }
}