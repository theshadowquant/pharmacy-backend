// controllers/salesController.js
const db = require("../models/db");

// Helper: generate invoice number
async function nextInvoiceNo() {
  const prefix  = await db.getAsync("SELECT value FROM settings WHERE key='invoice_prefix'");
  const counter = await db.getAsync("SELECT value FROM settings WHERE key='invoice_counter'");
  const num = parseInt(counter ? counter.value : 1000) + 1;
  await db.runAsync(
    "UPDATE settings SET value=? WHERE key='invoice_counter'", [String(num)]
  );
  return `${prefix ? prefix.value : "INV-"}${num}`;
}

// POST /api/sales  — create a new bill with FIFO stock deduction
exports.create = async (req, res) => {
  const { items, customer = "Walk-in", discount = 0, payment_mode = "Cash" } = req.body;
  if (!items || !items.length)
    return res.status(400).json({ success: false, error: "No items in sale" });

  // We'll do everything in a serialized promise chain (SQLite is single-writer)
  try {
    const invoice_no = await nextInvoiceNo();
    let subtotal   = 0;
    let gst_amount = 0;
    const resolvedItems = []; // { product_id, batch_id, quantity, unit_price, gst_rate, total }

    // For each requested item, resolve FIFO batches
    for (const item of items) {
      const { product_id, quantity } = item;
      const product = await db.getAsync("SELECT * FROM products WHERE id=?", [product_id]);
      if (!product) throw new Error(`Product ${product_id} not found`);

      const batches = await db.allAsync(
        `SELECT * FROM batches
         WHERE product_id = ? AND quantity > 0
         ORDER BY expiry ASC`,
        [product_id]
      );

      let remaining = quantity;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        const lineTotal = deduct * batch.selling_price;
        // MRP is GST-inclusive: extract GST from price (don't add on top)
        const gstRate   = product.gst || 0;
        const lineGst   = lineTotal - (lineTotal / (1 + gstRate / 100));
        const lineBase  = lineTotal / (1 + gstRate / 100);
        subtotal   += lineBase;
        gst_amount += lineGst;
        resolvedItems.push({
          product_id,
          batch_id:   batch.id,
          quantity:   deduct,
          unit_price: batch.selling_price,
          gst_rate:   gstRate,
          total:      lineTotal,
        });
        remaining -= deduct;
      }
      if (remaining > 0)
        throw new Error(`Insufficient stock for "${product.name}" (need ${quantity}, short by ${remaining})`);
    }

    // MRP is GST-inclusive: total = sum of MRP prices minus discount
    const mrpTotal = resolvedItems.reduce((s, r) => s + r.quantity * r.unit_price, 0);
    const total = mrpTotal - discount;

    // Insert sale record
    const saleResult = await db.runAsync(
      `INSERT INTO sales (invoice_no, customer, subtotal, gst_amount, discount, total, payment_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoice_no, customer, subtotal, gst_amount, discount, total, payment_mode]
    );
    const sale_id = saleResult.lastID;

    // Insert sale_items and deduct stock
    for (const ri of resolvedItems) {
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, gst_rate, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sale_id, ri.product_id, ri.batch_id, ri.quantity, ri.unit_price, ri.gst_rate, ri.total]
      );
      await db.runAsync(
        "UPDATE batches SET quantity = quantity - ? WHERE id = ?",
        [ri.quantity, ri.batch_id]
      );
    }

    // Fetch full sale with items for receipt
    const sale = await exports._getSaleById(sale_id);
    res.status(201).json({ success: true, data: sale });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
};

// Shared helper
exports._getSaleById = async (id) => {
  const sale = await db.getAsync("SELECT * FROM sales WHERE id = ?", [id]);
  if (!sale) return null;
  sale.items = await db.allAsync(
    `SELECT si.*, p.name AS product_name, p.hsn, b.batch_no, b.expiry
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     JOIN batches  b ON b.id = si.batch_id
     WHERE si.sale_id = ?`,
    [id]
  );
  return sale;
};

// GET /api/sales/:id
exports.get = async (req, res) => {
  try {
    const sale = await exports._getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: sale });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/sales?date=YYYY-MM-DD&from=&to=
exports.list = async (req, res) => {
  try {
    const { date, from, to, limit = 50, offset = 0 } = req.query;
    let sql    = "SELECT * FROM sales WHERE 1=1";
    const params = [];
    if (date) { sql += " AND date(date)=date(?)"; params.push(date); }
    if (from) { sql += " AND date(date)>=date(?)"; params.push(from); }
    if (to)   { sql += " AND date(date)<=date(?)"; params.push(to); }
    sql += " ORDER BY date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));
    const rows = await db.allAsync(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// DELETE /api/sales/:id  (void sale — restores stock)
exports.void = async (req, res) => {
  try {
    const items = await db.allAsync(
      "SELECT * FROM sale_items WHERE sale_id=?", [req.params.id]
    );
    for (const item of items) {
      await db.runAsync(
        "UPDATE batches SET quantity = quantity + ? WHERE id = ?",
        [item.quantity, item.batch_id]
      );
    }
    await db.runAsync("DELETE FROM sales WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};