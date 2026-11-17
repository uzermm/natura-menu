import type {DatabaseSync} from 'node:sqlite';
export function initOrderActivity(d:DatabaseSync){
 if(d.prepare('PRAGMA table_info(pos_tickets)').all().some(c=>c.name==='last_order_at'))return;
 d.exec(`ALTER TABLE pos_tickets ADD COLUMN last_order_at TEXT;
 CREATE INDEX IF NOT EXISTS pos_events_order_activity ON pos_events(ticket_id,action,created_at);
 UPDATE pos_tickets SET last_order_at=MAX(opened_at,
 COALESCE((SELECT MAX(created_at) FROM pos_lines WHERE ticket_id=pos_tickets.id),opened_at),
 COALESCE((SELECT MAX(created_at) FROM pos_events WHERE (ticket_id=pos_tickets.id OR ticket_id IN (SELECT id FROM pos_tickets source WHERE source.merged_into=pos_tickets.id)) AND action IN ('add','order_accept')),opened_at));`);
}
export function recordOrderActivity(d:DatabaseSync,id:string){d.prepare('UPDATE pos_tickets SET last_order_at=? WHERE id=?').run(new Date().toISOString(),id);}
