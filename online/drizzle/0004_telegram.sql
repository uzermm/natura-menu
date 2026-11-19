CREATE TABLE telegram_orders (
 order_id TEXT NOT NULL,
 chat_id TEXT NOT NULL,
 payload TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued',
 next_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 text_index INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(order_id,chat_id)
);
CREATE INDEX telegram_orders_queue ON telegram_orders(status,next_at);
