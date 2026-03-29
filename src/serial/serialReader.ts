import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { broadcast } from '../ws/broadcast.js'

export function startSerial(path = '/dev/ttyUSB0') {
  const port = new SerialPort({ path, baudRate: 115200 })
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

  parser.on('data', (line) => {
    try {
      const msg = JSON.parse(line.trim())
      if (msg.type === 'gate_trigger') {
        broadcast({ type: 'gate_event', gateId: msg.gateId, ts: msg.ts })
      }
    } catch (_) {}
  })
}