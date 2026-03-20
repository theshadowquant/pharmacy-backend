// server.js
require("./models/initDb");

const express    = require("express");
const cors       = require("cors");
const bodyParser = require("body-parser");
const path       = require("path");
const routes     = require("./routes/index");

const app  = express();
const PORT = process.env.PORT || 5000;

// Allow requests from any frontend origin (Vercel URL or custom domain)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

app.use("/api", routes);

// Health check
app.get("/", (_req, res) =>
  res.json({ status: "ok", app: "Pharmacy System Backend", version: "1.0.0" })
);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🏥  Pharmacy Backend running on port ${PORT}`);
  console.log(`📋  API base: http://localhost:${PORT}/api\n`);
});