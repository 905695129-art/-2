PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS creator_sessions (
  token_hash TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  intro TEXT NOT NULL DEFAULT '',
  recipient TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS levels (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents >= 0),
  hint TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'text',
  content_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(experience_id, position)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES experiences(id),
  level_id TEXT NOT NULL REFERENCES levels(id),
  creator_id TEXT NOT NULL REFERENCES creators(id),
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'CNY',
  provider TEXT NOT NULL CHECK(provider IN ('wechat','alipay')),
  provider_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','refunded','failed','expired')),
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_order_id)
);

CREATE INDEX IF NOT EXISTS idx_experiences_creator ON experiences(creator_id);
CREATE INDEX IF NOT EXISTS idx_levels_experience ON levels(experience_id, position);
CREATE INDEX IF NOT EXISTS idx_orders_creator ON orders(creator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_experience ON orders(experience_id, created_at);
