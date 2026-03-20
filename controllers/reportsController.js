// controllers/reportsController.js
const db = require("../models/db");

// GET /api/reports/daily?date=YYYY-MM-DD
exports.daily = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const summary = await db.getAsync(
      `SELECT COUNT(*) AS bills,
              COALESCE(SUM(subtotal),0)   AS subtotal,
              COALESCE(SUM(gst_amount),0) AS gst_amount,
              COALESCE(SUM(discount),0)   AS discount,
              COALESCE(SUM(total),0)      AS total
       FROM sales WHERE date(date)=date(?)`,
      [date]
    );
    const topProducts = await db.allAsync(
      `SELECT p.name,
              SUM(si.quantity) AS qty_sold,
              SUM(si.total)    AS revenue
       FROM sale_items si
       JOIN sales    s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE date(s.date)=date(?)
       GROUP BY p.id
       ORDER BY revenue DESC
       LIMIT 10`,
      [date]
    );
    const byPayment = await db.allAsync(
      `SELECT payment_mode, COUNT(*) AS count, SUM(total) AS total
       FROM sales WHERE date(date)=date(?) GROUP BY payment_mode`,
      [date]
    );
    res.json({ success: true, data: { date, summary, topProducts, byPayment } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/reports/low-stock?threshold=10
exports.lowStock = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold || 10);
    const rows = await db.allAsync(
      `SELECT p.id, p.name, p.category,
              b.id AS batch_id, b.batch_no, b.expiry,
              b.quantity, b.selling_price
       FROM batches b
       JOIN products p ON p.id = b.product_id
       WHERE b.quantity > 0 AND b.quantity <= ?
       ORDER BY b.quantity ASC`,
      [threshold]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/reports/expiry?days=90
exports.expiry = async (req, res) => {
  try {
    const days = parseInt(req.query.days || 90);
    const rows = await db.allAsync(
      `SELECT p.id, p.name, p.category,
              b.id AS batch_id, b.batch_no, b.expiry,
              b.quantity, b.selling_price,
              julianday(b.expiry) - julianday('now') AS days_left
       FROM batches b
       JOIN products p ON p.id = b.product_id
       WHERE b.quantity > 0
         AND b.expiry <= date('now', '+' || ? || ' days')
       ORDER BY b.expiry ASC`,
      [days]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/reports/range?from=&to=
exports.range = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({ success: false, error: "from and to required" });
    const daily = await db.allAsync(
      `SELECT date(date) AS day,
              COUNT(*)            AS bills,
              SUM(total)          AS revenue,
              SUM(gst_amount)     AS gst
       FROM sales
       WHERE date(date) BETWEEN date(?) AND date(?)
       GROUP BY day ORDER BY day`,
      [from, to]
    );
    const totals = await db.getAsync(
      `SELECT COUNT(*) AS bills,
              COALESCE(SUM(total),0)      AS revenue,
              COALESCE(SUM(gst_amount),0) AS gst,
              COALESCE(SUM(discount),0)   AS discount
       FROM sales WHERE date(date) BETWEEN date(?) AND date(?)`,
      [from, to]
    );
    res.json({ success: true, data: { daily, totals, from, to } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// GET /api/reports/inventory
exports.inventory = async (req, res) => {
  try {
    const rows = await db.allAsync(
      `SELECT p.id, p.name, p.category, p.gst, p.hsn,
              COUNT(b.id)          AS batch_count,
              COALESCE(SUM(b.quantity),0) AS total_qty,
              COALESCE(SUM(b.quantity * b.selling_price),0) AS stock_value
       FROM products p
       LEFT JOIN batches b ON b.product_id = p.id AND b.quantity > 0
       GROUP BY p.id
       ORDER BY p.name`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
