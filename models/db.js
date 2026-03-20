const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");

// Always store DB in the project folder
const DATA_DIR = path.join(__dirname, "..");
const DB_PATH  = path.join(DATA_DIR, "pharmacy.db");

console.log("📂 Database path:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Cannot open DB:", err.message);
    process.exit(1);
  }
});

db.run("PRAGMA foreign_keys = ON");
db.run("PRAGMA journal_mode = WAL");

db.getAsync = (sql, params = []) =>
  new Promise((res, rej) =>
    db.get(sql, params, (e, row) => (e ? rej(e) : res(row)))
  );

db.allAsync = (sql, params = []) =>
  new Promise((res, rej) =>
    db.all(sql, params, (e, rows) => (e ? rej(e) : res(rows)))
  );

db.runAsync = (sql, params = []) =>
  new Promise((res, rej) =>
    db.run(sql, params, function (e) {
      if (e) return rej(e);
      res({ lastID: this.lastID, changes: this.changes });
    })
  );

module.exports = db;