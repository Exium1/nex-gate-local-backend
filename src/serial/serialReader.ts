import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import RaceSessionHandler from '../ws/RaceHandler.js'

type PendingRequest = {
  resolve: (msg: unknown) => void
  reject: (err: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

// Hublet is in reference to the ESP32 connected to the host device (raspberry pi)
export class HubletHandler {

  port: SerialPort;
  delayMs = 0;
  requestCount = 1;
  pending = new Map<number, PendingRequest>();

  constructor(path = '/dev/ttyUSB0', baud = 9600) {
    this.port = new SerialPort({ path, baudRate: baud })

    const parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }))
    parser.on('data', this.onMessage.bind(this))

    this.sync();
  }

  // === TIME SYNCING ===
  // Perform a round-trip sync and calculate offset
  async sync() {
    const T1 = Date.now();
    let response;

    try {
      response = await this.request<any>({
        type: "SYNC_REQ",
        T1: T1
      })
    } catch (e) {
      console.log(`Couldn't sync hublet... ${JSON.stringify(e, null, 2)}`)
      return;
    }

    const T3 = Date.now();
    const T2 = response.T2; // After first call, will be timestamp of received
    const roundTrip = T3 - T1;
    this.delayMs = roundTrip / 2;
    const offset = T2 - T1 - (2 * this.delayMs); // math

    // console.log(`T1: ${T1}`)
    // console.log(`T2: ${T2}`)
    // console.log(`T3: ${T3}`)
    // console.log(`Delay: ${this.delayMs}`)
    // console.log(`Offset: ${offset}`)

    if (Math.abs(offset) > 5) {
      this.sendSyncedTime();
    }
  }

  private sendSyncedTime() {
    // tell esp32 it's current time = date.now() + delay

    this.send({
      "type": "SET_TIME",
      "ts": Date.now() + (2 * this.delayMs)
    })
  }

  request<T>(data: any, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = (this.requestCount)++;
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`Request ${data.type} timed out`))
      }, timeoutMs)

      this.pending.set(requestId, { resolve: resolve as any, reject, timeout })
      this.send({ request_id: requestId, ...data })
    })
  }

  send(data: any) {
    const msg = JSON.stringify(data);
    console.log(`[HUBLET> ${msg}`);
    this.port.write(msg);
  }

  private onMessage(raw: any) {
    let msg: any
    try { msg = JSON.parse(raw) } catch { return }

    console.log(`>HUBLET] ${raw}`);

    // If it has a requestId and we're waiting on it, resolve the promise
    if (msg.request_id && this.pending.has(msg.request_id)) {
      const pending = this.pending.get(msg.request_id)!
      clearTimeout(pending.timeout)
      this.pending.delete(msg.request_id)

      if (msg.type === 'error') {
        pending.reject(new Error(msg.message))
      } else {
        pending.resolve(msg)
      }
      return
    }

    this.handleMessage(msg);

    // Otherwise broadcast to subscribers
    // this.handlers.forEach(h => h(msg))
  }

  handleMessage(msg: any) {
    if (msg?.type === "gate_trigger") {
      RaceSessionHandler.gateTriggered(msg.gate_id, msg.ts, msg.beam_x, msg.beam_y);
    }
  }
}