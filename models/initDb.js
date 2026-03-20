// models/initDb.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "../pharmacy.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
});

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL"); // Better concurrent read performance

  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      category   TEXT CHECK(category IN ('PMBI','Branded','OTC')) NOT NULL,
      gst        REAL DEFAULT 0,
      hsn        TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `, (err) => { if (err) console.error("products:", err.message); });

  // Batches table
  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id     INTEGER NOT NULL,
      batch_no       TEXT NOT NULL,
      expiry         TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      selling_price  REAL NOT NULL,
      quantity       INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error("batches:", err.message); });

  // Sales table
  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no   TEXT UNIQUE NOT NULL,
      customer     TEXT DEFAULT 'Walk-in',
      subtotal     REAL NOT NULL,
      gst_amount   REAL DEFAULT 0,
      discount     REAL DEFAULT 0,
      total        REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      date         TEXT DEFAULT (datetime('now','localtime'))
    )
  `, (err) => { if (err) console.error("sales:", err.message); });

  // Sale items table
  db.run(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id    INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      batch_id   INTEGER NOT NULL,
      quantity   INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate   REAL DEFAULT 0,
      total      REAL NOT NULL,
      FOREIGN KEY (sale_id)    REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id)   REFERENCES batches(id)
    )
  `, (err) => { if (err) console.error("sale_items:", err.message); });

  // Settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `, (err) => {
    if (err) { console.error("settings:", err.message); return; }
    // Seed default settings
    const defaults = [
      ["shop_name",    "MediCare Pharmacy"],
      ["shop_address", "123 Health Street, City - 560001"],
      ["shop_phone",   "+91 98765 43210"],
      ["shop_gstin",   "29AABCU9603R1ZX"],
      ["invoice_prefix","INV-"],
      ["invoice_counter","1000"],
      ["low_stock_threshold","10"],
      ["expiry_alert_days","90"],
    ];
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
    );
    defaults.forEach(([k, v]) => stmt.run(k, v));
    stmt.finalize();
  });

  console.log("Database schema initialized successfully.");
});

module.exports = db;
