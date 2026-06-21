import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { FastifyInstance } from "fastify";
import RaceSessionService from "../../services/race-session.service.js";
import LapService from "../../services/lap.service.js";
import { IdParam, RaceSessionResultsOverviewSchema } from "@exium1/nex-gate-local-shared";

// Get results from ended session
// url: /session/:id/results
export async function getRaceSessionResults(fastify: FastifyInstance) {
  fastify.withTypeProvider<TypeBoxTypeProvider>()
    .get('/:id/results', {
      schema: {
        params: IdParam,
        response: {
          200: RaceSessionResultsOverviewSchema
        }
      }
    }, async (req, res) => {
      const id = req.params.id;
      const raceSession = RaceSessionService.getRaceSession(id);

      if (raceSession === undefined) {
        const err = new Error('Race session not found') as any;
        err.statusCode = 404;
        throw err;
      }

      if (raceSession.endedAt == null) {
        const err = new Error("Race session is still active") as any;
        err.statusCode = 404;
        throw err;
      }

      const laps = LapService.getCompletedLapsInRaceSession(id);
      const topLap = LapService.getFastestLapByPilot("default");
      
      res.send({
        ...raceSession,
        lapIds: laps.map(lap => lap.id),
        avgLapMs: laps.reduce((sum, lap) => sum += lap.lapDuration, 0) / laps.length,
        topLapsMs: laps
          .filter(lap => lap.lapDuration !== null)
          .map(lap => lap.lapDuration!)
          .sort(),
        personalBestLapMs: topLap ? topLap.lapDuration : null,
        raceSessionDurationMs: raceSession.endedAt - raceSession.startedAt
      })
    })
}