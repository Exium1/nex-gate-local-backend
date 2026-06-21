import { FastifyInstance } from "fastify";
import { getRaceSessionResults } from "./results.route.js";
import { getActiveRaceSession } from "./active.route.js";

export default async function raceSessionRoutes(fastify: FastifyInstance) {
  fastify.register(getRaceSessionResults);
  fastify.register(getActiveRaceSession);
}