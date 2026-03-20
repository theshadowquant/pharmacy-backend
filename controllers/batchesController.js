// controllers/batchesController.js
const db = require("../models/db");

// GET /api/batches?product_id=&expiring_in=
exports.list = async (req, res) => {
  try {
    const { product_id, expiring_in, low_stock } = req.query;
    let sql = `
      SELECT b.*, p.name AS product_name, p.category, p.gst, p.hsn
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE 1=1
    `;
    const params = [];
    if (product_id) { sql += " AND b.product_id = ?"; params.push(product_id); }
    if (expiring_in) {
      sql += " AND b.expiry <= date('now', '+' || ? || ' days') AND b.quantity > 0";
      params.push(parseInt(expiring_in));
    }
    if (low_stock) {
      sql += " AND b.quantity > 0 AND b.quantity <= ?";
      params.push(parseInt(low_stock));
    }
    sql += " ORDER BY b.expiry ASC";
    const rows = await db.allAsync(sql, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// POST /api/batches
exports.create = async (req, res) => {
  try {
    const {
      product_id, batch_no, expiry,
      purchase_price, selling_price, quantity
    } = req.body;
    if (!product_id || !batch_no || !expiry || !selling_price || !quantity)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    const result = await db.runAsync(
      `INSERT INTO batches
         (product_id, batch_no, expiry, purchase_price, selling_price, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_id, batch_no.trim(), expiry, purchase_price || 0, selling_price, quantity]
    );
    const batch = await db.getAsync(
      `SELECT b.*, p.name AS product_name
       FROM batches b JOIN products p ON p.id = b.product_id
       WHERE b.id = ?`,
      [result.lastID]
    );
    res.status(201).json({ success: true, data: batch });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// PUT /api/batches/:id
exports.update = async (req, res) => {
  try {
    const { batch_no, expiry, purchase_price, selling_price, quantity } = req.body;
    await db.runAsync(
      `UPDATE batches
       SET batch_no=?, expiry=?, purchase_price=?, selling_price=?, quantity=?
       WHERE id=?`,
      [batch_no, expiry, purchase_price, selling_price, quantity, req.params.id]
    );
    const batch = await db.getAsync(
      "SELECT * FROM batches WHERE id = ?", [req.params.id]
    );
    res.json({ success: true, data: batch });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// DELETE /api/batches/:id
exports.remove = async (req, res) => {
  try {
    await db.runAsync("DELETE FROM batches WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
