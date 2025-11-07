// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

// إعداد قاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(express.json());
app.use(cors());

// ✅ اختبار الاتصال بالسيرفر
app.get("/", async (req, res) => {
  res.json({
    ok: true,
    time: new Date(),
    message: "Server is running successfully!"
  });
});

// ✅ جلب جميع المستخدمين
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ جلب جميع المزودين
app.get("/api/providers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM providers ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching providers:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ تعديل الإعدادات العامة
app.get("/api/settings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ تحديث إعداد معين
app.post("/api/settings", async (req, res) => {
  const { key, value } = req.body;
  try {
    await pool.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
      [key, value]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating settings:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ تشغيل السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
