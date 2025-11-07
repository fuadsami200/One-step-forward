-- إنشاء الجداول الأساسية في قاعدة البيانات

-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  balance NUMERIC DEFAULT 0,
  payout_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- جدول مزودي العروض/الاستطلاعات
CREATE TABLE IF NOT EXISTS providers (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- جدول الإعدادات العامة
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- إدخال قيمة افتراضية للإعدادات
INSERT INTO settings (key, value)
  VALUES ('default_payout_percent','70')
ON CONFLICT (key) DO NOTHING;
