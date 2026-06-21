import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { FastifyInstance } from "fastify";
import Type, { Static, TSchema } from "typebox";
import RaceRegistry from "../../../db/RaceRegistry.js";
import { Nullable } from "../../../util/Nullable.js";

// === REQUEST ===
const RaceSessionResultsOverviewRequestSchema = Type.Object({
  id: Type.String({format: 'uuid'})
})

// === RESPONSE ===
const RaceSessionResultsOverviewResponseSchema = Type.Object({
  raceSessionId: Type.String(),
  lapIds: Type.Array(Type.String()),
  avgLapMs: Nullable(Type.Number()), // If no laps were completed
  topLapsMs: Type.Array(Type.Number()),
  personalBestLapMs: Nullable(Type.Number()), // If no laps completed & none before
  raceSessionDurationMs: Type.Number(),
})

// Get results from ended session
// url: /session/:id/results
export async function getRaceSessionResults(fastify: FastifyInstance) {
  fastify.withTypeProvider<TypeBoxTypeProvider>()
    .get('/:id/results', {
      schema: {
        params: RaceSessionResultsOverviewRequestSchema,
        response: {
          200: RaceSessionResultsOverviewResponseSchema
        }
      }
    }, async (req, res) => {
      const id = req.params.id;
      const raceSession = RaceRegistry.getSession(id);

      if (raceSession === undefined) {
        const err = new Error('Race session not found') as any;
        err.statusCode = 404;
        throw err;
      }

      if (raceSession.ended_at == null) {
        const err = new Error("Race session is still active") as any;
        err.statusCode = 404;
        throw err;
      }

      const laps = RaceRegistry.getLapsForRace(id);
      const topLap = RaceRegistry.getFastestLap("default");
      
      let lapCount = 0;
      let lapsMsSum = 0;

      for (const lap of laps) {
        if (lap.lap_time_ms !== null) {
          lapCount++;
          lapsMsSum += lap.lap_time_ms
        } 
      }

      res.send({
        raceSessionId: id,
        lapIds: laps.map(lap => lap.id),
        avgLapMs: lapCount === 0 ? null : lapsMsSum / lapCount,
        topLapsMs: laps
          .filter(lap => lap.lap_time_ms !== null)
          .map(lap => lap.lap_time_ms!)
          .sort(),
        personalBestLapMs: topLap !== null ? topLap.lap_time_ms! : null,
        raceSessionDurationMs: raceSession.ended_at - raceSession.started_at
      })
    })
}