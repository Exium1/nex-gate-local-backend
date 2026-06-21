import { WebSocket } from '@fastify/websocket'
import { SocketConnection  } from "../SocketConnection.js"
import { clientConnector } from "./ClientConnector.js"
import RaceSessionService from "../../services/race-session.service.js"
import { ClientInboundMessage, ClientInboundMessageSchema, ClientOutboundMessage, JoinRaceSessionRequestMessage, JoinRaceSessionResponse, JoinRaceSessionResponseMessage, Role, WsErrorCode } from "@exium1/nex-gate-local-shared"
import { Value } from "@sinclair/typebox/value"

export class Client extends SocketConnection {
  ws: WebSocket // WS
  id: string // UUID
  role: Role = Role.SPECTATOR

  constructor(ws: WebSocket, id: string) {
    super()
    this.ws = ws
    this.id = id
    console.log(`Client connected.`)

    ws.on('message', (raw: string) => this.onMessage(raw))
    ws.on('close', () => this.onClose())
    ws.on('error', (err) => this.onError(err))
  }

  send(data: ClientOutboundMessage) {
    this.ws.send(JSON.stringify(data))
  }

  // Used to send responses to incoming messages with request ids
  reply(data: object, requestId: number) {
    this.ws.send(JSON.stringify({...data, requestId}) )
  }

  error(code: WsErrorCode, message: string, requestId?: number) {
    if (requestId == undefined) this.send({ type: 'ERROR', code, message });
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

    // Inbound message handling (Client request -> Backend)
    if (!Value.Check(ClientInboundMessageSchema, msg)) {
      return this.error(WsErrorCode.UNKNOWN_TYPE, `Unknown or malformed message type`)
    }

    const incomingMsg: ClientInboundMessage = msg

    // Route request/response pairs back to pending promises (Client response -> Backend)
    if (incomingMsg.requestId != null && this.pending.get(incomingMsg.requestId)) {
      // msg.type === "ERROR"
        // ? this.rejectRequest(incomingMsg.requestId, msg.error)
      this.resolveRequest(incomingMsg.requestId, msg)

      return
    }
    
    // TypeScript now fully narrows inside each case
    switch (incomingMsg?.type) {
      case "JOIN":
        this.handleJoinMessage(incomingMsg.requestId)
        break
    }
  }

  private handleJoinMessage(requestId: number) {
    // Force set to director if possible for now
    const client = clientConnector.join(this, Role.DIRECTOR);
    // Get current or start race session
    const session = RaceSessionService.getActiveRaceSession() ?? RaceSessionService.startRaceSession();

    const response: JoinRaceSessionResponseMessage = {
      type: "JOIN_RESPONSE",
      payload: {
        client: { id: client.id, role: client.role },
        session: { startedAt: session.startedAt, mode: session.mode, id: session.id }
      },
      requestId
    }

    console.log(response);

    this.send(response);
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
