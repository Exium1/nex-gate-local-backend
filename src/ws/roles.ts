const clients = new Map() // clientId → { ws, role, pilotName }
let directorId = null

export function handleJoin(ws, clientId, { role, pilotName }) {
  if (role === 'director') {
    if (directorId && clients.has(directorId)) {
      return { error: 'role_taken' }
    }
    directorId = clientId
  }
  clients.set(clientId, { ws, role, pilotName })
  return { role, clientId }
}

export function isDirector(clientId) {
  return clientId === directorId
}

export function removeClient(clientId) {
  if (directorId === clientId) directorId = null
  clients.delete(clientId)
}

export { clients }