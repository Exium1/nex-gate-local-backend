import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { Gate } from './Gate.js'

export class GateConnector {
  private fastify
  private gates: Set<Gate>

  constructor() {
    this.fastify = Fastify({ logger: true })
    this.fastify.register(websocket)
    this.gates = new Set()

    this.fastify.register(async (app) => {
      app.get('/ws', { websocket: true }, (socket, req) => {
        // Runs on connection
        const gate = new Gate(socket, this.gates.size)
        this.gates.add(gate)
      })
    })
  }

  async listen(port = 8765) {
    try {
      await this.fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
      this.fastify.log.error(err)
      process.exit(1)
    }
  }

  remove(gate: Gate) {
    this.gates.delete(gate);
  }
}

export const gateConnector = new GateConnector()