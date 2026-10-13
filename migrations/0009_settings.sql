-- App-wide settings the admin portal can change (e.g. the paywall), as simple key/value pairs.
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  INTEGER,
  updated_by  TEXT
);
