import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dbDir, 'races.db')

// Create the directory if it doesn't exist
fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(dbPath)

// Enable WAL mode — much better for concurrent reads
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export default db