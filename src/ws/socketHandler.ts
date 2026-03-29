import { v4 as uuid } from 'uuid'
// import { handleJoin, isDirector, removeClient } from './roles.js'
// import { broadcast } from './broadcast.js'
// import { getRaceState, applyControl } from '../db/queries.js'

export function onConnection(ws: any) {
  const clientId = uuid()

  ws.send(JSON.stringify({ type: 'state_sync', field: "value" }))

  return;

  ws.send(JSON.stringify({ type: 'state_sync', ...getRaceState() }))

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw)

    if (msg.type === 'join') {
      const result = handleJoin(ws, clientId, msg)
      ws.send(JSON.stringify({ type: 'join_ack', ...result }))
      return
    }

    if (msg.type === 'race_control') {
      if (!isDirector(clientId)) return // silently reject
      const newStatus = applyControl(msg.action)
      broadcast({ type: 'race_status', ...newStatus })
      return
    }
  })

  ws.on('close', () => removeClient(clientId))
}