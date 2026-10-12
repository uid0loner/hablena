-- Hablena accounts: users, sessions and brute-force protection.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT,
  password      TEXT NOT NULL,          -- pbkdf2$<iterations>$<salt b64>$<hash b64>
  lang          TEXT NOT NULL DEFAULT 'en',
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,         -- SHA-256 of the cookie token; the token itself is never stored
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS rate_events (
  key   TEXT NOT NULL,                  -- SHA-256 of e.g. "login:<email>" or "signup-ip:<ip>"
  ts    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_events_key_ts ON rate_events(key, ts);
