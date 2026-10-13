-- Personal daily goal (XP per day) and the optional reason for learning, chosen during sign-up.
ALTER TABLE users ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 20;
ALTER TABLE users ADD COLUMN motive TEXT;
