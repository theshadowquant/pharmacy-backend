const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const fs      = require("fs");

const DATA_DIR = process.env.RAILWAY_ENVIRONMENT
  ? "/app/data"
  : path.join(__dirname);

if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}
}

const DB_PATH = path.join(DATA_DIR, "pharmacy.db");
console.log("📂 DB:", DB_PATH);

const db = new sqlite3.Database(DB_PATH);

function run(sql) {
  return new Promise((res, rej) =>
    db.run(sql, e => e ? rej(e) : res())
  );
}
function runP(sql, params) {
  return new Promise((res, rej) =>
    db.run(sql, params, function(e) {
      e ? rej(e) : res(this.lastID);
    })
  );
}
function all(sql) {
  return new Promise((res, rej) =>
    db.all(sql, [], (e, rows) => e ? rej(e) : res(rows))
  );
}

async function setup() {
  console.log("📋 Creating tables...");
  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, category TEXT NOT NULL,
    gst REAL DEFAULT 0, hsn TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  await run(`CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL, batch_no TEXT NOT NULL,
    expiry TEXT NOT NULL, purchase_price REAL NOT NULL,
    selling_price REAL NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  await run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL, customer TEXT DEFAULT 'Walk-in',
    subtotal REAL NOT NULL, gst_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0, total REAL NOT NULL,
    payment_mode TEXT DEFAULT 'Cash',
    date TEXT DEFAULT (datetime('now','localtime'))
  )`);
  await run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL, quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL, gst_rate REAL DEFAULT 0, total REAL NOT NULL
  )`);
  await run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT
  )`);

  // Default settings
  const defaults = [
    ["shop_name","MediCare Pharmacy"],["shop_address","123 Health Street"],
    ["shop_phone","+91 98765 43210"],["shop_gstin","29AABCU9603R1ZX"],
    ["invoice_prefix","INV-"],["invoice_counter","1000"],
    ["low_stock_threshold","10"],["expiry_alert_days","90"],
  ];
  for (const [k,v] of defaults) {
    await runP("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)", [k,v]);
  }
  console.log("✅ Tables created");

  // Products
  const products = [
    ["Paracetamol 500mg","PMBI",0,"30049099"],
    ["Amoxicillin 500mg Cap","Branded",12,"30041010"],
    ["Dolo 650mg Tab","Branded",12,"30049099"],
    ["Cetirizine 10mg Tab","OTC",5,"30049019"],
    ["Pantoprazole 40mg Tab","Branded",12,"30049019"],
    ["Metformin 500mg Tab","PMBI",0,"30049099"],
    ["Azithromycin 500mg Tab","Branded",12,"30041090"],
    ["Betadine 10ml","OTC",12,"30059099"],
    ["ORS Sachet (Electral)","OTC",5,"30049099"],
    ["Atorvastatin 10mg Tab","PMBI",0,"30049019"],
  ];
  for (const [name,cat,gst,hsn] of products) {
    await runP(
      "INSERT OR IGNORE INTO products (name,category,gst,hsn) VALUES (?,?,?,?)",
      [name,cat,gst,hsn]
    );
  }
  console.log("✅ Products inserted");

  const rows = await all("SELECT id,name FROM products");
  const idOf = {};
  rows.forEach(r => { idOf[r.name] = r.id; });

  const now = new Date();
  const exp = (m) => {
    const d = new Date(now); d.setMonth(d.getMonth()+m);
    return d.toISOString().split("T")[0];
  };

  const batches = [
    ["Paracetamol 500mg","PC2401",exp(18),12,18,200],
    ["Paracetamol 500mg","PC2402",exp(8),11,17,50],
    ["Amoxicillin 500mg Cap","AM2401",exp(24),55,75,100],
    ["Dolo 650mg Tab","DL2401",exp(20),28,35,150],
    ["Dolo 650mg Tab","DL2402",exp(1),27,34,8],
    ["Cetirizine 10mg Tab","CT2401",exp(15),20,28,80],
    ["Pantoprazole 40mg Tab","PZ2401",exp(22),45,60,120],
    ["Metformin 500mg Tab","MF2401",exp(30),22,30,200],
    ["Azithromycin 500mg Tab","AZ2401",exp(12),85,110,60],
    ["Betadine 10ml","BD2401",exp(36),40,55,40],
    ["ORS Sachet (Electral)","OR2401",exp(18),8,12,5],
    ["Atorvastatin 10mg Tab","AT2401",exp(24),35,48,90],
  ];

  for (const [name,batch_no,expiry,pp,sp,qty] of batches) {
    const pid = idOf[name];
    if (!pid) continue;
    await runP(
      `INSERT OR IGNORE INTO batches
       (product_id,batch_no,expiry,purchase_price,selling_price,quantity)
       VALUES (?,?,?,?,?,?)`,
      [pid,batch_no,expiry,pp,sp,qty]
    );
  }
  console.log("✅ Batches inserted");
  console.log("🏥 Setup complete! Starting server...");
  db.close();
}

setup().catch(e => { console.error("Setup failed:", e); process.exit(1); });