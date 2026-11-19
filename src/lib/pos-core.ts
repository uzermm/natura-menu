import {campaignUnitPrice} from './campaign.ts';
import type {Campaign} from './types.ts';
import {initOrderActivity,recordOrderActivity} from './order-activity.ts';
import {reopenTicket} from './reopen-ticket.ts';
import { randomUUID } from 'node:crypto';
import {initMenuVisibility} from './menu-visibility.ts';
import {PosError} from './pos-error.ts';
export {PosError} from './pos-error.ts';
import {initOperations,businessDay,dayTotals,adjustPayment,rejectExpiredRequest} from './pos-operations.ts';
import { lineKey,quoteItemPayment } from './pos-lines.ts';
import type { DatabaseSync } from 'node:sqlite';
import { ticketLabel,type QuickMetadata,type Account,type AccountEntry,type OrderSource,type PaymentMethod,type PendingOrder,type PosSummary,type Ticket,type TicketLine,type TicketPayment,type PaymentAdjustment } from './pos-types.ts';

export function initPos(d:DatabaseSync){initMenuVisibility(d);d.exec(`
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
  if(!columns.some(c=>c.name==='merged_into'))d.exec('ALTER TABLE pos_tickets ADD COLUMN merged_into TEXT REFERENCES pos_tickets(id)');
  if(!columns.some(c=>c.name==='merge_snapshot'))d.exec('ALTER TABLE pos_tickets ADD COLUMN merge_snapshot TEXT');
  if(!columns.some(c=>c.name==='account_name'))d.exec("ALTER TABLE pos_tickets ADD COLUMN account_name TEXT NOT NULL DEFAULT ''");
  if(!columns.some(c=>c.name==='linked_account_id'))d.exec('ALTER TABLE pos_tickets ADD COLUMN linked_account_id TEXT REFERENCES pos_accounts(id)');
  d.exec("CREATE UNIQUE INDEX IF NOT EXISTS pos_open_account ON pos_tickets(linked_account_id) WHERE status='open' AND linked_account_id IS NOT NULL");
  d.exec('CREATE INDEX IF NOT EXISTS pos_account_tickets ON pos_tickets(linked_account_id) WHERE linked_account_id IS NOT NULL');
  const index=d.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='one_open_ticket_per_table'").get();
  if(!String(index?.sql||'').includes('service_type'))d.exec("DROP INDEX IF EXISTS one_open_ticket_per_table; CREATE UNIQUE INDEX one_open_ticket_per_table ON pos_tickets(table_number) WHERE status='open' AND service_type='table'");
  d.exec('CREATE INDEX IF NOT EXISTS pos_open_service ON pos_tickets(status,service_type,opened_at)');initOperations(d);initOrderActivity(d);
 });
}
function atomic<T>(d:DatabaseSync,fn:()=>T):T{d.exec('BEGIN IMMEDIATE');try{const result=fn();d.exec('COMMIT');return result;}catch(error){d.exec('ROLLBACK');throw error;}}
function event(d:DatabaseSync,ticketId:string|null,action:string,actor:string,data:unknown){d.prepare('INSERT INTO pos_events VALUES(?,?,?,?,?,?)').run(randomUUID(),ticketId,action,actor,JSON.stringify(data),new Date().toISOString());}
function amount(value:number,allowZero=false){if(!Number.isSafeInteger(value)||value<(allowZero?0:1)||value>100000000)throw new PosError('Geçerli bir tutar girin.');}
function quantity(value:number){if(!Number.isInteger(value)||value<1||value>999)throw new PosError('Adet 1–999 arasında olmalı.');}
export function ticket(d:DatabaseSync,id:string):Ticket{
 const row=d.prepare('SELECT * FROM pos_tickets WHERE id=?').get(id);if(!row)throw new PosError('Adisyon bulunamadı.',404);
 if(row.merged_into&&row.merge_snapshot)return {...JSON.parse(String(row.merge_snapshot)),status:'closed',version:Number(row.version),closed_at:String(row.closed_at),merged_into:String(row.merged_into)} as Ticket;
 const lines=d.prepare('SELECT l.*,(SELECT COALESCE(SUM(p.quantity),0) FROM pos_payment_items p WHERE p.line_id=l.id) AS paid_quantity,(SELECT COALESCE(SUM(p.amount-COALESCE((SELECT SUM(r.amount) FROM pos_refund_items r WHERE r.allocation_id=p.id),0)),0) FROM pos_payment_items p WHERE p.line_id=l.id) AS paid_amount FROM pos_lines l WHERE l.ticket_id=? ORDER BY l.created_at,l.rowid').all(id) as unknown as TicketLine[];
 const payments=d.prepare("SELECT p.*,COALESCE(a.name,'') AS account_name,p.amount-COALESCE((SELECT SUM(r.amount) FROM pos_payment_adjustments r WHERE r.payment_id=p.id),0) AS net_amount FROM pos_payments p LEFT JOIN pos_accounts a ON a.id=p.account_id WHERE ticket_id=? ORDER BY p.created_at,p.rowid").all(id) as unknown as TicketPayment[];
 const adjustments=d.prepare('SELECT a.* FROM pos_payment_adjustments a JOIN pos_payments p ON p.id=a.payment_id WHERE p.ticket_id=? ORDER BY a.created_at,a.rowid').all(id) as unknown as PaymentAdjustment[];const refunded=adjustments.filter(a=>a.kind==='refund').reduce((sum,a)=>sum+Number(a.amount),0);
 const subtotal=lines.filter(l=>!l.voided_at).reduce((sum,l)=>sum+l.unit_price*l.quantity,0),gross_total=subtotal-Number(row.discount),total=gross_total-refunded,paid=payments.reduce((sum,p)=>sum+(p.net_amount??p.amount),0);
 const {merge_snapshot,...publicRow}=row;void merge_snapshot;
 return {...publicRow,table_number:row.service_type==='table'?Number(row.table_number):null,lines,payments,adjustments,refunded,gross_total,business_day_id:businessDay(d).day_id,subtotal,total,paid,remaining:total-paid} as Ticket;
}
export function ticketsBatch(d:DatabaseSync,ids:string[]):Ticket[]{
 if(!ids.length)return [];const placeholders=ids.map(()=>'?').join(','),rows=d.prepare(`SELECT * FROM pos_tickets WHERE id IN (${placeholders})`).all(...ids),day=businessDay(d).day_id;
 const allLines=d.prepare(`SELECT l.*,(SELECT COALESCE(SUM(p.quantity),0) FROM pos_payment_items p WHERE p.line_id=l.id) AS paid_quantity,(SELECT COALESCE(SUM(p.amount-COALESCE((SELECT SUM(r.amount) FROM pos_refund_items r WHERE r.allocation_id=p.id),0)),0) FROM pos_payment_items p WHERE p.line_id=l.id) AS paid_amount FROM pos_lines l WHERE l.ticket_id IN (${placeholders}) ORDER BY l.created_at,l.rowid`).all(...ids) as unknown as TicketLine[];
 const allPayments=d.prepare(`SELECT p.*,COALESCE(a.name,'') AS account_name,p.amount-COALESCE((SELECT SUM(r.amount) FROM pos_payment_adjustments r WHERE r.payment_id=p.id),0) AS net_amount FROM pos_payments p LEFT JOIN pos_accounts a ON a.id=p.account_id WHERE ticket_id IN (${placeholders}) ORDER BY p.created_at,p.rowid`).all(...ids) as unknown as TicketPayment[];
 const allAdjustments=d.prepare(`SELECT a.* FROM pos_payment_adjustments a JOIN pos_payments p ON p.id=a.payment_id WHERE p.ticket_id IN (${placeholders}) ORDER BY a.created_at,a.rowid`).all(...ids) as unknown as (PaymentAdjustment&{ticket_id?:string})[];
 const byId=new Map(rows.map(row=>{const lines=allLines.filter(l=>l.ticket_id===row.id),payments=allPayments.filter(p=>p.ticket_id===row.id),paymentIds=new Set(payments.map(p=>p.id)),adjustments=allAdjustments.filter(a=>paymentIds.has(a.payment_id)),refunded=adjustments.filter(a=>a.kind==='refund').reduce((sum,a)=>sum+a.amount,0),subtotal=lines.filter(l=>!l.voided_at).reduce((sum,l)=>sum+l.unit_price*l.quantity,0),gross_total=subtotal-Number(row.discount),total=gross_total-refunded,paid=payments.reduce((sum,p)=>sum+(p.net_amount??p.amount),0);const {merge_snapshot,...publicRow}=row;
 return [String(row.id),row.merged_into&&merge_snapshot?{...JSON.parse(String(merge_snapshot)),status:'closed',version:Number(row.version),closed_at:String(row.closed_at),merged_into:String(row.merged_into)}:{...publicRow,table_number:row.service_type==='table'?Number(row.table_number):null,lines,payments,adjustments,refunded,gross_total,business_day_id:day,subtotal,total,paid,remaining:total-paid}] as [string,Ticket];}));return ids.map(id=>byId.get(id)!).filter(Boolean);
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
function quoteLine(d:DatabaseSync,line:AddLine,qrMenu=false){
 quantity(line.quantity);
 const item=d.prepare('SELECT i.*,c.qr_visible AS category_qr_visible FROM items i JOIN categories c ON c.id=i.category_id WHERE i.id=? AND i.is_active=1 AND i.sold_out=0 AND c.is_active=1').get(line.item_id);
 if(!item)throw new PosError('Ürün artık satışta değil. Menüyü yenileyin.');
 if(qrMenu&&(!item.qr_visible||!item.category_qr_visible))throw new PosError('Ürün QR menüde satışa açık değil. Menüyü yenileyin.');
 const variants=JSON.parse(String(item.variants)) as {name:string;price:number}[],variant=variants.find(v=>v.name===line.variant);
 if(variants.length&&!variant||!variants.length&&line.variant)throw new PosError('Geçerli bir porsiyon seçin.');
 const campaign=(JSON.parse(String(d.prepare('SELECT value FROM settings WHERE id=1').get()!.value)).campaign||null) as Campaign|null;
 const price=campaignUnitPrice({...item,id:String(item.id),price:Number(item.price),variants,is_active:item.is_active,qr_visible:item.qr_visible,sold_out:item.sold_out,image_url:item.image_url as string},item.category_qr_visible,campaign,variant?.name||'');amount(price,true);
 if(line.expected_unit_price!==undefined&&line.expected_unit_price!==price)throw new PosError('Ürünün fiyatı değişmiş. Menüyü yenileyip güncel fiyatla tekrar ekleyin.',409);
 return {...line,name:String(item.name),variant:variant?.name||'',unit_price:price};
}
function appendLine(d:DatabaseSync,id:string,line:AddLine,source:OrderSource,actor:string){
 const quoted=quoteLine(d,line),existing=d.prepare('SELECT id,quantity FROM pos_lines WHERE ticket_id=? AND item_id=? AND name=? AND variant=? AND unit_price=? AND note=? AND source=? AND actor=? AND voided_at IS NULL ORDER BY created_at,rowid LIMIT 1').get(id,line.item_id,quoted.name,quoted.variant,quoted.unit_price,line.note,source,actor);
 if(existing){quantity(Number(existing.quantity)+line.quantity);d.prepare('UPDATE pos_lines SET quantity=quantity+? WHERE id=?').run(line.quantity,String(existing.id));recordOrderActivity(d,id);return String(existing.id);}
 const lineId=randomUUID();d.prepare('INSERT INTO pos_lines(id,ticket_id,item_id,name,variant,unit_price,quantity,note,source,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(lineId,id,line.item_id,quoted.name,quoted.variant,quoted.unit_price,line.quantity,line.note,source,actor,new Date().toISOString());recordOrderActivity(d,id);return lineId;
}
export type PosCommand=(
 |{action:'open_account';account_id:string;lines:AddLine[];ticket_note?:string}
 |{action:'open';table:number}
 |{action:'open_order';table:number;lines:AddLine[];ticket_note?:string}
 |{action:'open_quick';service_type:'counter'|'takeaway';account_name:string;lines?:AddLine[];ticket_note?:string}
 |{action:'label';ticket_id:string;version:number;service_type:'counter'|'takeaway';account_name:string}
 |{action:'add';ticket_id:string;version:number;lines:AddLine[];ticket_note?:string}
 |{action:'quantity';ticket_id:string;version:number;line_id:string;quantity:number}
 |{action:'void';ticket_id:string;version:number;line_id:string;reason:string}
 |{action:'discount';ticket_id:string;version:number;amount:number;note:string}
 |{action:'note';ticket_id:string;version:number;note:string}
 |{action:'line_note';ticket_id:string;version:number;line_id:string;note:string}
 |{action:'move';ticket_id:string;version:number;table:number;target_ticket_id?:string;target_version?:number}
 |{action:'pay';ticket_id:string;version:number;method:PaymentMethod;amount:number;account_id?:string;reference:string;close:boolean}
 |{action:'pay_items';ticket_id:string;version:number;method:PaymentMethod;items:{line_id:string;quantity:number}[];account_id?:string;reference:string}
 |{action:'refund';ticket_id:string;version:number;payment_id:string;amount:number;reason:string}
 |{action:'correct_payment';ticket_id:string;version:number;payment_id:string;method:PaymentMethod;account_id?:string;reason:string}
 |{action:'reopen';ticket_id:string;version:number;reason:string}
 |{action:'close';ticket_id:string;version:number})&{quick?:QuickMetadata;ticket_note?:string};
export function executePos(d:DatabaseSync,requestId:string,command:PosCommand,actor='Kasa',source:OrderSource='cashier',expectedDayId?:string):Ticket{
 return atomic(d,()=>{
  rejectExpiredRequest(d,requestId);if(expectedDayId&&expectedDayId!==businessDay(d).day_id)throw new PosError('Gün kapatılmış. Ekranı yenileyin.',409);
  if(command.ticket_note!==undefined&&(typeof command.ticket_note!=='string'||command.ticket_note.trim().length>500))throw new PosError('Not en fazla 500 karakter olabilir.');
  let mergedSource=false;
  const payload=JSON.stringify({command,actor,source}),previous=d.prepare('SELECT payload,result FROM pos_requests WHERE id=?').get(requestId);
  if(previous){if(previous.payload!==payload)throw new PosError('İşlem anahtarı başka bir istek için kullanılmış.',409);return ticket(d,String(previous.result));}
  let id:string;
  if(command.action==='open')id=createTicket(d,command.table,actor);
  else if(command.action==='open_account'){
   const account=d.prepare('SELECT name FROM pos_accounts WHERE id=? AND is_active=1 AND deleted_at IS NULL').get(command.account_id);if(!account)throw new PosError('Aktif cari hesap seçin.');
   if(openAccountTicket(d,command.account_id))throw new PosError('Cari siparişi başka bir cihazda açılmış. Güncel hesabı kontrol edin.',409);
   if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');
   id=createQuickTicket(d,{service_type:'counter',account_name:String(account.name)},actor);d.prepare('UPDATE pos_tickets SET linked_account_id=? WHERE id=?').run(command.account_id,id);
   for(const line of command.lines)appendLine(d,id,line,source,actor);
  }
  else if(command.action==='open_order'){
   tableRange(d,command.table);if(d.prepare("SELECT 1 FROM pos_tickets WHERE table_number=? AND status='open' AND service_type='table'").get(command.table))throw new PosError('Masa başka bir cihazda açılmış. Güncel adisyonu kontrol edin.',409);
   if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');id=createTicket(d,command.table,actor);for(const line of command.lines)appendLine(d,id,line,source,actor);
  }
  else if(command.action==='open_quick'){
   id=createQuickTicket(d,command,actor);
   if(command.lines){if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');for(const line of command.lines)appendLine(d,id,line,source,actor);}
  }
  else{
   id=command.ticket_id;const financial=command.action==='refund'||command.action==='correct_payment'||command.action==='reopen',t=financial?ticket(d,id):editable(d,id,command.version);if(t.version!==command.version)throw new PosError('Adisyon değişti. Güncel halini kontrol edin.',409);
   if(t.linked_account_id&&(command.quick||command.action==='label'||command.action==='move'||('method' in command&&command.method==='account')))throw new PosError('Cari siparişinin hesabı değiştirilemez; ödemeyi nakit veya kart ile alın.');
   if(command.quick){if(t.service_type==='table')throw new PosError('Masa adisyonuna hızlı sipariş bilgisi eklenemez.');const meta=quickMetadata(command.quick);d.prepare('UPDATE pos_tickets SET account_name=?,service_type=? WHERE id=?').run(meta.account_name,meta.service_type,id);t.account_name=meta.account_name;t.service_type=meta.service_type;}
   if(command.action==='reopen'){reopenTicket(d,t,businessDay(d).day_id,command.reason);}
   else if(command.action==='refund'||command.action==='correct_payment'){adjustPayment(d,t,command,actor);}
   else if(command.action==='label'){
    if(t.service_type==='table')throw new PosError('Hesap adı yalnız hızlı siparişlerde değiştirilebilir.');const meta=quickMetadata(command);d.prepare('UPDATE pos_tickets SET account_name=?,service_type=? WHERE id=?').run(meta.account_name,meta.service_type,id);
   }else if(command.action==='add'){
    if(!command.lines.length||command.lines.length>100)throw new PosError('1–100 ürün seçin.');
    for(const line of command.lines)appendLine(d,id,line,source,actor);
   }else if(command.action==='quantity'||command.action==='void'){
    const line=t.lines.find(l=>l.id===command.line_id&&!l.voided_at);if(!line)throw new PosError('Sipariş satırı bulunamadı.');
    const group=t.lines.filter(l=>!l.voided_at&&lineKey(l)===lineKey(line)),qty=group.reduce((s,l)=>s+l.quantity,0),paidQty=group.reduce((s,l)=>s+(l.paid_quantity||0),0);
    if(command.action==='quantity'){
     quantity(command.quantity);if(command.quantity<paidQty)throw new PosError('Ödenmiş ürün adedi azaltılamaz.');const delta=command.quantity-qty;if(t.subtotal+delta*line.unit_price<t.discount+t.paid+(t.refunded||0))throw new PosError('Ödenen tutarın altına düşülemez.');
     if(delta>0){quantity(line.quantity+delta);d.prepare('UPDATE pos_lines SET quantity=quantity+? WHERE id=?').run(delta,line.id);recordOrderActivity(d,id);}
     else{let remove=-delta;for(const member of [...group].reverse()){const take=Math.min(remove,member.quantity-(member.paid_quantity||0));if(!take)continue;const next=member.quantity-take;if(next)d.prepare('UPDATE pos_lines SET quantity=? WHERE id=?').run(next,member.id);else d.prepare('UPDATE pos_lines SET voided_at=?,void_reason=? WHERE id=?').run(new Date().toISOString(),'Adet düzeltmesi',member.id);remove-=take;if(!remove)break;}}
    }else{
     if(!command.reason.trim())throw new PosError('İptal nedenini yazın.');if(qty===paidQty)throw new PosError('Ödenmiş ürün iptal edilemez.');if(t.subtotal-(qty-paidQty)*line.unit_price<t.discount+t.paid+(t.refunded||0))throw new PosError('Ödenen tutarın altına düşülemez.');
     for(const member of group){if(member.paid_quantity)d.prepare('UPDATE pos_lines SET quantity=? WHERE id=?').run(member.paid_quantity,member.id);else d.prepare('UPDATE pos_lines SET voided_at=?,void_reason=? WHERE id=?').run(new Date().toISOString(),command.reason,member.id);}
    }
   }else if(command.action==='line_note'){
    const line=t.lines.find(l=>l.id===command.line_id&&!l.voided_at);if(!line)throw new PosError('Ürün bulunamadı.');
    const members=t.lines.filter(l=>!l.voided_at&&lineKey(l)===lineKey(line));for(const l of members){const unpaid=l.quantity-(l.paid_quantity||0);if(!unpaid)continue;if(!l.paid_quantity)d.prepare('UPDATE pos_lines SET note=? WHERE id=?').run(command.note,l.id);else{d.prepare('UPDATE pos_lines SET quantity=? WHERE id=?').run(l.paid_quantity,l.id);d.prepare('INSERT INTO pos_lines(id,ticket_id,item_id,name,variant,unit_price,quantity,note,source,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),id,l.item_id,l.name,l.variant,l.unit_price,unpaid,command.note,l.source,l.actor,l.created_at);}}
   }else if(command.action==='discount'){
    amount(command.amount,true);if(command.amount>t.subtotal-t.paid-(t.refunded||0))throw new PosError('İndirim kalan tutarı aşamaz.');d.prepare('UPDATE pos_tickets SET discount=? WHERE id=?').run(command.amount,id);
   }else if(command.action==='note')d.prepare('UPDATE pos_tickets SET note=? WHERE id=?').run(command.note,id);
   else if(command.action==='move'){
    tableRange(d,command.table);if(command.table===t.table_number)throw new PosError('Farklı bir masa seçin.');
    const destination=d.prepare("SELECT id FROM pos_tickets WHERE table_number=? AND status='open' AND service_type='table'").get(command.table);
    if(destination){
     const target=ticket(d,String(destination.id));if(command.target_ticket_id!==target.id||command.target_version!==target.version)throw new PosError('Hedef masa değişti. Güncel hesabı kontrol edip yeniden seçin.',409);
     const sourceNote=command.ticket_note?.trim()??t.note,combinedNote=[target.note,sourceNote?`${ticketLabel(t)}: ${sourceNote}`:''].filter(Boolean).join(' · ');if(combinedNote.length>500)throw new PosError('Birleşen masa notları 500 karakteri aşıyor. Önce notları kısaltın.');
     const snapshot={...t,note:sourceNote},now=new Date().toISOString();
     d.prepare('UPDATE pos_lines SET ticket_id=? WHERE ticket_id=?').run(target.id,id);
     d.prepare('UPDATE pos_payments SET ticket_id=? WHERE ticket_id=?').run(target.id,id);
     d.prepare('UPDATE pos_orders SET ticket_id=? WHERE ticket_id=?').run(target.id,id);
     d.prepare("UPDATE pos_tickets SET status='closed',closed_at=?,merged_into=?,merge_snapshot=?,version=version+1 WHERE id=?").run(now,target.id,JSON.stringify(snapshot),id);
     d.prepare('UPDATE pos_tickets SET discount=discount+?,note=?,last_order_at=? WHERE id=?').run(t.discount,combinedNote,[target.last_order_at||target.opened_at,t.last_order_at||t.opened_at].sort().at(-1)!,target.id);
     event(d,id,'merge',actor,{target_id:target.id,table:command.table,total:t.total,paid:t.paid});id=target.id;mergedSource=true;
    }else{
     if(command.target_ticket_id||command.target_version)throw new PosError('Hedef masa artık aynı hesap değil. Yeniden seçin.',409);
     d.prepare("UPDATE pos_tickets SET table_number=?,service_type='table' WHERE id=?").run(command.table,id);
    }
   }else if(command.action==='pay'||command.action==='pay_items'){
    let itemQuote:ReturnType<typeof quoteItemPayment>|undefined;
    if(command.action==='pay_items'){if(!command.items.length||command.items.length>100)throw new PosError('Ödenecek ürünleri seçin.');try{itemQuote=quoteItemPayment(t,command.items);}catch(error){throw new PosError((error as Error).message);}}
    const value=command.action==='pay'?command.amount:itemQuote!.amount,close=command.action==='pay'?command.close:value===t.remaining;
    amount(value);if(value>t.remaining)throw new PosError('Ödeme kalan tutarı aşamaz.');
    if(close&&value!==t.remaining)throw new PosError('Masayı kapatmak için kalan tutarın tamamını ödeyin.');
    const paymentId=randomUUID(),now=new Date().toISOString();let accountId:string|null=null;
    if(command.method==='account'){
     accountId=command.account_id||'';if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=? AND is_active=1 AND deleted_at IS NULL').get(accountId))throw new PosError('Aktif bir cari hesap seçin.');
     d.prepare('INSERT INTO pos_ledger(id,account_id,ticket_id,amount,method,note,actor,created_at,day_id) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),accountId,id,value,'account',`Adisyon #${t.number} · ${ticketLabel(t)}`,actor,now,businessDay(d).day_id);
    }
    d.prepare('INSERT INTO pos_payments(id,ticket_id,method,amount,account_id,reference,actor,created_at,day_id) VALUES(?,?,?,?,?,?,?,?,?)').run(paymentId,id,command.method,value,accountId,command.reference,actor,now,businessDay(d).day_id);
    if(itemQuote)for(const allocation of itemQuote.allocations)d.prepare('INSERT INTO pos_payment_items VALUES(?,?,?,?,?)').run(randomUUID(),paymentId,allocation.line_id,allocation.quantity,allocation.amount);
    if(close)d.prepare("UPDATE pos_tickets SET status='closed',closed_at=?,closed_day_id=? WHERE id=?").run(now,businessDay(d).day_id,id);
   }else if(command.action==='close'){
    if(t.remaining!==0)throw new PosError('Masa kapatılmadan önce kalan tutar ödenmeli veya cariye aktarılmalı.');
    d.prepare("UPDATE pos_tickets SET status='closed',closed_at=?,closed_day_id=? WHERE id=?").run(new Date().toISOString(),businessDay(d).day_id,id);
   }
   bump(d,id);event(d,id,command.action,actor,{command,before:{table:t.table_number,total:t.total,paid:t.paid}});
  }
  if(!mergedSource&&'ticket_note' in command&&command.ticket_note!==undefined){if(typeof command.ticket_note!=='string'||command.ticket_note.trim().length>500)throw new PosError('Not en fazla 500 karakter olabilir.');d.prepare('UPDATE pos_tickets SET note=? WHERE id=?').run(command.ticket_note.trim(),id);}
  d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(requestId,payload,id,new Date().toISOString());return ticket(d,id);
 });
}
export function openAccountTicket(d:DatabaseSync,id:string):Ticket|null{if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=?').get(id))throw new PosError('Cari hesap bulunamadı.',404);const row=d.prepare("SELECT id FROM pos_tickets WHERE linked_account_id=? AND status='open'").get(id);return row?ticket(d,String(row.id)):null;}
export function outstandingAccountReceipts(d:DatabaseSync,id:string){
 if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=?').get(id))throw new PosError('Cari hesap bulunamadı.',404);
 // Old amount-based collections have no item allocation. Apply those to oldest
 // receipt balances, while retaining each original receipt and its product details.
 const debts=d.prepare('SELECT l.ticket_id,SUM(l.amount) AS amount,MIN(l.created_at) AS created_at FROM pos_ledger l WHERE l.account_id=? GROUP BY l.ticket_id ORDER BY created_at,l.ticket_id').all(id);
 let credit=debts.reduce((sum,r)=>sum+Math.max(0,-Number(r.amount)),0);
 return debts.flatMap(r=>{if(!r.ticket_id||Number(r.amount)<=0)return [];const amount=Number(r.amount),covered=Math.min(credit,amount);credit-=covered;return amount>covered?[{ticket:ticket(d,String(r.ticket_id)),remaining:amount-covered}]:[];});
}
export function accounts(d:DatabaseSync):Account[]{return d.prepare(`WITH ledger AS (SELECT account_id,SUM(amount) AS balance FROM pos_ledger GROUP BY account_id),
 open_lines AS (SELECT l.ticket_id,SUM(l.quantity*l.unit_price) AS subtotal FROM pos_lines l JOIN pos_tickets t ON t.id=l.ticket_id WHERE t.status='open' AND t.linked_account_id IS NOT NULL AND l.voided_at IS NULL GROUP BY l.ticket_id),
 open_paid AS (SELECT p.ticket_id,SUM(p.amount-COALESCE((SELECT SUM(a.amount) FROM pos_payment_adjustments a WHERE a.payment_id=p.id AND a.kind='correction'),0)) AS paid FROM pos_payments p JOIN pos_tickets t ON t.id=p.ticket_id WHERE t.status='open' AND t.linked_account_id IS NOT NULL GROUP BY p.ticket_id),
 orders AS (SELECT t.linked_account_id,SUM(COALESCE(l.subtotal,0)-t.discount-COALESCE(p.paid,0)) AS balance FROM pos_tickets t LEFT JOIN open_lines l ON l.ticket_id=t.id LEFT JOIN open_paid p ON p.ticket_id=t.id WHERE t.status='open' AND t.linked_account_id IS NOT NULL GROUP BY t.linked_account_id)
 SELECT a.*,COALESCE(l.balance,0) AS ledger_balance,COALESCE(o.balance,0) AS order_balance FROM pos_accounts a LEFT JOIN ledger l ON l.account_id=a.id LEFT JOIN orders o ON o.linked_account_id=a.id WHERE a.deleted_at IS NULL ORDER BY a.name COLLATE NOCASE`).all().map(row=>({...row,name:String(row.name).toLocaleUpperCase('tr-TR'),balance:Number(row.ledger_balance)+Number(row.order_balance),is_active:!!row.is_active})) as unknown as Account[];}

export function accountHistory(d:DatabaseSync,id:string){
 if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=?').get(id))throw new PosError('Cari hesap bulunamadı.',404);
 const entries=d.prepare('SELECT * FROM pos_ledger WHERE account_id=? ORDER BY created_at DESC,rowid DESC').all(id) as unknown as AccountEntry[];
 for(const row of d.prepare('SELECT id FROM pos_tickets WHERE linked_account_id=?').all(id)){
  const t=ticket(d,String(row.id));entries.push({id:t.id,account_id:id,ticket_id:t.id,amount:t.total,method:'account',note:`Cari siparişi #${t.number} · ${t.status==='open'?`Kalan ${t.remaining/100} ₺`:'Kapandı'}`,actor:'Kasa',created_at:t.opened_at});
  for(const p of t.payments)if((p.net_amount??p.amount)>0)entries.push({id:p.id,account_id:id,ticket_id:t.id,amount:-(p.net_amount??p.amount),method:p.method,note:p.reference||`Cari sipariş tahsilatı #${t.number}`,actor:p.actor,created_at:p.created_at});
 }
 return entries.sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
export function saveAccount(d:DatabaseSync,input:{id?:string;name:string;phone:string;note:string;is_active:boolean},actor:string){return atomic(d,()=>{const id=input.id||randomUUID();if(input.id&&!d.prepare('SELECT 1 FROM pos_accounts WHERE id=? AND deleted_at IS NULL').get(id))throw new PosError('Cari hesap bulunamadı.',404);d.prepare('INSERT INTO pos_accounts(id,name,phone,note,is_active) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,note=excluded.note,is_active=excluded.is_active').run(id,input.name.toLocaleUpperCase('tr-TR'),input.phone,input.note,Number(input.is_active));event(d,null,'account_save',actor,{...input,id});return accounts(d).find(a=>a.id===id)!;});}
export function deleteAccount(d:DatabaseSync,id:string,actor:string){return atomic(d,()=>{
 const row=d.prepare('SELECT deleted_at FROM pos_accounts WHERE id=?').get(id);if(!row)throw new PosError('Cari hesap bulunamadı.',404);if(row.deleted_at)return {ok:true};
 const a=accounts(d).find(a=>a.id===id)!;if(a.balance!==0)throw new PosError('Bakiyesi sıfır olmayan cari silinemez. Önce borç veya alacak bakiyesini kapatın.');
 if(d.prepare("SELECT 1 FROM pos_tickets WHERE linked_account_id=? AND status='open'").get(id))throw new PosError('Cari siparişi açık. Önce hesabı kapatın.');
 d.prepare('UPDATE pos_accounts SET deleted_at=?,is_active=0 WHERE id=?').run(new Date().toISOString(),id);event(d,null,'account_delete',actor,{id});return {ok:true};
});}
export function collectAccount(d:DatabaseSync,id:string,value:number,method:Exclude<PaymentMethod,'account'>,note:string,requestId:string,actor:string,expectedDayId?:string){return atomic(d,()=>{
 if(expectedDayId&&expectedDayId!==businessDay(d).day_id)throw new PosError('Gün değişti. Ekranı yenileyin.',409);
 rejectExpiredRequest(d,requestId);const payload=JSON.stringify({id,value,method,note,actor}),old=d.prepare('SELECT payload FROM pos_requests WHERE id=?').get(requestId);
 if(old){if(old.payload!==payload)throw new PosError('İşlem anahtarı başka bir istek için kullanılmış.',409);return accounts(d).find(a=>a.id===id)!;}
 amount(value);const a=accounts(d).find(a=>a.id===id);if(!a)throw new PosError('Cari hesap bulunamadı.',404);if(value>a.balance)throw new PosError('Tahsilat cari bakiyesini aşamaz.');
 const legacy=Math.max(0,Number(d.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM pos_ledger WHERE account_id=?').get(id)!.n)),ledgerPart=Math.min(value,legacy),orderPart=value-ledgerPart,now=new Date().toISOString(),day=businessDay(d).day_id;
 if(ledgerPart)d.prepare('INSERT INTO pos_ledger(id,account_id,ticket_id,amount,method,note,actor,created_at,day_id) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),id,null,-ledgerPart,method,note,actor,now,day);
 if(orderPart){const t=openAccountTicket(d,id);if(!t||orderPart>t.remaining)throw new PosError('Cari siparişi değişmiş. Hesabı yenileyin.',409);d.prepare('INSERT INTO pos_payments(id,ticket_id,method,amount,account_id,reference,actor,created_at,day_id) VALUES(?,?,?,?,NULL,?,?,?,?)').run(randomUUID(),t.id,method,orderPart,note,actor,now,day);bump(d,t.id);event(d,t.id,'account_order_collect',actor,{amount:orderPart,method,note});}
 event(d,null,'account_collect',actor,{id,value,method,note});
 d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(requestId,payload,id,new Date().toISOString());return accounts(d).find(a=>a.id===id)!;
});}
export function posSummary(d:DatabaseSync,includeFinance=true,view='full'):PosSummary{
 const day=businessDay(d),today=includeFinance&&['full','summary'].includes(view)?dayTotals(d):{...day,opening_cash:0,opening_breakdown:null,expected_cash:0,cash_in:0,cash_out:0,refunds:0,date:day.opened_at.slice(0,10),closed_count:0,cash:0,card:0,meal_card:0,account:0,discount:0};
 return {open:['full','pos','quick','pending'].includes(view)?ticketsBatch(d,d.prepare("SELECT id FROM pos_tickets WHERE status='open'"+(includeFinance?'':" AND service_type='table' AND linked_account_id IS NULL")+' ORDER BY table_number').all().map(r=>String(r.id))):[],recent:includeFinance&&['full','history'].includes(view)?ticketsBatch(d,d.prepare("SELECT id FROM pos_tickets WHERE status='closed' AND merged_into IS NULL AND closed_day_id=? ORDER BY closed_at DESC LIMIT 40").all(day.day_id).map(r=>String(r.id))):[],accounts:includeFinance&&['full','pos','quick','accounts','pending','history'].includes(view)?accounts(d):[],pending:['full','pending'].includes(view)?pendingOrders(d):[],today};
}
export function pendingOrders(d:DatabaseSync):PendingOrder[]{return d.prepare("SELECT * FROM pos_orders WHERE status='pending' ORDER BY created_at").all().map(row=>({...row,lines:JSON.parse(String(row.lines))})) as PendingOrder[];}
export function submitCustomerOrder(d:DatabaseSync,id:string,table:number,lines:AddLine[],note:string){return atomic(d,()=>{
 rejectExpiredRequest(d,id);const payload=JSON.stringify({table,lines,note}),old=d.prepare('SELECT payload,result FROM pos_requests WHERE id=?').get(id);
 if(old){if(old.payload!==payload)throw new PosError('İşlem anahtarı başka bir siparişte kullanılmış.',409);return {id,number:Number(old.result)};}
 tableRange(d,table);if(!lines.length||lines.length>50)throw new PosError('1–50 ürün seçin.');
 const quoted=lines.map(line=>quoteLine(d,line,true)),number=Number(d.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM pos_orders').get()!.n);
 d.prepare('INSERT INTO pos_orders(id,number,table_number,lines,created_at,note) VALUES(?,?,?,?,?,?)').run(id,number,table,JSON.stringify(quoted),new Date().toISOString(),note);
 d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(id,payload,String(number),new Date().toISOString());event(d,null,'customer_order','Müşteri',{id,table,number});return {id,number};
});}
export function decideCustomerOrder(d:DatabaseSync,id:string,accept:boolean,actor:string){return atomic(d,()=>{
 const order=d.prepare('SELECT * FROM pos_orders WHERE id=?').get(id);if(!order)throw new PosError('Sipariş bulunamadı.',404);
 if(order.status!=='pending'){if(order.status===(accept?'accepted':'rejected'))return {ticket_id:order.ticket_id?String(order.ticket_id):null};throw new PosError('Sipariş zaten işlenmiş.',409);}
 let ticketId:string|null=null;
 if(accept){
  const lines=JSON.parse(String(order.lines)) as PendingOrder['lines'];
  for(const line of lines)quoteLine(d,{...line,expected_unit_price:undefined},true);
  ticketId=createTicket(d,Number(order.table_number),actor);
  for(const line of lines)d.prepare('INSERT INTO pos_lines(id,ticket_id,item_id,name,variant,unit_price,quantity,note,source,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),ticketId,line.item_id,line.name,line.variant,line.unit_price,line.quantity,[line.note,String(order.note)].filter(Boolean).join(' · '),'customer',actor,new Date().toISOString());
  recordOrderActivity(d,ticketId);bump(d,ticketId);
 }
 d.prepare('UPDATE pos_orders SET status=?,ticket_id=? WHERE id=?').run(accept?'accepted':'rejected',ticketId,id);event(d,ticketId,accept?'order_accept':'order_reject',actor,{id});return {ticket_id:ticketId};
});}
export function posRevision(d:DatabaseSync){return String(d.prepare('SELECT revision FROM menu_revision WHERE id=1').get()!.revision)+'-'+businessDay(d).day_id+'-'+String(d.prepare('SELECT COALESCE(MAX(rowid),0) AS v FROM pos_events').get()!.v);}
export function recordPosEvent(d:DatabaseSync,action:string,actor:string,data:unknown){event(d,null,action,actor,data);}
