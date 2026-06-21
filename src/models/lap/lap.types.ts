export type LapRow = {
  id: string
  race_session_id: string // Reference session id
  pilot_name: string | null // (Nullable)
  lap_time_ms: number | null // Duration of lap (ms, nullable)
  gate_count: number // How many gates are in the lap
  started_at: number // Timestamp of beginning
  // Status, if no lap time it's either DNF or active, most recent is active
}