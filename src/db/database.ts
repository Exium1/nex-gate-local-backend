import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'data', 'races.db'))

// Enable WAL mode — much better for concurrent reads
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export default db