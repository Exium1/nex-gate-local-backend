import { RequestResponseClient } from "../util/RequestResponseClient.js"
import { WebSocket } from '@fastify/websocket'
import RaceSessionHandler from "./RaceSessionHandler.js"
import { gateConnector } from "./GateConnector.js"

type SyncAck = {
  type: "SYNC_ACK"
  request_id: number
  T2: number
}

export class Gate extends RequestResponseClient {
  private ws: WebSocket
  private gateId: number
  private lastSynced?: number
  private delay?: number

  constructor(ws: WebSocket, gateId: number) {
    super()
    this.ws = ws
    this.gateId = gateId
    console.log(`Gate ${gateId} connected.`)

    ws.on('message', (raw: string) => this.onMessage(raw))
    ws.on('close', () => this.onClose())
    ws.on('error', (err) => this.onError(err))

    this.sync()
  }

  protected send(data: any) {
    this.ws.send(JSON.stringify(data))
  }

  private onMessage(raw: string) {
    const msg = JSON.parse(raw)
    console.log(`[Gate ${this.gateId}] ${JSON.stringify(msg)}`)

    // Route request/response pairs back to pending promises
    if (msg.request_id != null) {
      msg.error
        ? this.rejectRequest(msg.request_id, msg.error)
        : this.resolveRequest(msg.request_id, msg)
      return
    }

    switch (msg?.type) {
      case "GATE_TRIGGER":
        const gateId = process.env.MOCK_GATE_TRIGGER ? msg.gate_id : this.gateId;
        RaceSessionHandler.gateTriggered(gateId, msg.ts, msg.beam_x, msg.beam_y)
        break
    }
  }

  // === TIME SYNCING ===
  async sync() {
    const T1 = Date.now()
    let response: SyncAck

    try {
      response = await this.request<SyncAck>({ type: "SYNC_REQ", T1 })
    } catch (e) {
      console.log(`Couldn't sync gate ${this.gateId}: ${JSON.stringify(e, null, 2)}`)
      return
    }

    const T3 = Date.now()
    const T2 = response.T2
    const roundTrip = T3 - T1
    this.delay = roundTrip / 2
    const offset = T2 - T1 - (2 * this.delay)

    if (Math.abs(offset) > 5) {
      this.sendSyncedTime(this.delay)
    }

    this.lastSynced = Date.now()
  }

  private sendSyncedTime(delay: number) {
    console.log(`[Gate ${this.gateId}] Setting delay to ${delay}`)
    this.send({
      type: "SET_TIME",
      ts: Date.now() + (2 * delay)
    })
  }

  // === LOGGING ===
  private onClose() {
    console.log(`Gate ${this.gateId} disconnected.`)
    gateConnector.remove(this);
  }

  private onError(err: Error) {
    console.log(`Gate ${this.gateId} error: ${err}`)
    gateConnector.remove(this);
  }
}