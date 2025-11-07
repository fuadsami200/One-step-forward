// server.js
// يتطلب package.json يحتوي "type": "module"
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Pool } from "pg";

dotenv.config();

const app = express();

// ====== CORS ======
// نقرأ ALLOWED_ORIGIN من متغيّرات البيئة.
// إن لم يُحدد، نستخدم "*" (مفيد للاختبار لكن غير آمن للإنتاج).
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

if (allowedOrigin === "*") {
  app.use(cors());
  console.log("CORS: allowing all origins (*)");
} else {
  app.use(
    cors({
      origin: allowedOrigin,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    })
  );
  console.log("CORS: allowing origin ->", allowedOrigin);
}

// ====== Body parsers ======
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ====== Logging middleware ======
// هذا يساعدنا نرى إذا وصلت الطلبات من Netlify وما هو الـ origin
app.use((req, res, next) => {
  console.log("→ Incoming request:", req.method, req.url, "Origin:", req.headers.origin || "(no origin)");
  next();
});

// ====== Database (Postgres) setup ======
if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set in the environment.");
  // نترك التشغيل لكن Endpoint /api/testdb سيرد بخطأ واضح.
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // التحكم في SSL عبر متغير DB_SSL:
  // إذا ضبطته على "false" في متغيرات البيئة، نتجنّب rejectUnauthorized.
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

// ====== Routes ======
// Root
app.get("/", (req, res) => {
  res.send("✅ Rewards backend is running!");
});

// اختبار الاتصال بالقاعدة
app.get("/api/testdb", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({ ok: false, error: "DATABASE_URL not configured" });
  }

  try {
    const result = await pool.query("SELECT NOW()");
    return res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    return res.json({ ok: false, error: err.message || String(err) });
  }
});

// مثال endpoint بسيط
app.post("/api/ping", (req, res) => {
  return res.json({ ok: true, received: req.body || null });
});

// خطأ عام Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, error: err.message || "Internal error" });
});

// ====== Start server ======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
