-- Lesson progress per user.
CREATE TABLE IF NOT EXISTS progress (
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id           TEXT NOT NULL,
  best_correct        INTEGER NOT NULL,
  total               INTEGER NOT NULL,
  attempts            INTEGER NOT NULL DEFAULT 1,
  first_completed_at  INTEGER NOT NULL,
  last_completed_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
