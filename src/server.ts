// src/server.ts
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { onConnection } from './ws/socketHandler.js'
import { runMigrations } from './db/schema.js'
import RaceRegistry from './db/RaceRegistry.js';
import ClientRegistry from './ws/ClientRegistry.js';
import RaceSessionHandler from './ws/RaceHandler.js';
import fs from 'fs';
import net from 'net';
import fastifyCors from '@fastify/cors';
import { gateConnector } from './ws/GateConnector.js';

process.loadEnvFile();
runMigrations() // runs once, safe to call every startup

const fastify = Fastify({ logger: true })
fastify.register(fastifyCors)
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

fastify.get('/active-session', async (req, res) => {
  const session = RaceRegistry.getActiveRaceSession();

  if (session) return res.status(200).send(session);
  else return res.status(404).send();
})

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}


// Listen to websocket between Pi and gates
gateConnector.listen();
start()

// DEV TESTING STUFF
const dev = () => {
  const SOCKET_PATH = '\\\\.\\pipe\\myapp-debug';

  // Remove stale socket if it exists
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }

  const debugServer = net.createServer((socket) => {
    socket.write('debug> ');
    socket.on('data', async (data) => {
      const input = data.toString().trim();

      switch (input.split(" ")[0]) {
        default:
          try {
            let gate = Number(input);
            RaceSessionHandler.gateTriggered(gate, Date.now(), 5, 5);
          } catch (e) {
            socket.write(JSON.stringify(e) + '\n> ');
          }
          socket.write('\n> ');
      }
    });
  });

  debugServer.listen(SOCKET_PATH);

  process.on('exit', () => { RaceRegistry.endAllRaceSessions(); fs.existsSync(SOCKET_PATH) && fs.unlinkSync(SOCKET_PATH) });
  process.on('SIGINT', () => { RaceRegistry.endAllRaceSessions(); fs.existsSync(SOCKET_PATH) && fs.unlinkSync(SOCKET_PATH); process.exit(); });
}

if (process.env.GATE_TESTING_SHELL) dev(); // Use: node -e "const n=require('net').connect('\\\\.\\pipe\\myapp-debug');process.stdin.pipe(n);n.pipe(process.stdout)"


