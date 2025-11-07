// server.js - نظيف ومهيأ للاستخدام مع "type": "module"
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Pool } from "pg";

dotenv.config();

const app = express();

// اسمح بالطلبات من لوحة Netlify فقط (أكثر أمانًا)
// استبدل الرابط إذا كان مختلفًا
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://courageous-pastelito-cb5c1e.netlify.app";
app.use(cors({ origin: ALLOWED_ORIGIN }));

app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/", (req, res) => {
  res.send("✅ Rewards backend is running successfully!");
});

app.get("/api/testdb", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
