// controllers/settingsController.js
const db = require("../models/db");

exports.getAll = async (req, res) => {
  try {
    const rows = await db.allAsync("SELECT * FROM settings");
    const obj = {};
    rows.forEach(r => { obj[r.key] = r.value; });
    res.json({ success: true, data: obj });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [key, String(value)]
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
