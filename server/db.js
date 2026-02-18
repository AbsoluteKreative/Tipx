const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH
  ? path.join(process.env.DB_PATH, 'tipx.db')
  : path.join(__dirname, 'tipx.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patron_address TEXT NOT NULL,
    creator_address TEXT NOT NULL,
    amount REAL NOT NULL,
    chain TEXT NOT NULL DEFAULT 'arbitrum',
    tx_hash TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    creator_name TEXT
  );

  CREATE TABLE IF NOT EXISTS loyalty_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patron_address TEXT NOT NULL,
    creator_address TEXT NOT NULL,
    patron_cashback REAL NOT NULL,
    creator_bonus REAL NOT NULL,
    qualifying_total REAL NOT NULL,
    tx_hash TEXT,
    chain TEXT NOT NULL DEFAULT 'arbitrum',
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_contributions_pair ON contributions(patron_address, creator_address);
  CREATE INDEX IF NOT EXISTS idx_contributions_patron ON contributions(patron_address);
  CREATE INDEX IF NOT EXISTS idx_contributions_creator ON contributions(creator_address);
`);

module.exports = db;
