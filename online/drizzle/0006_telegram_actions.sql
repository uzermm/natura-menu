CREATE TABLE telegram_order_buttons (
 token TEXT PRIMARY KEY,order_id TEXT NOT NULL,chat_id TEXT NOT NULL,message_id INTEGER,
 original_text TEXT NOT NULL,original_entities TEXT NOT NULL,last_state TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1,dirty INTEGER NOT NULL DEFAULT 0,last_note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL
);
CREATE INDEX telegram_order_buttons_order ON telegram_order_buttons(order_id,chat_id);
CREATE TABLE telegram_callback_results (
 query_id TEXT PRIMARY KEY,token TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,
 status TEXT NOT NULL,result_message TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL
);
CREATE TABLE telegram_bot_state (bot_key TEXT PRIMARY KEY,offset INTEGER NOT NULL DEFAULT 0,last_poll INTEGER,last_error TEXT);
CREATE TABLE telegram_callback_leases (bot_key TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at INTEGER NOT NULL);
