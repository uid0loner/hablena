-- Paddle subscriptions: link a user to their Paddle customer and subscription.
ALTER TABLE users ADD COLUMN paddle_customer_id TEXT;
ALTER TABLE users ADD COLUMN paddle_subscription_id TEXT;
ALTER TABLE users ADD COLUMN paddle_status TEXT;
ALTER TABLE users ADD COLUMN paddle_plan TEXT;
ALTER TABLE users ADD COLUMN paddle_updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_users_paddle_sub ON users (paddle_subscription_id);
