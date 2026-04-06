import Fastify from 'fastify'
import websocket, { WebSocket } from '@fastify/websocket'
import { RequestResponseClient } from '../util/RequestResponseClient.js'
import RaceSessionHandler from './RaceHandler.js'
import { v4 as uuid } from 'uuid'
import fastifyCors from '@fastify/cors'
import { Role } from '../types/roles.js'
import RaceRegistry from '../db/RaceRegistry.js'
import { InboundMessage, isInboundMessage, JoinPayload, WsErrorCode } from "../types/messages.js";

export class ClientConnector {
  private fastify
  clients: Map<string, Client>
  director: Client | null = null;

  constructor() {
    this.fastify = Fastify({ logger: true })
    this.fastify.register(fastifyCors)
    this.fastify.register(websocket)
    this.clients = new Map()

    this.fastify.register(async (app) => {
      app.get('/ws', { websocket: true }, (socket, req) => {
        // Runs on connection
        const clientId = uuid();
        const client = new Client(socket, clientId)
        this.clients.set(clientId, client)
      })
    })
  }

  getFastify() {
    return this.fastify
  }

  async listen(port = 3001) {
    try {
      await this.fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
      this.fastify.log.error(err)
      process.exit(1)
    }
  }
  
  remove(client: Client) {
    if (client.role === Role.Director) this.director = null
    this.clients.delete(client.id);
    if (this.clients.size == 0) RaceRegistry.endRaceSession();
    if (client.ws) client.ws.close();
  }

  broadcast(msg: object, filterFn: (id: string) => boolean = () => true) {
    for (const client of this.clients.values()) {        // was Client.clients
      if (filterFn(client.id) && client.ws.readyState === 1) {
        client.send(msg);
      }
    }
  }

  // Doesn't create a new client, but joins an already created one
  join(client: Client, { role }: JoinPayload): Client {
    if (!this.assignRole(client, role)) { // Attempt to give requested role
      client.setRole(Role.Spectator)      // Fallback to spectator
    }

    return client;
  }

  assignRole(client: Client, newRole: Role): boolean {
    if (newRole === Role.Director) {
      if (this.director !== null && this.director.id !== client.id) {
        return false; // already taken
      }
      this.director = client;
    }

    if (client.role === Role.Director && newRole !== Role.Director) {
      this.director = null; // stepping down
    }

    client.setRole(newRole);
    return true;
  }
}

export class Client extends RequestResponseClient {
  ws: WebSocket // WS
  id: string // UUID
  role: Role = Role.Spectator

  constructor(ws: WebSocket, id: string) {
    super()
    this.ws = ws
    this.id = id
    console.log(`Client connected.`)

    ws.on('message', (raw: string) => this.onMessage(raw))
    ws.on('close', () => this.onClose())
    ws.on('error', (err) => this.onError(err))
  }

  send(data: object) {
    this.ws.send(JSON.stringify(data))
  }

  // Used to send responses to incoming messages with request ids
  reply(data: object, requestId: number) {
    this.ws.send(JSON.stringify({...data, requestId}) )
  }

  error(code: WsErrorCode, message: string, requestId?: number) {
    if (requestId == undefined) this.send({ type: 'error', code, message });
    else this.reply({ type: 'error', code, message }, requestId)
  }

  private onMessage(raw: string) {
    let msg: any
    try {
      msg = JSON.parse(raw)
    } catch {
      return this.error(WsErrorCode.INVALID_JSON, 'Message is not valid JSON')
    }

    console.log(`[Client ${this.id}] ${JSON.stringify(msg)}`)

    // Route request/response pairs back to pending promises (Client response -> Backend)
    if (msg.request_id != null && this.pending.get(msg.request_id)) {
      msg.error
        ? this.rejectRequest(msg.request_id, msg.error)
        : this.resolveRequest(msg.request_id, msg)

      return
    }

    // Inbound message handling (Client request -> Backend)
    if (!isInboundMessage(msg)) {
      return this.error(WsErrorCode.UNKNOWN_TYPE, `Unknown or malformed message type`)
    }

    // TypeScript now fully narrows inside each case
    const incomingMsg: InboundMessage = msg
    switch (incomingMsg?.type) {
      case "join":
        this.handleJoinMessage(incomingMsg.requestId)
        break
    }
  }

  private handleJoinMessage(requestId: number) {
    // Force set to director if possible for now
    const client = clientConnector.join(this, { role: Role.Director });
    // Get current or start race session
    const session = RaceRegistry.getActiveRaceSession() || RaceRegistry.startRaceSession();

    this.reply({
      client: { id: client.id, role: client.role },
      session: { startedAt: session.started_at, mode: session.mode }
    }, requestId )
  }

  setRole(role: Role) {
    this.role = role
  }

  remove() {
    clientConnector.remove(this);
  }

  // === LOGGING ===
  private onClose() {
    console.log(`Client ${this.id} disconnected.`)
    clientConnector.remove(this);
  }

  private onError(err: Error) {
    console.log(`Client ${this.id} error: ${err}`)
    clientConnector.remove(this);
  }
}

export const clientConnector = new ClientConnector();