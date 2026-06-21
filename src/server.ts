// src/server.ts
import { Static, Type } from 'typebox'
import { runMigrations } from './db/migrations.js'
import RaceSessionHandler from './services/RaceSessionHandler.js';
import fs from 'fs';
import net from 'net';
import { gateConnector } from './realtime/gates/GateConnector.js';
import { clientConnector } from './realtime/clients/ClientConnector.js';
import raceSessionRoutes from './routes/race-session/index.js';
import RaceSessionService from './services/race-session.service.js';

process.loadEnvFile();
runMigrations() // runs once, safe to call every startup

const fastify = clientConnector.getFastify();

// Regular HTTP route still works alongside WebSocket
fastify.get('/health', async () => {
  return { status: 'ok' }
})

const LapResultsResponseSchema = Type.Object({
  lapId: Type.String(),
  raceSessionId: Type.String(),
  lapNumber: Type.Number(),
  lapTimeMs: Type.Number(),
  gateTimesMs: Type.Array(Type.Number)
})

fastify.register(raceSessionRoutes, { prefix: '/race-session' });

// Get laps from ended race session
/*
fastify.get('/laps/:sessionId', async (req, res) => {
  const id = ...
  const laps = RaceRegistry.getLapsForRace(id);

  ...
})
*/

// Get gates given a lap id


// Race all previous incomplete race sessions (only runs on start up) 
RaceSessionService.endAllRaceSessions();

// Listen to websocket between Pi and gates
gateConnector.listen();
// Listen for client websockets
clientConnector.listen();

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

  process.on('exit', () => { RaceSessionService.endAllRaceSessions(); fs.existsSync(SOCKET_PATH) && fs.unlinkSync(SOCKET_PATH) });
  process.on('SIGINT', () => { RaceSessionService.endAllRaceSessions(); fs.existsSync(SOCKET_PATH) && fs.unlinkSync(SOCKET_PATH); process.exit(); });
}

if (process.env.GATE_TESTING_SHELL) dev(); // Use: node -e "const n=require('net').connect('\\\\.\\pipe\\myapp-debug');process.stdin.pipe(n);n.pipe(process.stdout)"


