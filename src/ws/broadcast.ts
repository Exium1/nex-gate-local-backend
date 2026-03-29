import { clients } from './roles.js'

export function broadcast(msg: any, filterFn = () => true) {
  const payload = JSON.stringify(msg)
  for (const [id, { ws }] of clients) {
    if (filterFn(id) && ws.readyState === 1) {
      ws.send(payload)
    }
  }
}