import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// 👇 هذا السطر هو المفتاح
app.use(cors({ origin: "https://courageous-pastelito-cb5c1e.netlify.app" }));

app.use(express.json());
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Pool } from "pg";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors());
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

app.post("/api/testcrypto", (req, res) => {
  const secret = process.env.MASTER_KEY_BASE64 || "no-key";
  const encrypted = crypto
    .createHmac("sha256", secret)
    .update("test")
    .digest("hex");
  res.json({ ok: true, encrypted });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
