// server.js
import express from 'express';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const { Pool } = pkg;

// اقرأ متغيرات البيئة
const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL; // موجود عندك
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'; // ضع متغير في Render
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // أو من Netlify

if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set in the environment.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const app = express();
app.use(express.json());
app.use(cors({
  origin: ALLOWED_ORIGIN,
}));

// helper: authenticate middleware
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ ok: false, error: 'No token' });
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ ok: false, error: 'Invalid token' });
    req.user = user; // { id, email }
    next();
  });
}

/** --- Basic endpoints --- **/

app.get('/', (req, res) => {
  res.json({ ok: true, time: { now: new Date().toISOString() } });
});

/** Create users table if not exists */
app.post('/setup-db', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        password_hash text,
        created_at timestamptz DEFAULT now()
      );
    `);
    res.json({ ok: true, message: 'users table created or already exists' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Register (create account) */
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !name || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    const q = 'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at';
    const values = [name, email, hash];
    const { rows } = await pool.query(q, values);
    const user = rows[0];

    // create token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique_violation
      return res.status(400).json({ ok: false, error: 'Email already exists' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Login */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });

    const { rows } = await pool.query('SELECT id, email, name, password_hash FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash || '');
    if (!match) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Get list of users (protected) */
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY id DESC');
    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Add user (protected) -- can create user without password (admin creates) */
app.post('/users', authenticateToken, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ ok: false, error: 'Missing name/email' });

    let hash = null;
    if (password) {
      hash = await bcrypt.hash(password, 10);
    }
    const q = 'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at';
    const { rows } = await pool.query(q, [name, email, hash]);
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ ok: false, error: 'Email exists' });
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Update user (protected) */
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, password } = req.body;
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid id' });

    const fields = [];
    const values = [];
    let idx = 1;
    if (name) { fields.push(`name=$${idx++}`); values.push(name); }
    if (email) { fields.push(`email=$${idx++}`); values.push(email); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password_hash=$${idx++}`);
      values.push(hashed);
    }
    if (fields.length === 0) return res.status(400).json({ ok: false, error: 'No fields to update' });

    values.push(id);
    const q = `UPDATE users SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id,name,email,created_at`;
    const { rows } = await pool.query(q, values);
    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Delete user (protected) */
app.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ ok: true, deleted: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** Stats endpoint (protected) */
app.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS users_count FROM users');
    res.json({ ok: true, stats: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** start server */
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    // optional: ensure table exists at start
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id serial PRIMARY KEY,
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        password_hash text,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('users table ensured');
  } catch (err) {
    console.error('DB setup error', err);
  }
});
