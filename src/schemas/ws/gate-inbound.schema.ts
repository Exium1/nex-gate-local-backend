import { Type, Static } from 'typebox'

export const GateTriggerMessage = Type.Object({
  type: Type.Literal('GATE_TRIGGER'),
  gate_id: Type.Optional(Type.Integer()),  // only sent in mock mode
  ts: Type.Integer(),
  beam_x: Type.Integer(),
  beam_y: Type.Integer(),
})

export type GateTriggerMessage = Static<typeof GateTriggerMessage>

// union this as more inbound types show up:
// export const GateInboundMessage = Type.Union([GateTriggerMessage, GateHeartbeatMessage, ...])