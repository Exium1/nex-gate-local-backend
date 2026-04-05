import { Role } from "./roles.js"

export enum WsErrorCode {
  INVALID_JSON   = 'INVALID_JSON',
  UNKNOWN_TYPE   = 'UNKNOWN_TYPE',
  UNAUTHORIZED   = 'UNAUTHORIZED',
  ROLE_TAKEN     = 'ROLE_TAKEN',
  RACE_NOT_ACTIVE = 'RACE_NOT_ACTIVE',
}

// Payloads
export type JoinPayload = {
  role: Role
}

export type RaceControlPayload = {
  command: string
}

export type GateTriggerPayload = {
  gateId: string
  droneId: string
  timestamp: number
  beamIndex: number
}

// Discriminated union — every inbound message shape
export type InboundMessage =
  | { type: 'join';          payload: JoinPayload }
  | { type: 'race_control';  payload: RaceControlPayload }
  | { type: 'gate_trigger';  payload: GateTriggerPayload }

export const INBOUND_TYPES = ['join', 'race_control', 'gate_trigger'] as const
  
export function isInboundMessage(msg: unknown): msg is InboundMessage {
  if (typeof msg !== 'object' || msg === null) return false
  if (!('type' in msg) || !('payload' in msg)) return false
  if (typeof (msg as any).type !== 'string') return false
  if (!(INBOUND_TYPES as readonly string[]).includes((msg as any).type)) return false
  return true
}