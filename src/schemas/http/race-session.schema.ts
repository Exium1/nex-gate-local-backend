import Type, { Static } from "typebox";
import { Nullable, UUIDField } from "../common.schema.js";

export const RaceSessionSchema = Type.Object({
  id: UUIDField,
  startedAt: Type.Number(),
  endedAt: Nullable(Type.Number()),
  mode: Type.Union([
    Type.Literal("time_trial"),
    Type.Literal("set"),
    Type.Literal("race"),
  ]),
  isActive: Type.Boolean()
});

export type RaceSession = Static<typeof RaceSessionSchema>;

export const RaceSessionResultsOverviewSchema = Type.Intersect([
  RaceSessionSchema,
  Type.Object({
    lapIds: Type.Array(UUIDField),
    avgLapMs: Nullable(Type.Number()), // If no laps were completed
    topLapsMs: Type.Array(Type.Number()),
    personalBestLapMs: Nullable(Type.Number()), // If no laps completed & none before
    raceSessionDurationMs: Type.Number(),
  })
])