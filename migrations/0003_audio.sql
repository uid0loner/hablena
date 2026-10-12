-- Generated pronunciation audio (MP3), keyed by a hash of the Spanish text.
CREATE TABLE IF NOT EXISTS audio_cache (
  hash        TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,
  voice       TEXT NOT NULL,
  data        BLOB NOT NULL,
  created_at  INTEGER NOT NULL
);
