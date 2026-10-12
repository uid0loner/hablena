-- XP earned per user and local calendar day (for streaks and daily goals).
CREATE TABLE IF NOT EXISTS activity (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day      TEXT NOT NULL,              -- YYYY-MM-DD in the learner's local time
  xp       INTEGER NOT NULL DEFAULT 0,
  lessons  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
