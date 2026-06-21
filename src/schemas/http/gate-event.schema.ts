import Type, { Static } from "typebox";
import { UUIDField } from "../common.schema.js";

export const GateEventSchema = Type.Object({
  id: UUIDField,
  gateId: Type.Integer(),
  raceSessionId: UUIDField,
  lapId: UUIDField,
  pilotName: Type.String(),
  beamX: Type.Integer(),
  beamY: Type.Integer(),
  triggeredAt: Type.Number(),
  intervalMs: Type.Number()
})

export type GateEvent = Static<typeof GateEventSchema>