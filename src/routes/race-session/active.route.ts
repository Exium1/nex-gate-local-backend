import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { FastifyInstance } from "fastify";
import { RaceSessionSchema } from "../../schemas/http/race-session.schema.js";
import RaceSessionService from "../../services/race-session.service.js";

// url: /session/active
export function getActiveRaceSession(fastify: FastifyInstance) {
  fastify.withTypeProvider<TypeBoxTypeProvider>()
    .get('/active', {
      schema: {
        response: {
          200: RaceSessionSchema
        }
      }
    }, (req, res) => {
      const session = RaceSessionService.getActiveRaceSession();

      if (session === undefined) {
        const err = new Error('No active race session') as any;
        err.statusCode = 404;
        throw err;
      }

      res.send({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        mode: session.mode,
        isActive: true
      })
    })
}