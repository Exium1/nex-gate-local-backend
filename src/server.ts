// src/server.ts
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { onConnection } from './ws/socketHandler.js'

const fastify = Fastify({ logger: true })

fastify.register(websocket)

// A simple WebSocket route
fastify.register(async (app) => {
  app.get('/ws', { websocket: true }, (socket, req) => {
    console.log('Client connected')

    onConnection(socket);

    socket.on('close', () => {
      console.log('Client disconnected')
    })

    socket.on('error', (err) => {
      console.error('Socket error:', err)
    })
  })
})

// Regular HTTP route still works alongside WebSocket
fastify.get('/health', async () => {
  return { status: 'ok' }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()