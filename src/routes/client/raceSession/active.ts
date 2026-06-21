import { Static, Type, TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { FastifyInstance } from "fastify";
import RaceRegistry from "../../../db/RaceRegistry.js";
import { Nullable } from "../../../util/Nullable.js";

const ActiveSessionResponseSchema = Type.Object({
  id: Type.String({format: 'uuid'}),
  startedAt: Type.Number(),
  endedAt: Nullable(Type.Number()),
  mode: Type.Union([
    Type.Literal("time_trial"),
    Type.Literal("set"),
    Type.Literal("race"),
  ])
})

// url: /session/active
export function getActiveRaceSession(fastify: FastifyInstance) {
  fastify.withTypeProvider<TypeBoxTypeProvider>()
    .get('/active', {
      schema: {
        response: {
          200: ActiveSessionResponseSchema
        }
      }
    }, (req, res) => {
      const session = RaceRegistry.getActiveRaceSession();

      if (session === undefined) {
        const err = new Error('No active race session') as any;
        err.statusCode = 404;
        throw err;
      }

      res.send({
        id: session.id,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        mode: session.mode
      })
    })
}