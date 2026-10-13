-- Per-word results, so reviews can bring back the words a learner finds hard.
CREATE TABLE IF NOT EXISTS word_stats (
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  right_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (user_id, word)
);
