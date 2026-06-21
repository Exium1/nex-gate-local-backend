import { FastifyInstance } from "fastify";
import { getRaceSessionResults } from "./results.js";
import { getActiveRaceSession } from "./active.js";

export default async function raceSessionRoutes(fastify: FastifyInstance) {
  fastify.register(getRaceSessionResults);
  fastify.register(getActiveRaceSession);
}