import { Role } from "../types/roles.js"
import { WebSocket } from '@fastify/websocket'
import { RequestResponseClient } from "../util/RequestResponseClient.js"
import { clientConnector } from "./ClientConnector.js"
import { InboundMessage, isInboundMessage, WsErrorCode } from "../types/messages.js"
import RaceRegistry from "../db/RaceRegistry.js"

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
      session: { startedAt: session.started_at, mode: session.mode, id: session.id }
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
