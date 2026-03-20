const db = require("./models/db");

async function setup() {
  console.log("⏳ Waiting for DB to initialize...");
  
  // Wait 2 seconds for initDb to finish
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log("🌱 Seeding pharmacy data...");

  const products = [
    { name: "Paracetamol 500mg",           category: "PMBI",    gst: 0,  hsn: "30049099" },
    { name: "Amoxicillin 500mg Cap",        category: "Branded", gst: 12, hsn: "30041010" },
    { name: "Dolo 650mg Tab",               category: "Branded", gst: 12, hsn: "30049099" },
    { name: "Cetirizine 10mg Tab",          category: "OTC",     gst: 5,  hsn: "30049019" },
    { name: "Pantoprazole 40mg Tab",        category: "Branded", gst: 12, hsn: "30049019" },
    { name: "Metformin 500mg Tab",          category: "PMBI",    gst: 0,  hsn: "30049099" },
    { name: "Azithromycin 500mg Tab",       category: "Branded", gst: 12, hsn: "30041090" },
    { name: "Betadine 10ml",                category: "OTC",     gst: 12, hsn: "30059099" },
    { name: "ORS Sachet (Electral)",        category: "OTC",     gst: 5,  hsn: "30049099" },
    { name: "Atorvastatin 10mg Tab",        category: "PMBI",    gst: 0,  hsn: "30049019" },
  ];

  for (const p of products) {
    await db.runAsync(
      "INSERT OR IGNORE INTO products (name, category, gst, hsn) VALUES (?,?,?,?)",
      [p.name, p.category, p.gst, p.hsn]
    );
  }
  console.log("✅ Products inserted");

  const rows = await db.allAsync("SELECT id, name FROM products");
  const idOf = {};
  rows.forEach(r => { idOf[r.name] = r.id; });

  const now = new Date();
  const addMonths = (d, m) => {
    const r = new Date(d); r.setMonth(r.getMonth() + m);
    return r.toISOString().split("T")[0];
  };

  const batches = [
    { name: "Paracetamol 500mg",      batch_no: "PC2401", expiry: addMonths(now,18), purchase_price: 12,  selling_price: 18,  quantity: 200 },
    { name: "Paracetamol 500mg",      batch_no: "PC2402", expiry: addMonths(now,8),  purchase_price: 11,  selling_price: 17,  quantity: 50  },
    { name: "Amoxicillin 500mg Cap",  batch_no: "AM2401", expiry: addMonths(now,24), purchase_price: 55,  selling_price: 75,  quantity: 100 },
    { name: "Dolo 650mg Tab",         batch_no: "DL2401", expiry: addMonths(now,20), purchase_price: 28,  selling_price: 35,  quantity: 150 },
    { name: "Dolo 650mg Tab",         batch_no: "DL2402", expiry: addMonths(now,1),  purchase_price: 27,  selling_price: 34,  quantity: 8   },
    { name: "Cetirizine 10mg Tab",    batch_no: "CT2401", expiry: addMonths(now,15), purchase_price: 20,  selling_price: 28,  quantity: 80  },
    { name: "Pantoprazole 40mg Tab",  batch_no: "PZ2401", expiry: addMonths(now,22), purchase_price: 45,  selling_price: 60,  quantity: 120 },
    { name: "Metformin 500mg Tab",    batch_no: "MF2401", expiry: addMonths(now,30), purchase_price: 22,  selling_price: 30,  quantity: 200 },
    { name: "Azithromycin 500mg Tab", batch_no: "AZ2401", expiry: addMonths(now,12), purchase_price: 85,  selling_price: 110, quantity: 60  },
    { name: "Betadine 10ml",          batch_no: "BD2401", expiry: addMonths(now,36), purchase_price: 40,  selling_price: 55,  quantity: 40  },
    { name: "ORS Sachet (Electral)",  batch_no: "OR2401", expiry: addMonths(now,18), purchase_price: 8,   selling_price: 12,  quantity: 5   },
    { name: "Atorvastatin 10mg Tab",  batch_no: "AT2401", expiry: addMonths(now,24), purchase_price: 35,  selling_price: 48,  quantity: 90  },
  ];

  for (const b of batches) {
    const product_id = idOf[b.name];
    if (!product_id) continue;
    await db.runAsync(
      `INSERT OR IGNORE INTO batches
         (product_id, batch_no, expiry, purchase_price, selling_price, quantity)
       VALUES (?,?,?,?,?,?)`,
      [product_id, b.batch_no, b.expiry, b.purchase_price, b.selling_price, b.quantity]
    );
  }
  console.log("✅ Batches inserted");
  console.log("🏥 Setup complete!");
  process.exit(0);
}

setup().catch(e => { console.error(e); process.exit(1); });