import Type, { Static } from "typebox";
import { Nullable, UUIDField } from "../common.schema.js";

export const LapSchema = Type.Object({
  id: UUIDField,
  raceSessionId: UUIDField,
  pilotName: Nullable(Type.String()),
  lapDuration: Nullable(Type.Number()),
  gateCount: Type.Integer(),
  startedAt: Type.Number()
});

export type Lap = Static<typeof LapSchema>;