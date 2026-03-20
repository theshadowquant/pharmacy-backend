// models/db.js
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");

// On Render, use /var/data (persistent disk).
// Locally, use the backend folder itself.
const DATA_DIR = process.env.RENDER
  ? "/var/data"
  : path.join(__dirname, "..");

// Make sure the directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "pharmacy.db");
console.log("📂 Database path:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Cannot open DB:", err.message);
    process.exit(1);
  }
});

db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

// Promisified helpers
db.getAsync  = (sql, params = []) =>
  new Promise((res, rej) =>
    db.get(sql, params, (e, row) => (e ? rej(e) : res(row)))
  );

db.allAsync  = (sql, params = []) =>
  new Promise((res, rej) =>
    db.all(sql, params, (e, rows) => (e ? rej(e) : res(rows)))
  );

db.runAsync  = (sql, params = []) =>
  new Promise((res, rej) =>
    db.run(sql, params, function (e) {
      if (e) return rej(e);
      res({ lastID: this.lastID, changes: this.changes });
    })
  );

module.exports = db;