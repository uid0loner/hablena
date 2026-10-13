-- Admin portal: roles, premium entitlements, blocked and expiring (test) accounts, notes,
-- redeemable codes and an audit log of every admin action.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN premium_until INTEGER;
ALTER TABLE users ADD COLUMN premium_source TEXT;
ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN expires_at INTEGER;
ALTER TABLE users ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN note TEXT;

CREATE TABLE IF NOT EXISTS codes (
  code TEXT PRIMARY KEY,
  days INTEGER,
  lifetime INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 1,
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  disabled INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS code_redemptions (
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (code, user_id)
);

CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  admin_id TEXT,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  target_email TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_log_at ON admin_log (at);
CREATE INDEX IF NOT EXISTS idx_users_created ON users (created_at);
