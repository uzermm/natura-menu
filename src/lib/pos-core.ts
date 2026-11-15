import { randomUUID } from 'node:crypto';
import { lineKey,quoteItemPayment } from './pos-lines.ts';
import type { DatabaseSync } from 'node:sqlite';
import { ticketLabel,type QuickMetadata,type Account,type AccountEntry,type OrderSource,type PaymentMethod,type PendingOrder,type PosSummary,type Ticket,type TicketLine,type TicketPayment } from './pos-types.ts';

export class PosError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
export function initPos(d:DatabaseSync){d.exec(`
 CREATE TABLE IF NOT EXISTS pos_tickets(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,table_number INTEGER NOT NULL CHECK(table_number>0),status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),version INTEGER NOT NULL DEFAULT 1,opened_at TEXT NOT NULL,closed_at TEXT,discount INTEGER NOT NULL DEFAULT 0 CHECK(discount>=0),note TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS pos_lines(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES pos_tickets(id),item_id TEXT NOT NULL,name TEXT NOT NULL,variant TEXT NOT NULL DEFAULT '',unit_price INTEGER NOT NULL CHECK(unit_price>=0),quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 999),note TEXT NOT NULL DEFAULT '',source TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,voided_at TEXT,void_reason TEXT NOT NULL DEFAULT '');
 CREATE INDEX IF NOT EXISTS pos_lines_ticket ON pos_lines(ticket_id);
 CREATE TABLE IF NOT EXISTS pos_accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',is_active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS pos_payments(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES pos_tickets(id),method TEXT NOT NULL CHECK(method IN ('cash','card','meal_card','account')),amount INTEGER NOT NULL CHECK(amount>0),account_id TEXT REFERENCES pos_accounts(id),reference TEXT NOT NULL DEFAULT '',actor TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS pos_payments_ticket ON pos_payments(ticket_id);
 CREATE TABLE IF NOT EXISTS pos_payment_items(id TEXT PRIMARY KEY,payment_id TEXT NOT NULL REFERENCES pos_payments(id),line_id TEXT NOT NULL REFERENCES pos_lines(id),quantity INTEGER NOT NULL CHECK(quantity>0),amount INTEGER NOT NULL CHECK(amount>=0));
 CREATE INDEX IF NOT EXISTS pos_payment_items_line ON pos_payment_items(line_id);
 CREATE TABLE IF NOT EXISTS pos_ledger(id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES pos_accounts(id),ticket_id TEXT REFERENCES pos_tickets(id),amount INTEGER NOT NULL CHECK(amount!=0),method TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',actor TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS pos_events(id TEXT PRIMARY KEY,ticket_id TEXT REFERENCES pos_tickets(id),action TEXT NOT NULL,actor TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS pos_requests(id TEXT PRIMARY KEY,payload TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS pos_staff(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,is_active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS pos_orders(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,table_number INTEGER NOT NULL,lines TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',ticket_id TEXT REFERENCES pos_tickets(id));
 CREATE INDEX IF NOT EXISTS pos_orders_pending ON pos_orders(status,created_at);
 CREATE INDEX IF NOT EXISTS pos_payments_day ON pos_payments(substr(datetime(created_at,'+3 hours'),1,10),method);
 CREATE INDEX IF NOT EXISTS pos_ledger_day ON pos_ledger(substr(datetime(created_at,'+3 hours'),1,10),method) WHERE amount<0;
 CREATE INDEX IF NOT EXISTS pos_ledger_account ON pos_ledger(account_id,created_at);
 CREATE INDEX IF NOT EXISTS pos_closed_history ON pos_tickets(status,closed_at);
 `);
 if(!d.prepare('PRAGMA table_info(pos_staff)').all().some(column=>column.name==='session_version'))d.exec('ALTER TABLE pos_staff ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1');
 atomic(d,()=>{
  const columns=d.prepare('PRAGMA table_info(pos_tickets)').all();
  if(!columns.some(c=>c.name==='service_type'))d.exec("ALTER TABLE pos_tickets ADD COLUMN service_type TEXT NOT NULL DEFAULT 'table' CHECK(service_type IN ('table','counter','takeaway'))");
  if(!columns.some(c=>c.name==='account_name'))d.exec("ALTER TABLE pos_tickets ADD COLUMN account_name TEXT NOT NULL DEFAULT ''");
  const index=d.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='one_open_ticket_per_table'").get();
  if(!String(index?.sql||'').includes('service_type'))d.exec("DROP INDEX IF EXISTS one_open_ticket_per_table; CREATE UNIQUE INDEX one_open_ticket_per_table ON pos_tickets(table_number) WHERE status='open' AND service_type='table'");
  d.exec('CREATE INDEX IF NOT EXISTS pos_open_service ON pos_tickets(status,service_type,opened_at)');
 });
}
function atomic<T>(d:DatabaseSync,fn:()=>T):T{d.exec('BEGIN IMMEDIATE');try{const result=fn();d.exec('COMMIT');return result;}catch(error){d.exec('ROLLBACK');throw error;}}
function event(d:DatabaseSync,ticketId:string|null,action:string,actor:string,data:unknown){d.prepare('INSERT INTO pos_events VALUES(?,?,?,?,?,?)').run(randomUUID(),ticketId,action,actor,JSON.stringify(data),new Date().toISOString());}
function amount(value:number,allowZero=false){if(!Number.isSafeInteger(value)||value<(allowZero?0:1)||value>100000000)throw new PosError('Geçerli bir tutar girin.');}
function quantity(value:number){if(!Number.isInteger(value)||value<1||value>999)throw new PosError('Adet 1–999 arasında olmalı.');}
export function ticket(d:DatabaseSync,id:string):Ticket{
 const row=d.prepare('SELECT * FROM pos_tickets WHERE id=?').get(id);if(!row)throw new PosError('Adisyon bulunamadı.',404);
 const lines=d.prepare('SELECT l.*,(SELECT COALESCE(SUM(p.quantity),0) FROM pos_payment_items p WHERE p.line_id=l.id) AS paid_quantity,(SELECT COALESCE(SUM(p.amount),0) FROM pos_payment_items p WHERE p.line_id=l.id) AS paid_amount FROM pos_lines l WHERE l.ticket_id=? ORDER BY l.created_at,l.rowid').all(id) as unknown as TicketLine[];
 const payments=d.prepare("SELECT p.*,COALESCE(a.name,'') AS account_name FROM pos_payments p LEFT JOIN pos_accounts a ON a.id=p.account_id WHERE ticket_id=? ORDER BY p.created_at,p.rowid").all(id) as unknown as TicketPayment[];
 const subtotal=lines.filter(l=>!l.voided_at).reduce((sum,l)=>sum+l.unit_price*l.quantity,0),total=subtotal-Number(row.discount),paid=payments.reduce((sum,p)=>sum+p.amount,0);
 return {...row,table_number:row.service_type==='table'?Number(row.table_number):null,lines,payments,subtotal,total,paid,remaining:total-paid} as Ticket;
}
function editable(d:DatabaseSync,id:string,version:number){const t=ticket(d,id);if(t.status!=='open')throw new PosError('Bu adisyon kapatılmış.');if(t.version!==version)throw new PosError('Adisyon başka bir cihazda değişti. Güncel halini kontrol edip tekrar deneyin.',409);return t;}
function bump(d:DatabaseSync,id:string){d.prepare('UPDATE pos_tickets SET version=version+1 WHERE id=?').run(id);}
function tableRange(d:DatabaseSync,table:number){const settings=JSON.parse(d.prepare('SELECT value FROM settings WHERE id=1').get()!.value as string);if(!Number.isInteger(table)||table<1||table>settings.table_count)throw new PosError('Geçerli bir masa seçin.');}
function createTicket(d:DatabaseSync,table:number,actor:string){tableRange(d,table);const open=d.prepare("SELECT id FROM pos_tickets WHERE table_number=? AND status='open' AND service_type='table'").get(table);if(open)return String(open.id);const id=randomUUID(),number=Number(d.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM pos_tickets').get()!.n);d.prepare('INSERT INTO pos_tickets(id,number,table_number,opened_at) VALUES(?,?,?,?)').run(id,number,table,new Date().toISOString());event(d,id,'open',actor,{table});return id;}
function quickMetadata(value:QuickMetadata){if(!['counter','takeaway'].includes(value.service_type)||typeof value.account_name!=='string'||value.account_name.trim().length>120)throw new PosError('Geçerli bir hesap adı ve satış türü seçin.');return {...value,account_name:value.account_name.trim()};}
function createQuickTicket(d:DatabaseSync,input:QuickMetadata,actor:string){
 const meta=quickMetadata(input),id=randomUUID(),number=Number(d.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM pos_tickets').get()!.n);
 // Keep the legacy positive table_number constraint without rebuilding financial tables.
 // This value is ignored for non-table tickets and never exposed as a physical table.
 d.prepare('INSERT INTO pos_tickets(id,number,table_number,opened_at,service_type,account_name) VALUES(?,?,1,?,?,?)').run(id,number,new Date().toISOString(),meta.service_type,meta.account_name);event(d,id,'open_quick',actor,meta);return id;
}
export interface AddLine {item_id:string;variant:string;quantity:number;note:string;expected_unit_price?:number;}
function quoteLine(d:DatabaseSync,line:AddLine){
 quantity(line.quantity);
 const item=d.prepare('SELECT i.* FROM items i JOIN categories c ON c.id=i.category_id WHERE i.id=? AND i.is_active=1 AND i.sold_out=0 AND c.is_active=1').get(line.item_id);
 if(!item)throw new PosError('Ürün artık satışta değil. Menüyü yenileyin.');
 const variants=JSON.parse(String(item.variants)) as {name:string;price:number}[],variant=variants.find(v=>v.name===line.variant);
 if(variants.length&&!variant||!variants.length&&line.variant)throw new PosError('Geçerli bir porsiyon seçin.');
 const price=variant?.price??Number(item.price);amount(price,true);
 if(line.expected_unit_price!==undefined&&line.expected_unit_price!==price)throw new PosError('Ürünün fiyatı değişmiş. Menüyü yenileyip güncel fiyatla tekrar ekleyin.',409);
 return {...line,name:String(item.name),variant:variant?.name||'',unit_price:price};
}
function appendLine(d:DatabaseSync,id:string,line:AddLine,source:OrderSource,actor:string){
 const quoted=quoteLine(d,line),existing=d.prepare('SELECT id,quantity FROM pos_lines WHERE ticket_id=? AND item_id=? AND name=? AND variant=? AND unit_price=? AND note=? AND source=? AND actor=? AND voided_at IS NULL ORDER BY created_at,rowid LIMIT 1').get(id,line.item_id,quoted.name,quoted.variant,quoted.unit_price,line.note,source,actor);
 if(existing){quantity(Number(existing.quantity)+line.quantity);d.prepare('UPDATE pos_lines SET quantity=quantity+? WHERE id=?').run(line.quantity,String(existing.id));return String(existing.id);}
 const lineId=randomUUID();d.prepare('INSERT INTO pos_lines(id,ticket_id,item_id,name,variant,unit_price,quantity,note,source,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(lineId,id,line.item_id,quoted.name,quoted.variant,quoted.unit_price,line.quantity,line.note,source,actor,new Date().toISOString());return lineId;
}
export type PosCommand=(
 |{action:'open';table:number}
 |{action:'open_order';table:number;lines:AddLine[];ticket_note?:string}
 |{action:'open_quick';service_type:'counter'|'takeaway';account_name:string;lines?:AddLine[];ticket_note?:string}
 |{action:'label';ticket_id:string;version:number;service_type:'counter'|'takeaway';account_name:string}
 |{action:'add';ticket_id:string;version:number;lines:AddLine[];ticket_note?:string}
 |{action:'quantity';ticket_id:string;version:number;line_id:string;quantity:number}
 |{action:'void';ticket_id:string;version:number;line_id:string;reason:string}
 |{action:'discount';ticket_id:string;version:number;amount:number;note:string}
 |{action:'note';ticket_id:string;version:number;note:string}
 |{action:'move';ticket_id:string;version:number;table:number}
 |{action:'pay';ticket_id:string;version:number;method:PaymentMethod;amount:number;account_id?:string;reference:string;close:boolean}
 |{action:'pay_items';ticket_id:string;version:number;method:PaymentMethod;items:{line_id:string;quantity:number}[];account_id?:string;reference:string}
 |{action:'close';ticket_id:string;version:number})&{quick?:QuickMetadata;ticket_note?:string};
export function executePos(d:DatabaseSync,requestId:string,command:PosCommand,actor='Kasa',source:OrderSource='cashier'):Ticket{
 return atomic(d,()=>{
  const payload=JSON.stringify({command,actor,source}),previous=d.prepare('SELECT payload,result FROM pos_requests WHERE id=?').get(requestId);
  if(previous){if(previous.payload!==payload)throw new PosError('İşlem anahtarı başka bir istek için kullanılmış.',409);return ticket(d,String(previous.result));}
  let id:string;
  if(command.action==='open')id=createTicket(d,command.table,actor);
  else if(command.action==='open_order'){
   tableRange(d,command.table);if(d.prepare("SELECT 1 FROM pos_tickets WHERE table_number=? AND status='open' AND service_type='table'").get(command.table))throw new PosError('Masa başka bir cihazda açılmış. Güncel adisyonu kontrol edin.',409);
   if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');id=createTicket(d,command.table,actor);for(const line of command.lines)appendLine(d,id,line,source,actor);
  }
  else if(command.action==='open_quick'){
   id=createQuickTicket(d,command,actor);
   if(command.lines){if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');for(const line of command.lines)appendLine(d,id,line,source,actor);}
  }
  else{
   id=command.ticket_id;const t=editable(d,id,command.version);
   if(command.quick){if(t.service_type==='table')throw new PosError('Masa adisyonuna hızlı sipariş bilgisi eklenemez.');const meta=quickMetadata(command.quick);d.prepare('UPDATE pos_tickets SET account_name=?,service_type=? WHERE id=?').run(meta.account_name,meta.service_type,id);t.account_name=meta.account_name;t.service_type=meta.service_type;}
   if(command.action==='label'){
    if(t.service_type==='table')throw new PosError('Hesap adı yalnız hızlı siparişlerde değiştirilebilir.');const meta=quickMetadata(command);d.prepare('UPDATE pos_tickets SET account_name=?,service_type=? WHERE id=?').run(meta.account_name,meta.service_type,id);
   }else if(command.action==='add'){
    if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');
    for(const line of command.lines)appendLine(d,id,line,source,actor);
   }else if(command.action==='quantity'||command.action==='void'){
    const line=t.lines.find(l=>l.id===command.line_id&&!l.voided_at);if(!line)throw new PosError('Sipariş satırı bulunamadı.');
    const group=t.lines.filter(l=>!l.voided_at&&lineKey(l)===lineKey(line)),qty=group.reduce((s,l)=>s+l.quantity,0),paidQty=group.reduce((s,l)=>s+(l.paid_quantity||0),0);
    if(command.action==='quantity'){
     quantity(command.quantity);if(command.quantity<paidQty)throw new PosError('Ödenmiş ürün adedi azaltılamaz.');const delta=command.quantity-qty;if(t.subtotal+delta*line.unit_price<t.discount+t.paid)throw new PosError('Ödenen tutarın altına düşülemez.');
     if(delta>0){quantity(line.quantity+delta);d.prepare('UPDATE pos_lines SET quantity=quantity+? WHERE id=?').run(delta,line.id);}
     else{let remove=-delta;for(const member of [...group].reverse()){const take=Math.min(remove,member.quantity-(member.paid_quantity||0));if(!take)continue;const next=member.quantity-take;if(next)d.prepare('UPDATE pos_lines SET quantity=? WHERE id=?').run(next,member.id);else d.prepare('UPDATE pos_lines SET voided_at=?,void_reason=? WHERE id=?').run(new Date().toISOString(),'Adet düzeltmesi',member.id);remove-=take;if(!remove)break;}}
    }else{
     if(!command.reason.trim())throw new PosError('İptal nedenini yazın.');if(qty===paidQty)throw new PosError('Ödenmiş ürün iptal edilemez.');if(t.subtotal-(qty-paidQty)*line.unit_price<t.discount+t.paid)throw new PosError('Ödenen tutarın altına düşülemez.');
     for(const member of group){if(member.paid_quantity)d.prepare('UPDATE pos_lines SET quantity=? WHERE id=?').run(member.paid_quantity,member.id);else d.prepare('UPDATE pos_lines SET voided_at=?,void_reason=? WHERE id=?').run(new Date().toISOString(),command.reason,member.id);}
    }
   }else if(command.action==='discount'){
    amount(command.amount,true);if(command.amount>t.subtotal-t.paid)throw new PosError('İndirim kalan tutarı aşamaz.');d.prepare('UPDATE pos_tickets SET discount=? WHERE id=?').run(command.amount,id);
   }else if(command.action==='note')d.prepare('UPDATE pos_tickets SET note=? WHERE id=?').run(command.note,id);
   else if(command.action==='move'){
    tableRange(d,command.table);if(command.table===t.table_number)throw new PosError('Farklı bir masa seçin.');
    if(d.prepare("SELECT 1 FROM pos_tickets WHERE table_number=? AND status='open' AND service_type='table'").get(command.table))throw new PosError('Hedef masa dolu. Boş bir masa seçin.');
    d.prepare("UPDATE pos_tickets SET table_number=?,service_type='table' WHERE id=?").run(command.table,id);
   }else if(command.action==='pay'||command.action==='pay_items'){
    let itemQuote:ReturnType<typeof quoteItemPayment>|undefined;
    if(command.action==='pay_items'){if(!command.items.length||command.items.length>100)throw new PosError('Ödenecek ürünleri seçin.');try{itemQuote=quoteItemPayment(t,command.items);}catch(error){throw new PosError((error as Error).message);}}
    const value=command.action==='pay'?command.amount:itemQuote!.amount,close=command.action==='pay'?command.close:value===t.remaining;
    amount(value);if(value>t.remaining)throw new PosError('Ödeme kalan tutarı aşamaz.');
    if(close&&value!==t.remaining)throw new PosError('Masayı kapatmak için kalan tutarın tamamını ödeyin.');
    const paymentId=randomUUID(),now=new Date().toISOString();let accountId:string|null=null;
    if(command.method==='account'){
     accountId=command.account_id||'';if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=? AND is_active=1').get(accountId))throw new PosError('Aktif bir cari hesap seçin.');
     d.prepare('INSERT INTO pos_ledger VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),accountId,id,value,'account',`Adisyon #${t.number} · ${ticketLabel(t)}`,actor,now);
    }
    d.prepare('INSERT INTO pos_payments VALUES(?,?,?,?,?,?,?,?)').run(paymentId,id,command.method,value,accountId,command.reference,actor,now);
    if(itemQuote)for(const allocation of itemQuote.allocations)d.prepare('INSERT INTO pos_payment_items VALUES(?,?,?,?,?)').run(randomUUID(),paymentId,allocation.line_id,allocation.quantity,allocation.amount);
    if(close)d.prepare("UPDATE pos_tickets SET status='closed',closed_at=? WHERE id=?").run(now,id);
   }else if(command.action==='close'){
    if(t.remaining!==0)throw new PosError('Masa kapatılmadan önce kalan tutar ödenmeli veya cariye aktarılmalı.');
    d.prepare("UPDATE pos_tickets SET status='closed',closed_at=? WHERE id=?").run(new Date().toISOString(),id);
   }
   bump(d,id);event(d,id,command.action,actor,{command,before:{table:t.table_number,total:t.total,paid:t.paid}});
  }
  if('ticket_note' in command&&command.ticket_note!==undefined){if(typeof command.ticket_note!=='string'||command.ticket_note.trim().length>500)throw new PosError('Not en fazla 500 karakter olabilir.');d.prepare('UPDATE pos_tickets SET note=? WHERE id=?').run(command.ticket_note.trim(),id);}
  d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(requestId,payload,id,new Date().toISOString());return ticket(d,id);
 });
}
export function accounts(d:DatabaseSync):Account[]{return d.prepare('SELECT a.*,COALESCE(SUM(l.amount),0) AS balance FROM pos_accounts a LEFT JOIN pos_ledger l ON l.account_id=a.id GROUP BY a.id ORDER BY a.name COLLATE NOCASE').all().map(row=>({...row,is_active:!!row.is_active})) as unknown as Account[];}
export function accountHistory(d:DatabaseSync,id:string){if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=?').get(id))throw new PosError('Cari hesap bulunamadı.',404);return d.prepare('SELECT * FROM pos_ledger WHERE account_id=? ORDER BY created_at DESC,rowid DESC').all(id) as unknown as AccountEntry[];}
export function saveAccount(d:DatabaseSync,input:{id?:string;name:string;phone:string;note:string;is_active:boolean},actor:string){return atomic(d,()=>{const id=input.id||randomUUID();if(input.id&&!d.prepare('SELECT 1 FROM pos_accounts WHERE id=?').get(id))throw new PosError('Cari hesap bulunamadı.',404);d.prepare('INSERT INTO pos_accounts VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,note=excluded.note,is_active=excluded.is_active').run(id,input.name,input.phone,input.note,Number(input.is_active));event(d,null,'account_save',actor,{...input,id});return accounts(d).find(a=>a.id===id)!;});}
export function collectAccount(d:DatabaseSync,id:string,value:number,method:Exclude<PaymentMethod,'account'>,note:string,requestId:string,actor:string){return atomic(d,()=>{
 const payload=JSON.stringify({id,value,method,note,actor}),old=d.prepare('SELECT payload FROM pos_requests WHERE id=?').get(requestId);
 if(old){if(old.payload!==payload)throw new PosError('İşlem anahtarı başka bir istek için kullanılmış.',409);return accounts(d).find(a=>a.id===id)!;}
 amount(value);const a=accounts(d).find(a=>a.id===id);if(!a)throw new PosError('Cari hesap bulunamadı.',404);if(value>a.balance)throw new PosError('Tahsilat cari bakiyesini aşamaz.');
 d.prepare('INSERT INTO pos_ledger VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),id,null,-value,method,note,actor,new Date().toISOString());event(d,null,'account_collect',actor,{id,value,method,note});
 d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(requestId,payload,id,new Date().toISOString());return accounts(d).find(a=>a.id===id)!;
});}
export function posSummary(d:DatabaseSync):PosSummary{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const sums=d.prepare("SELECT method,SUM(amount) AS amount FROM pos_payments WHERE substr(datetime(created_at,'+3 hours'),1,10)=? GROUP BY method").all(today);
 const collected=d.prepare("SELECT method,SUM(-amount) AS amount FROM pos_ledger WHERE amount<0 AND substr(datetime(created_at,'+3 hours'),1,10)=? GROUP BY method").all(today);
 const totals={cash:0,card:0,meal_card:0,account:0};for(const row of [...sums,...collected])totals[row.method as PaymentMethod]+=Number(row.amount);
 const closed=d.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(discount),0) AS discount FROM pos_tickets WHERE status='closed' AND substr(datetime(closed_at,'+3 hours'),1,10)=?").get(today)!;
 return {open:d.prepare("SELECT id FROM pos_tickets WHERE status='open' ORDER BY table_number").all().map(r=>ticket(d,String(r.id))),recent:d.prepare("SELECT id FROM pos_tickets WHERE status='closed' ORDER BY closed_at DESC LIMIT 40").all().map(r=>ticket(d,String(r.id))),accounts:accounts(d),pending:pendingOrders(d),today:{date:today,closed_count:Number(closed.count),discount:Number(closed.discount),...totals}};
}
export function pendingOrders(d:DatabaseSync):PendingOrder[]{return d.prepare("SELECT * FROM pos_orders WHERE status='pending' ORDER BY created_at").all().map(row=>({...row,lines:JSON.parse(String(row.lines))})) as PendingOrder[];}
export function submitCustomerOrder(d:DatabaseSync,id:string,table:number,lines:AddLine[],note:string){return atomic(d,()=>{
 const payload=JSON.stringify({table,lines,note}),old=d.prepare('SELECT payload,result FROM pos_requests WHERE id=?').get(id);
 if(old){if(old.payload!==payload)throw new PosError('İşlem anahtarı başka bir siparişte kullanılmış.',409);return {id,number:Number(old.result)};}
 tableRange(d,table);if(!lines.length||lines.length>50)throw new PosError('1–50 ürün seçin.');
 const quoted=lines.map(line=>quoteLine(d,line)),number=Number(d.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM pos_orders').get()!.n);
 d.prepare('INSERT INTO pos_orders(id,number,table_number,lines,created_at,note) VALUES(?,?,?,?,?,?)').run(id,number,table,JSON.stringify(quoted),new Date().toISOString(),note);
 d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(id,payload,String(number),new Date().toISOString());event(d,null,'customer_order','Müşteri',{id,table,number});return {id,number};
});}
export function decideCustomerOrder(d:DatabaseSync,id:string,accept:boolean,actor:string){return atomic(d,()=>{
 const order=d.prepare('SELECT * FROM pos_orders WHERE id=?').get(id);if(!order)throw new PosError('Sipariş bulunamadı.',404);
 if(order.status!=='pending'){if(order.status===(accept?'accepted':'rejected'))return {ticket_id:order.ticket_id?String(order.ticket_id):null};throw new PosError('Sipariş zaten işlenmiş.',409);}
 let ticketId:string|null=null;
 if(accept){
  const lines=JSON.parse(String(order.lines)) as PendingOrder['lines'];
  for(const line of lines)quoteLine(d,{...line,expected_unit_price:undefined});
  ticketId=createTicket(d,Number(order.table_number),actor);
  for(const line of lines)d.prepare('INSERT INTO pos_lines(id,ticket_id,item_id,name,variant,unit_price,quantity,note,source,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),ticketId,line.item_id,line.name,line.variant,line.unit_price,line.quantity,[line.note,String(order.note)].filter(Boolean).join(' · '),'customer',actor,new Date().toISOString());
  bump(d,ticketId);
 }
 d.prepare('UPDATE pos_orders SET status=?,ticket_id=? WHERE id=?').run(accept?'accepted':'rejected',ticketId,id);event(d,ticketId,accept?'order_accept':'order_reject',actor,{id});return {ticket_id:ticketId};
});}
export function posRevision(d:DatabaseSync){return String(d.prepare('SELECT COALESCE(MAX(rowid),0) AS v FROM pos_events').get()!.v);}
export function recordPosEvent(d:DatabaseSync,action:string,actor:string,data:unknown){event(d,null,action,actor,data);}
