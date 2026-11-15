import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {PosError} from './pos-error.ts';
import type {PaymentMethod,Ticket} from './pos-types.ts';
const date=(v=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(v);
function addColumn(d:DatabaseSync,table:string,name:string,definition:string){if(!d.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name))d.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);}
export function initOperations(d:DatabaseSync){
 d.exec(`CREATE TABLE IF NOT EXISTS pos_day(id INTEGER PRIMARY KEY CHECK(id=1),day_id TEXT NOT NULL,opened_at TEXT NOT NULL,opening_cash INTEGER,last_close_id TEXT,last_closed_at TEXT);
 CREATE TABLE IF NOT EXISTS pos_payment_adjustments(id TEXT PRIMARY KEY,payment_id TEXT NOT NULL REFERENCES pos_payments(id),kind TEXT NOT NULL CHECK(kind IN ('refund','correction')),amount INTEGER NOT NULL CHECK(amount>0),method TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,day_id TEXT NOT NULL,replacement_id TEXT REFERENCES pos_payments(id));
 CREATE INDEX IF NOT EXISTS pos_adjustments_payment ON pos_payment_adjustments(payment_id);
 CREATE INDEX IF NOT EXISTS pos_adjustments_day ON pos_payment_adjustments(day_id,method);
 CREATE TABLE IF NOT EXISTS pos_refund_items(adjustment_id TEXT NOT NULL REFERENCES pos_payment_adjustments(id),allocation_id TEXT NOT NULL REFERENCES pos_payment_items(id),amount INTEGER NOT NULL CHECK(amount>0));
 CREATE INDEX IF NOT EXISTS pos_refund_items_allocation ON pos_refund_items(allocation_id);
 CREATE TABLE IF NOT EXISTS pos_cash_moves(id TEXT PRIMARY KEY,day_id TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('in','out')),amount INTEGER NOT NULL CHECK(amount>0),note TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS pos_cash_moves_day ON pos_cash_moves(day_id);
 CREATE TABLE IF NOT EXISTS pos_request_tombstones(id TEXT PRIMARY KEY,expires_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS employees(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('cashier','waiter','kitchen')),is_active INTEGER NOT NULL DEFAULT 1,permissions TEXT NOT NULL DEFAULT '[]' CHECK(permissions='[]'));`);
 addColumn(d,'pos_payments','day_id',"TEXT NOT NULL DEFAULT ''");addColumn(d,'pos_ledger','day_id',"TEXT NOT NULL DEFAULT ''");addColumn(d,'pos_tickets','closed_day_id',"TEXT NOT NULL DEFAULT ''");
 d.exec('CREATE INDEX IF NOT EXISTS pos_payments_period ON pos_payments(day_id,method);CREATE INDEX IF NOT EXISTS pos_ledger_period ON pos_ledger(day_id,method);CREATE INDEX IF NOT EXISTS pos_closed_period ON pos_tickets(closed_day_id,status)');
 if(!d.prepare('SELECT 1 FROM pos_day WHERE id=1').get()){
  const id=randomUUID(),today=date(),now=new Date(today+'T00:00:00+03:00').toISOString();d.prepare('INSERT INTO pos_day VALUES(1,?,?,NULL,NULL,NULL)').run(id,now);
  for(const [table,column] of [['pos_payments','created_at'],['pos_ledger','created_at'],['pos_tickets','closed_at']])d.prepare(`UPDATE ${table} SET ${table==='pos_tickets'?'closed_day_id':'day_id'}=? WHERE substr(datetime(${column},'+3 hours'),1,10)=?`).run(id,today);
 }
}
export function businessDay(d:DatabaseSync){return d.prepare('SELECT day_id,opened_at,opening_cash,last_closed_at FROM pos_day WHERE id=1').get() as unknown as {day_id:string;opened_at:string;opening_cash:number|null;last_closed_at:string|null};}
export function rejectExpiredRequest(d:DatabaseSync,id:string){if(d.prepare('SELECT 1 FROM pos_request_tombstones WHERE id=?').get(id))throw new PosError('Bu işlem kapanmış güne ait. Ekranı yenileyin.',409);}
export function dayTotals(d:DatabaseSync){
 const day=businessDay(d),totals={cash:0,card:0,meal_card:0,account:0};
 const payments=d.prepare('SELECT method,SUM(amount) AS value FROM pos_payments WHERE day_id=? GROUP BY method').all(day.day_id);
 const collections=d.prepare("SELECT method,SUM(-amount) AS value FROM pos_ledger WHERE day_id=? AND amount<0 AND method IN ('cash','card','meal_card') GROUP BY method").all(day.day_id);
 const reversals=d.prepare('SELECT method,SUM(-amount) AS value FROM pos_payment_adjustments WHERE day_id=? GROUP BY method').all(day.day_id);
 for(const r of [...payments,...collections,...reversals])totals[r.method as PaymentMethod]+=Number(r.value);
 const closed=d.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(discount),0) AS discount FROM pos_tickets WHERE status='closed' AND merged_into IS NULL AND closed_day_id=?").get(day.day_id)!;
 const moves=d.prepare("SELECT COALESCE(SUM(CASE WHEN kind='in' THEN amount ELSE 0 END),0) AS cash_in,COALESCE(SUM(CASE WHEN kind='out' THEN amount ELSE 0 END),0) AS cash_out FROM pos_cash_moves WHERE day_id=?").get(day.day_id)!;
 const refunds=Number(d.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM pos_payment_adjustments WHERE kind='refund' AND day_id=?").get(day.day_id)!.n);
 return {...day,date:date(new Date(day.opened_at)),...totals,closed_count:Number(closed.count),discount:Number(closed.discount),refunds,cash_in:Number(moves.cash_in),cash_out:Number(moves.cash_out),expected_cash:(day.opening_cash||0)+totals.cash+Number(moves.cash_in)-Number(moves.cash_out)};
}
export type PaymentChange={action:'refund';payment_id:string;amount:number;reason:string}|{action:'correct_payment';payment_id:string;method:PaymentMethod;account_id?:string;reason:string};
export function adjustPayment(d:DatabaseSync,t:Ticket,c:PaymentChange,actor:string){
 if(t.merged_into)throw new PosError('Birleştirilmiş kaynak yerine hedef adisyonu açın.');
 const p=d.prepare('SELECT p.*,p.amount-COALESCE((SELECT SUM(a.amount) FROM pos_payment_adjustments a WHERE a.payment_id=p.id),0) AS available FROM pos_payments p WHERE p.id=? AND p.ticket_id=?').get(c.payment_id,t.id);if(!p)throw new PosError('Ödeme bulunamadı.');
 const available=Number(p.available),value=c.action==='refund'?c.amount:available,reason=c.reason.trim();if(!reason||reason.length>500)throw new PosError('İşlem nedenini yazın.');if(!Number.isSafeInteger(value)||value<=0||value>available)throw new PosError('Tutar kalan iade edilebilir ödemeyi aşıyor.');
 const day=businessDay(d),id=randomUUID(),now=new Date().toISOString();let replacement:string|null=null;
 if(c.action==='correct_payment'){
  if(p.day_id!==day.day_id)throw new PosError('Ödeme türü yalnız açık günün kayıtlarında düzeltilebilir.');
  if(c.method===p.method&&(c.method!=='account'||c.account_id===p.account_id))throw new PosError('Farklı bir ödeme türü veya cari hesap seçin.');
  if(c.method==='account'&&!d.prepare('SELECT 1 FROM pos_accounts WHERE id=? AND is_active=1').get(c.account_id||''))throw new PosError('Aktif cari hesap seçin.');
  replacement=randomUUID();d.prepare('INSERT INTO pos_payments(id,ticket_id,method,amount,account_id,reference,actor,created_at,day_id) VALUES(?,?,?,?,?,?,?,?,?)').run(replacement,t.id,c.method,value,c.method==='account'?c.account_id!:null,reason,actor,now,day.day_id);
  if(c.method==='account')d.prepare('INSERT INTO pos_ledger(id,account_id,ticket_id,amount,method,note,actor,created_at,day_id) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),c.account_id!,t.id,value,'account',`Ödeme türü düzeltildi · ${reason}`,actor,now,day.day_id);
  d.prepare('UPDATE pos_payment_items SET payment_id=? WHERE payment_id=?').run(replacement,p.id);
 }
 d.prepare('INSERT INTO pos_payment_adjustments VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,p.id,c.action==='refund'?'refund':'correction',value,p.method,reason,actor,now,day.day_id,replacement);
 if(p.method==='account')d.prepare('INSERT INTO pos_ledger(id,account_id,ticket_id,amount,method,note,actor,created_at,day_id) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),p.account_id,t.id,-value,'account_refund',`${c.action==='refund'?'Cari iadesi':'Ödeme türü düzeltmesi'} · ${reason}`,actor,now,day.day_id);
 if(c.action==='refund'){
  const allocations=d.prepare('SELECT a.id,a.amount-COALESCE((SELECT SUM(r.amount) FROM pos_refund_items r WHERE r.allocation_id=a.id),0) AS available FROM pos_payment_items a WHERE a.payment_id=? ORDER BY a.rowid').all(p.id),sum=allocations.reduce((s,a)=>s+Number(a.available),0);let prefix=0;
  if(sum>0)for(const a of allocations){const next=prefix+Number(a.available),part=Number(BigInt(next)*BigInt(value)/BigInt(sum)-BigInt(prefix)*BigInt(value)/BigInt(sum));if(part>0)d.prepare('INSERT INTO pos_refund_items VALUES(?,?,?)').run(id,a.id,part);prefix=next;}
 }
}
export function keepCariTickets(d:DatabaseSync){
 d.exec('CREATE TEMP TABLE IF NOT EXISTS pos_keep_tickets(id TEXT PRIMARY KEY);DELETE FROM pos_keep_tickets;INSERT OR IGNORE INTO pos_keep_tickets SELECT ticket_id FROM pos_ledger WHERE ticket_id IS NOT NULL');
 let changed;do{changed=Number(d.prepare('INSERT OR IGNORE INTO pos_keep_tickets SELECT merged_into FROM pos_tickets WHERE id IN (SELECT id FROM pos_keep_tickets) AND merged_into IS NOT NULL').run().changes)+Number(d.prepare('INSERT OR IGNORE INTO pos_keep_tickets SELECT id FROM pos_tickets WHERE merged_into IN (SELECT id FROM pos_keep_tickets)').run().changes);}while(changed);
}
export function cariExport(d:DatabaseSync){keepCariTickets(d);const tables={accounts:d.prepare('SELECT * FROM pos_accounts').all(),ledger:d.prepare('SELECT * FROM pos_ledger').all(),tickets:d.prepare('SELECT * FROM pos_tickets WHERE id IN (SELECT id FROM pos_keep_tickets)').all(),lines:d.prepare('SELECT * FROM pos_lines WHERE ticket_id IN (SELECT id FROM pos_keep_tickets)').all(),payments:d.prepare('SELECT * FROM pos_payments WHERE ticket_id IN (SELECT id FROM pos_keep_tickets)').all(),allocations:d.prepare('SELECT a.* FROM pos_payment_items a JOIN pos_payments p ON p.id=a.payment_id WHERE p.ticket_id IN (SELECT id FROM pos_keep_tickets)').all(),adjustments:d.prepare('SELECT a.* FROM pos_payment_adjustments a JOIN pos_payments p ON p.id=a.payment_id WHERE p.ticket_id IN (SELECT id FROM pos_keep_tickets)').all(),refund_items:d.prepare('SELECT r.* FROM pos_refund_items r JOIN pos_payment_adjustments a ON a.id=r.adjustment_id JOIN pos_payments p ON p.id=a.payment_id WHERE p.ticket_id IN (SELECT id FROM pos_keep_tickets)').all()};return {format:'natura-cari',version:1,created_at:new Date().toISOString(),tables};}
export function closePreview(d:DatabaseSync){keepCariTickets(d);return {day:dayTotals(d),revision:String(d.prepare('SELECT COALESCE(MAX(rowid),0) AS n FROM pos_events').get()!.n),open_count:Number(d.prepare("SELECT COUNT(*) AS n FROM pos_tickets WHERE status='open'").get()!.n),pending_count:Number(d.prepare("SELECT COUNT(*) AS n FROM pos_orders WHERE status='pending'").get()!.n),kept_count:Number(d.prepare('SELECT COUNT(*) AS n FROM pos_keep_tickets').get()!.n),delete_count:Number(d.prepare('SELECT COUNT(*) AS n FROM pos_tickets WHERE id NOT IN (SELECT id FROM pos_keep_tickets)').get()!.n)};}
export function closeBusinessDay(d:DatabaseSync,input:{request_id:string;day_id:string;revision:string;counted_cash:number;note:string},protect:(snapshot:ReturnType<typeof cariExport>)=>void){
 d.exec('BEGIN IMMEDIATE');try{
  const last=d.prepare('SELECT last_close_id,last_closed_at FROM pos_day WHERE id=1').get()!;if(last.last_close_id===input.request_id){d.exec('COMMIT');return {closed_at:String(last.last_closed_at),day_id:businessDay(d).day_id};}
  rejectExpiredRequest(d,input.request_id);const preview=closePreview(d);if(preview.day.day_id!==input.day_id||preview.revision!==input.revision)throw new PosError('Gün içindeki işlemler değişti. Özeti yenileyip tekrar kontrol edin.',409);
  if(preview.open_count||preview.pending_count)throw new PosError('Açık hesapları ve bekleyen siparişleri tamamlamadan gün kapatılamaz.');
  if(!Number.isSafeInteger(input.counted_cash)||input.counted_cash<0)throw new PosError('Sayılan nakit tutarını girin.');if(input.counted_cash!==preview.day.expected_cash&&!input.note.trim())throw new PosError('Kasa farkının nedenini yazın.');
  protect(cariExport(d));
  d.exec("DELETE FROM pos_request_tombstones WHERE expires_at<datetime('now');INSERT OR IGNORE INTO pos_request_tombstones SELECT id,datetime('now','+30 days') FROM pos_requests;DELETE FROM pos_requests;DELETE FROM pos_orders;DELETE FROM pos_cash_moves");
  d.exec('DELETE FROM pos_refund_items WHERE adjustment_id IN (SELECT a.id FROM pos_payment_adjustments a JOIN pos_payments p ON p.id=a.payment_id WHERE p.ticket_id NOT IN (SELECT id FROM pos_keep_tickets));DELETE FROM pos_payment_adjustments WHERE payment_id IN (SELECT id FROM pos_payments WHERE ticket_id NOT IN (SELECT id FROM pos_keep_tickets));DELETE FROM pos_payment_items WHERE payment_id IN (SELECT id FROM pos_payments WHERE ticket_id NOT IN (SELECT id FROM pos_keep_tickets));DELETE FROM pos_payments WHERE ticket_id NOT IN (SELECT id FROM pos_keep_tickets);DELETE FROM pos_lines WHERE ticket_id NOT IN (SELECT id FROM pos_keep_tickets);DELETE FROM pos_events WHERE ticket_id IS NULL OR ticket_id NOT IN (SELECT id FROM pos_keep_tickets);UPDATE pos_tickets SET merged_into=NULL WHERE id NOT IN (SELECT id FROM pos_keep_tickets);DELETE FROM pos_tickets WHERE id NOT IN (SELECT id FROM pos_keep_tickets)');
  // Calls are not financial records and can be discarded at the operator's day close.
  if(d.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='waiter_calls'").get())d.exec('DELETE FROM waiter_calls');
  d.prepare("INSERT OR IGNORE INTO pos_request_tombstones VALUES(?,datetime('now','+30 days'))").run(input.request_id);
  const now=new Date().toISOString(),next=randomUUID();d.prepare('UPDATE pos_day SET day_id=?,opened_at=?,opening_cash=NULL,last_close_id=?,last_closed_at=? WHERE id=1').run(next,now,input.request_id,now);d.exec('COMMIT');return {closed_at:now,day_id:next};
 }catch(error){d.exec('ROLLBACK');throw error;}
}
