import RaceRegistry from "../db/RaceRegistry.js";
import { JoinPayload } from "../types/messages.js";
import { Role } from "../types/roles.js";
import Client from "./Client.js";

export default class ClientRegistry {
  public static clients: Map<string, Client> = new Map();
  public static director: Client | null = null;

  public static add(client: Client) {
    this.clients.set(client.id, client);
  }

  public static remove(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return
    if (client.role === Role.Director) this.director = null
    this.clients.delete(clientId)
    client.ws.close()
    if (this.clients.size == 0) RaceRegistry.endRaceSession();
  }

  public static get(clientId: string) {
    return this.clients.get(clientId);
  }

  public static resetDirector() {
    this.director = null;
  }

  public static broadcast(msg: object, filterFn: (id: string) => boolean = () => true) {
    for (const client of this.clients.values()) {        // was Client.clients
      if (filterFn(client.id) && client.ws.readyState === 1) {
        client.send(msg);
      }
    }
  }

  public static join(client: Client, {role}: JoinPayload): Client {
    if (!this.assignRole(client, role)) { // Attempt to give requested role
      client.setRole(Role.Spectator)      // Fallback to spectator
    }

    // if (!this.assignPilotName(client, pilotName)) {
    //   let i = 2;
    //   while (!this.assignPilotName(client, `${pilotName}-${i++}`)) {}
    // }

    return client;
  }

  public static assignRole(client: Client, newRole: Role): boolean {
    if (newRole === Role.Director) {
      if (this.director !== null && this.director.id !== client.id) {
        return false; // already taken
      }
      this.director = client;
    }

    if (client.role === Role.Director && newRole !== Role.Director) {
      this.director = null; // stepping down
    }

    client.setRole(newRole);
    return true;
  }

  // public static assignPilotName(client: Client, name: string): boolean {
  //   const taken = Array.from(this.clients.values())
  //     .some(c => c.pilotName === name && c.id !== client.id);

  //   if (taken) return false;

  //   client.setPilotName(name);
  //   return true;
  // }
}