CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE,
    balance INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    amount INTEGER,
    type TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    key_name TEXT UNIQUE,
    display_name TEXT,
    provider_type TEXT,
    base_url TEXT
);

CREATE TABLE IF NOT EXISTS provider_credentials (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id),
    env_key TEXT,
    value_encrypted TEXT
);

CREATE TABLE IF NOT EXISTS provider_logs (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES providers(id),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
