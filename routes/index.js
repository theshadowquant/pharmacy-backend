const express  = require("express");
const router   = express.Router();

const products = require("../controllers/productsController");
const batches  = require("../controllers/batchesController");
const sales    = require("../controllers/salesController");
const reports  = require("../controllers/reportsController");
const settings = require("../controllers/settingsController");

// Products
router.get   ("/products",              products.list);
router.get   ("/products/:id",          products.get);
router.post  ("/products",              products.create);
router.put   ("/products/:id",          products.update);
router.delete("/products/:id",          products.remove);
router.get   ("/products/:id/batches",  products.getBatches);

// Batches
router.get   ("/batches",        batches.list);
router.post  ("/batches",        batches.create);
router.put   ("/batches/:id",    batches.update);
router.delete("/batches/:id",    batches.remove);

// Sales
router.get   ("/sales",          sales.list);
router.get   ("/sales/:id",      sales.get);
router.post  ("/sales",          sales.create);
router.delete("/sales/:id",      sales.void);

// Reports
router.get("/reports/daily",     reports.daily);
router.get("/reports/low-stock", reports.lowStock);
router.get("/reports/expiry",    reports.expiry);
router.get("/reports/range",     reports.range);
router.get("/reports/inventory", reports.inventory);

// Settings
router.get ("/settings",         settings.getAll);
router.put ("/settings",         settings.update);

module.exports = router;