CREATE TABLE push_subscriptions (
 endpoint TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 subscription TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
