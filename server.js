// server.js
import express from "express";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
app.use(express.json());

// Read environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ""; // مثلا https://courageous-pastelito-cb5c1e.netlify.app
const PORT = process.env.PORT || 10000;

// CORS config
if (ALLOWED_ORIGIN) {
  app.use(cors({ origin: ALLOWED_ORIGIN }));
} else {
  // Allow all origins only for debugging (غير آمن للإنتاج) — لكن الأفضل وضع ALLOWED_ORIGIN في متغيرات Render
  app.use(cors());
}

// Basic check
app.get("/api/testdb", async (req, res) => {
  try {
    return res.json({ ok: true, time: { now: new Date().toISOString() } });
  } catch (err) {
    console.error("testdb error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Ensure DATABASE_URL exists
if (!DATABASE_URL) {
  console.error("FATAL: DATABASE_URL is not set in the environment.");
  // don't crash immediately — but endpoints that need DB will fail with clear message
}

// Create pg pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  // If Render requires ssl: { rejectUnauthorized: false } uncomment below
  // ssl: { rejectUnauthorized: false }
});

// Helper: ensure users table exists
async function ensureUsersTable() {
  const createSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(createSQL);
}

// Endpoint to explicitly create/init DB table
app.get("/api/init-db", async (req, res) => {
  try {
    await ensureUsersTable();
    return res.json({ ok: true, message: "users table created or already exists" });
  } catch (err) {
    console.error("init-db error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Get users
app.get("/api/users", async (req, res) => {
  if (!DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "DATABASE_URL not configured" });
  }
  try {
    const q = await pool.query("SELECT id, name, email, created_at FROM users ORDER BY id DESC LIMIT 100;");
    return res.json({ ok: true, users: q.rows });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Add user
app.post("/api/users", async (req, res) => {
  if (!DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "DATABASE_URL not configured" });
  }
  const { name, email } = req.body || {};
  if (!name || !email) return res.status(400).json({ ok: false, error: "name and email required" });

  try {
    const insertSQL = "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at;";
    const result = await pool.query(insertSQL, [name, email]);
    const user = result.rows[0];
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("POST /api/users error:", err);
    // If duplicate key on email, send readable message
    if (err.code === "23505") {
      return res.status(400).json({ ok: false, error: "Email already exists" });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Start server: but first ensure table (best-effort)
async function start() {
  try {
    if (DATABASE_URL) {
      // Try ensure table on startup (catch errors but don't crash)
      try {
        await ensureUsersTable();
        console.log("✅ users table ensured");
      } catch (e) {
        console.warn("Warning: could not ensure users table on startup:", e.message);
      }
    } else {
      console.warn("Warning: DATABASE_URL not set — DB endpoints will fail until configured.");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (e) {
    console.error("Fatal start error:", e);
    process.exit(1);
  }
}

start();
