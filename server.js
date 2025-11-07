// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Pool } from "pg";

dotenv.config();
const app = express();

// CORS: اسمح للواجهة Netlify بالاتصال (أو "*" للاختبار)
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging لكل طلب وارد
app.use((req, res, next) => {
  console.log("→ Incoming request:", req.method, req.url, "Origin:", req.headers.origin || "(no origin)");
  next();
});

// إعداد قاعدة البيانات (Postgres)
if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set in the environment.");
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

// Root
app.get("/", (req, res) => {
  res.send("✅ Rewards backend is running!");
});

// اختبار اتصال قاعدة البيانات
app.get("/api/testdb", async (req, res) => {
  if (!process.env.DATABASE_URL) return res.json({ ok: false, error: "DATABASE_URL not configured" });
  try {
    const result = await pool.query("SELECT NOW()");
    return res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    return res.json({ ok: false, error: err.message || String(err) });
  }
});

// إنشاء جدول users (مرة واحدة)
app.get("/api/init-db", async (req, res) => {
  if (!process.env.DATABASE_URL) return res.status(500).json({ ok: false, error: "DATABASE_URL not configured" });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    return res.json({ ok: true, message: "users table is ready" });
  } catch (err) {
    console.error("Init DB error:", err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// جلب المستخدمين
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 100");
    return res.json({ ok: true, users: result.rows });
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// إضافة مستخدم جديد
app.post("/api/users", async (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ ok: false, error: "name and email are required" });
  try {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at",
      [name, email]
    );
    return res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error("Create user error:", err);
    if (err.code === "23505") return res.status(409).json({ ok: false, error: "Email already exists" });
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// خطأ عام
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, error: err.message || "Internal error" });
});

// شغّل السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
