import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { v4 as uuid } from 'uuid'
import fastifyCors from '@fastify/cors'
// import { Role } from '../../types/roles.js'
// import { JoinPayload } from "../../types/messages.js";
import { Client } from './Client.js'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import RaceSessionService from '../../services/race-session.service.js'
import { ClientOutboundMessage, Role, RoleSchema } from '@exium1/nex-gate-local-shared'

export class ClientConnector {
  private fastify
  clients: Map<string, Client>
  director: Client | null = null;

  constructor() {
    this.fastify = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();
    this.fastify.register(fastifyCors)
    this.fastify.register(websocket)
    this.clients = new Map()

    this.fastify.register(async (app) => {
      app.get('/ws', { websocket: true }, (socket, req) => {
        // Runs on connection
        const clientId = uuid();
        const client = new Client(socket, clientId)
        this.clients.set(clientId, client)
      })
    })
  }

  getFastify() {
    return this.fastify
  }

  async listen(port = 3001) {
    try {
      await this.fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
      this.fastify.log.error(err)
      process.exit(1)
    }
  }
  
  remove(client: Client) {
    if (client.role === RoleSchema.Director) this.director = null
    this.clients.delete(client.id);
    if (this.clients.size == 0) RaceSessionService.endActiveRaceSession();
    if (client.ws) client.ws.close();
  }

  broadcast(msg: ClientOutboundMessage, filterFn: (id: string) => boolean = () => true) {
    for (const client of this.clients.values()) {        // was Client.clients
      if (filterFn(client.id) && client.ws.readyState === 1) {
        client.send(msg);
      }
    }
  }

  // Doesn't create a new client, but joins an already created one
  join(client: Client, role: Role): Client {
    if (!this.assignRole(client, role)) { // Attempt to give requested role
      client.setRole(Role.SPECTATOR)      // Fallback to spectator
    }

    return client;
  }

  assignRole(client: Client, newRole: Role): boolean {
    if (newRole === Role.DIRECTOR) {
      if (this.director !== null && this.director.id !== client.id) {
        return false; // already taken
      }
      this.director = client;
    }

    if (client.role === Role.DIRECTOR && newRole !== Role.DIRECTOR) {
      this.director = null; // stepping down
    }

    client.setRole(newRole);
    return true;
  }
}

export const clientConnector = new ClientConnector();