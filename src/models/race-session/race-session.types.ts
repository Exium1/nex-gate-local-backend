export type RaceSessionRow = {
  id: string
  started_at: number
  ended_at: number | null,
  mode: "time_trial" | "set" | "race"
}