// server.js
// متوافق مع "type": "module" في package.json
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Pool } from "pg";

dotenv.config();

const app = express();

// إعدادات الـCORS:
// استخدم قيمة ALLOWED_ORIGIN من متغيرات البيئة إن وُجدت
// وإلا اسمح لكل المواقع (مفيد للاختبار). يفضّل ضبط ALLOWED_ORIGIN إلى رابط Netlify في الإنتاج.
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

if (allowedOrigin === "*") {
  app.use(cors());
} else {
  app.use(
    cors({
      origin: allowedOrigin,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    })
  );
}

app.use(bodyParser.json());

// تهيئة اتصال Postgres عبر متغيّر البيئة DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set in the environment.");
  // لا نوقف التشغيل هنا تلقائيًا — لكن سنظهر خطأ عند محاولة استخدام الـDB.
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render/Postgres قد يحتاج SSL=false أو SSL rejectUnauthorized false.
  // نستخدم rejectUnauthorized:false لنتجنّب مشاكل شهادة في بيئات مُدارة (مثل Render).
  // إن كان لديك CA موثوق يمكنك تغييره لاحقًا.
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

// بسيط endpoint للاختبار العام
app.get("/", (req, res) => {
  res.send("✅ Rewards backend is running successfully!");
});

// اختبار الاتصال بقاعدة البيانات
app.get("/api/testdb", async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({ ok: false, error: "DATABASE_URL not configured" });
  }

  try {
    // نستخدم استعلام بسيط للتحقق من التوقيت في DB
    const result = await pool.query("SELECT NOW()");
    return res.json({ ok: true, time: result.rows[0] });
  } catch (err) {
    console.error("DB error:", err);
    return res.json({ ok: false, error: err.message || String(err) });
  }
});

// مثال endpoint آمن يتطلب body
app.post("/api/ping", (req, res) => {
  return res.json({ ok: true, received: req.body || null });
});

// Middleware لاستقبال أخطاء غير متوقعة
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, error: err.message || "Internal error" });
});

// بدء السيرفر
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
