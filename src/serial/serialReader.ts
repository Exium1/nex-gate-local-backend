import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import ClientRegistry from '../ws/ClientRegistry.js'
import RaceRegistry from '../db/RaceRegistry.js'
import RaceSessionHandler from '../ws/RaceHandler.js'

export function startSerial(path = '/dev/ttyUSB0') {
  const port = new SerialPort({ path, baudRate: 115200 })
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))

  parser.on('data', (line) => {
    try {
      const msg = JSON.parse(line.trim())
      if (msg.type === 'gate_trigger') {
        RaceSessionHandler.gateTriggered(msg.gateId, msg.ts, msg.beamX, msg.beamY);
      }
    } catch (_) {}
  })
}