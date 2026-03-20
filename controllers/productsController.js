// controllers/productsController.js
const db = require("../models/db");

// GET /api/products?q=&category=
exports.list = async (req, res) => {
  try {
    const search   = req.query.q        || "";
    const category = req.query.category || "";
    let sql    = `SELECT p.*,
                    COALESCE(SUM(b.quantity),0) AS stock
                  FROM products p
                  LEFT JOIN batches b ON b.product_id = p.id
                  WHERE p.name LIKE ?`;
    const params = [`%${search}%`];
    if (category) { sql += " AND p.category = ?"; params.push(category); }
    sql += " GROUP BY p.id ORDER BY p.name ASC";
    const rows = await db.allAsync(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/products/:id
exports.get = async (req, res) => {
  try {
    const product = await db.getAsync(
      "SELECT * FROM products WHERE id = ?", [req.params.id]
    );
    if (!product) return res.status(404).json({ success: false, error: "Not found" });
    const batches = await db.allAsync(
      `SELECT * FROM batches WHERE product_id = ? ORDER BY expiry ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...product, batches } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// POST /api/products
exports.create = async (req, res) => {
  try {
    const { name, category, gst = 0, hsn = "" } = req.body;
    if (!name || !category)
      return res.status(400).json({ success: false, error: "name and category required" });
    const result = await db.runAsync(
      "INSERT INTO products (name, category, gst, hsn) VALUES (?, ?, ?, ?)",
      [name.trim(), category, gst, hsn.trim()]
    );
    const product = await db.getAsync(
      "SELECT * FROM products WHERE id = ?", [result.lastID]
    );
    res.status(201).json({ success: true, data: product });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// PUT /api/products/:id
exports.update = async (req, res) => {
  try {
    const { name, category, gst, hsn } = req.body;
    await db.runAsync(
      `UPDATE products SET name=?, category=?, gst=?, hsn=? WHERE id=?`,
      [name, category, gst, hsn, req.params.id]
    );
    const product = await db.getAsync(
      "SELECT * FROM products WHERE id = ?", [req.params.id]
    );
    res.json({ success: true, data: product });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// DELETE /api/products/:id
exports.remove = async (req, res) => {
  try {
    await db.runAsync("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/products/:id/batches  (active batches with stock)
exports.getBatches = async (req, res) => {
  try {
    const batches = await db.allAsync(
      `SELECT b.*, p.name AS product_name, p.gst, p.category
       FROM batches b JOIN products p ON p.id = b.product_id
       WHERE b.product_id = ? AND b.quantity > 0
       ORDER BY b.expiry ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: batches });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
