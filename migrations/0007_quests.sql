-- Daily quests (perfect lessons, practice sessions, stories, quest bonus), streak freezes.
ALTER TABLE activity ADD COLUMN perfect INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity ADD COLUMN practice INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity ADD COLUMN stories INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity ADD COLUMN bonus INTEGER NOT NULL DEFAULT 0;
ALTER TABLE activity ADD COLUMN frozen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN freezes INTEGER NOT NULL DEFAULT 0;
