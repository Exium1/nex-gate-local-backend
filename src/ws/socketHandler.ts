import { WebSocket } from '@fastify/websocket'
import MessageHandler from './MessageHandler.js'
import Client from './Client.js';
// import { getRaceState, applyControl } from '../db/queries.js'

export function onConnection(ws: WebSocket) {
  const client = new Client(ws);
  const messageHandler = new MessageHandler(client)

  ws.on('message', (raw: string) => messageHandler.handleMessage(raw))
  ws.on('close', () => client.remove())
}