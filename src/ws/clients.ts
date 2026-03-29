// import { WebSocket } from "@fastify/websocket";
// import { Role } from "../types/roles.js";

// export type Client = {
//   ws: WebSocket;
//   role: Role;
//   pilotName: string;
// };

// const clients = new Map<string, Client>(); // clientId → { ws, role, pilotName }
// let directorId: string | null = null;

// export function handleJoin(ws: WebSocket, clientId: string, { role, pilotName }: { role: Role; pilotName: string }) {
//   if (role === Role.Director) {
//     if (directorId && clients.has(directorId)) {
//       return { error: 'role_taken' }
//     }
//     directorId = clientId
//   }
//   clients.set(clientId, { ws, role, pilotName })
//   return { role, clientId }
// }

// export function isDirector(clientId: string) {
//   return clientId === directorId
// }

// export function removeClient(clientId: string) {
//   if (directorId === clientId) directorId = null
//   clients.delete(clientId)
// }

// export { clients }