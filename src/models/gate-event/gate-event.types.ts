export type GateEventRow = {
  id: string // UUID
  gate_id: number // Number
  race_session_id: string // Reference to active race session (nullable)
  lap_id: string // Reference to active lap (nullable)
  pilot_name: string // Reference to selected pilot (nullable)
  beam_x: number // 0-100 0-100% on the x axis
  beam_y: number // 0-100 0-100% on the y axis
  triggered_at: number // Timestamp (ns) relative to lap (first gate is 0)
  interval_ms: number  // Amount of ms since previous gate (first gate is 0)
}