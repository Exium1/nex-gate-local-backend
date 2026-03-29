import { InboundMessage, isInboundMessage, JoinPayload, RaceControlPayload, WsErrorCode } from '../types/messages.js';
import { Role } from '../types/roles.js';
import Client from './Client.js';
import ClientRegistry from './ClientRegistry.js';

export default class MessageHandler {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  private reply(data: object) {
    this.client.ws.send(JSON.stringify(data))
  }

  private error(code: WsErrorCode, message: string, requestId?: string) {
    this.reply({ type: 'error', code, message, requestId })
  }

  handleMessage(raw: string) {
    console.log('Received:', raw.toString())
    
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return this.error(WsErrorCode.INVALID_JSON, 'Message is not valid JSON')
    }

    if (!isInboundMessage(parsed)) {
      return this.error(WsErrorCode.UNKNOWN_TYPE, `Unknown or malformed message type`)
    }

    // TypeScript now fully narrows inside each case
    const msg: InboundMessage = parsed
    switch (msg.type) {
      case 'join':
        this.handleJoinMessage(msg.payload)        // typed as JoinPayload
        break
      case 'race_control':
        this.handleRaceControlMessage(msg.payload) // typed as RaceControlPayload
        break
      // case 'gate_trigger':
      //   this.handleGateTriggerMessage(msg.payload) // typed as GateTriggerPayload
      //   break
    }
  }

  private handleJoinMessage(payload: JoinPayload) {

    // Validate payload fields
    if (typeof payload.role !== 'string' || !Object.values(Role).includes(payload.role)) {
      this.error(WsErrorCode.UNKNOWN_TYPE, 'Invalid payload for join message')
      return
    }
    if (typeof payload.pilotName !== 'string') {
      this.error(WsErrorCode.UNKNOWN_TYPE, 'Invalid payload for join message')
      return
    }

    const client = ClientRegistry.join(this.client, payload);

    this.reply({ type: 'join_success', client: client })
  }

  private handleRaceControlMessage(payload: RaceControlPayload) {
    if (this.client.role !== Role.Director) {
      this.error(WsErrorCode.UNAUTHORIZED, 'Only the director can send race control commands')
      return
    }
    // handle command...
  }
}
