import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { initPos,executePos,ticket,saveAccount,accounts,collectAccount,accountHistory,posSummary,submitCustomerOrder,decideCustomerOrder,pendingOrders } from '../src/lib/pos-core.ts';
import type { PosCommand } from '../src/lib/pos-core.ts';
function fixture(){
 const d=new DatabaseSync(':memory:');d.exec(`PRAGMA foreign_keys=ON;CREATE TABLE settings(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO settings VALUES(1,'{"table_count":35}');CREATE TABLE categories(id TEXT PRIMARY KEY,is_active INTEGER);INSERT INTO categories VALUES('food',1);CREATE TABLE items(id TEXT PRIMARY KEY,category_id TEXT,name TEXT,price INTEGER,variants TEXT,is_active INTEGER,sold_out INTEGER);INSERT INTO items VALUES('tea','food','Çay',2000,'[]',1,0),('coffee','food','Türk Kahvesi',10000,'[]',1,0),('toast','food','Tost',15000,'[{"name":"Büyük","price":18000}]',1,0);`);initPos(d);return d;
}
const run=(d:DatabaseSync,c:PosCommand)=>executePos(d,randomUUID(),c);
test('adisyon snapshots prices, supports split payment + account and exact daily cash totals',()=>{
 const d=fixture();try{
 let t=run(d,{action:'open',table:1});t=run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'tea',variant:'',quantity:4,note:''},{item_id:'coffee',variant:'',quantity:2,note:'Sade'}]});assert.equal(t.total,28000);
 d.prepare('UPDATE items SET price=3000,name=? WHERE id=?').run('Yeni çay','tea');assert.equal(ticket(d,t.id).total,28000);assert.equal(ticket(d,t.id).lines[0].name,'Çay');
 t=run(d,{action:'discount',ticket_id:t.id,version:t.version,amount:2800,note:'%10'});assert.equal(t.remaining,25200);
 t=run(d,{action:'pay',ticket_id:t.id,version:t.version,method:'cash',amount:10000,reference:'',close:false});assert.equal(t.remaining,15200);
 t=run(d,{action:'pay',ticket_id:t.id,version:t.version,method:'card',amount:5000,reference:'',close:false});
 t=run(d,{action:'pay',ticket_id:t.id,version:t.version,method:'meal_card',amount:2000,reference:'Multinet',close:false});
 const a=saveAccount(d,{name:'Firma A',phone:'',note:'',is_active:true},'Kasa');
 t=run(d,{action:'pay',ticket_id:t.id,version:t.version,method:'account',account_id:a.id,amount:8200,reference:'',close:true});assert.equal(t.status,'closed');assert.equal(t.remaining,0);assert.equal(accounts(d)[0].balance,8200);
 const key=randomUUID();collectAccount(d,a.id,3200,'cash','İlk tahsilat',key,'Kasa');collectAccount(d,a.id,3200,'cash','İlk tahsilat',key,'Kasa');assert.equal(accounts(d)[0].balance,5000);
 const entries=accountHistory(d,a.id);assert.equal(entries.length,2);assert.equal(entries[1].ticket_id,t.id);assert.equal(ticket(d,entries[1].ticket_id!).lines.length,2);
 const summary=posSummary(d);assert.equal(summary.today.cash,13200);assert.equal(summary.today.card,5000);assert.equal(summary.today.meal_card,2000);assert.equal(summary.today.account,8200);assert.equal(summary.today.discount,2800);assert.equal(summary.today.closed_count,1);
 assert.throws(()=>collectAccount(d,a.id,5001,'cash','',randomUUID(),'Kasa'));assert.equal(accounts(d)[0].balance,5000);
 }finally{d.close();}
});
test('idempotency, concurrent stale changes and transaction rollback prevent duplicate or partial writes',()=>{
 const d=fixture();try{
 let t=run(d,{action:'open',table:3});const key=randomUUID(),command:PosCommand={action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'tea',variant:'',quantity:2,note:''}]};t=executePos(d,key,command);executePos(d,key,command);assert.equal(ticket(d,t.id).lines.length,1);
 assert.throws(()=>executePos(d,key,{action:'open',table:4}));assert.throws(()=>run(d,{action:'add',ticket_id:t.id,version:1,lines:command.lines}));
 assert.throws(()=>run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'coffee',variant:'',quantity:1,note:''},{item_id:'missing',variant:'',quantity:1,note:''}]}));assert.equal(ticket(d,t.id).lines.length,1);
 const payKey=randomUUID(),pay:PosCommand={action:'pay',ticket_id:t.id,version:t.version,method:'cash',amount:2000,reference:'',close:false};t=executePos(d,payKey,pay);executePos(d,payKey,pay);assert.equal(ticket(d,t.id).paid,2000);assert.equal(ticket(d,t.id).payments.length,1);
 assert.throws(()=>run(d,{action:'close',ticket_id:t.id,version:t.version}));assert.throws(()=>run(d,{action:'pay',ticket_id:t.id,version:t.version,method:'cash',amount:2001,reference:'',close:false}));assert.throws(()=>run(d,{action:'void',ticket_id:t.id,version:t.version,line_id:t.lines[0].id,reason:'Hata'}));
 }finally{d.close();}
});
test('whole-table transfer retains lines and payments, occupied targets reject and old table is reusable',()=>{
 const d=fixture();try{
 let t=run(d,{action:'open',table:1});t=run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'coffee',variant:'',quantity:1,note:''}]});t=run(d,{action:'pay',ticket_id:t.id,version:t.version,method:'cash',amount:3000,reference:'',close:false});run(d,{action:'open',table:2});
 assert.throws(()=>run(d,{action:'move',ticket_id:t.id,version:t.version,table:2}));assert.throws(()=>run(d,{action:'move',ticket_id:t.id,version:t.version,table:36}));
 t=run(d,{action:'move',ticket_id:t.id,version:t.version,table:30});assert.equal(t.table_number,30);assert.equal(t.paid,3000);assert.equal(t.lines.length,1);assert.notEqual(run(d,{action:'open',table:1}).id,t.id);
 }finally{d.close();}
});
test('variants, active menu availability and void history remain correct',()=>{
 const d=fixture();try{
 let t=run(d,{action:'open',table:1});assert.throws(()=>run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'toast',variant:'',quantity:1,note:''}]}));
 assert.throws(()=>run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'tea',variant:'',quantity:1,note:'',expected_unit_price:1000}]}));
 t=run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'toast',variant:'Büyük',quantity:2,note:''}]});assert.equal(t.total,36000);
 t=run(d,{action:'quantity',ticket_id:t.id,version:t.version,line_id:t.lines[0].id,quantity:1});assert.equal(t.total,18000);
 t=run(d,{action:'void',ticket_id:t.id,version:t.version,line_id:t.lines[0].id,reason:'Yanlış ürün'});assert.equal(t.total,0);assert.equal(t.lines[0].void_reason,'Yanlış ürün');
 d.prepare("UPDATE categories SET is_active=0 WHERE id='food'").run();assert.throws(()=>run(d,{action:'add',ticket_id:t.id,version:t.version,lines:[{item_id:'tea',variant:'',quantity:1,note:''}]}));
 }finally{d.close();}
});
test('customer orders require approval, keep quoted prices, append once to the selected table and reject safely',()=>{
 const d=fixture();try{
 const id=randomUUID(),lines=[{item_id:'coffee',variant:'',quantity:2,note:'Şekersiz'}];const order=submitCustomerOrder(d,id,7,lines,'Cam kenarı');assert.equal(submitCustomerOrder(d,id,7,lines,'Cam kenarı').number,order.number);assert.equal(posSummary(d).open.length,0);assert.equal(pendingOrders(d).length,1);
 d.prepare("UPDATE items SET price=12000 WHERE id='coffee'").run();const accepted=decideCustomerOrder(d,id,true,'ayse');const t=ticket(d,accepted.ticket_id!);assert.equal(t.table_number,7);assert.equal(t.total,20000);assert.equal(t.lines[0].source,'customer');decideCustomerOrder(d,id,true,'ayse');assert.equal(ticket(d,t.id).lines.length,1);
 const other=randomUUID();submitCustomerOrder(d,other,7,lines,'');decideCustomerOrder(d,other,true,'Kasa');assert.equal(ticket(d,t.id).lines.length,2);
 const rejected=randomUUID();submitCustomerOrder(d,rejected,7,lines,'');decideCustomerOrder(d,rejected,false,'Kasa');assert.throws(()=>decideCustomerOrder(d,rejected,true,'Kasa'));assert.equal(pendingOrders(d).length,0);
 }finally{d.close();}
});

test('quick sales are independent from physical tables, idempotent, partially payable and named in account history',()=>{
 const d=fixture();try{
 const table=run(d,{action:'open',table:1}),key=randomUUID(),input:PosCommand={action:'open_quick',service_type:'takeaway',account_name:'  Ahmet Paket  ',lines:[{item_id:'coffee',variant:'',quantity:2,note:''}]};
 let q=executePos(d,key,input);assert.equal(q.table_number,null);assert.equal(q.service_type,'takeaway');assert.equal(q.account_name,'Ahmet Paket');assert.equal(q.total,20000);assert.equal(executePos(d,key,input).id,q.id);
 assert.equal(run(d,{action:'open',table:1}).id,table.id);const other=run(d,{action:'open_quick',service_type:'counter',account_name:'Ahmet Paket'});assert.notEqual(other.id,q.id);assert.equal(posSummary(d).open.length,3);
 q=run(d,{action:'pay',ticket_id:q.id,version:q.version,method:'cash',amount:5000,reference:'',close:false,quick:{service_type:'counter',account_name:'Kasadan Ahmet'}});assert.equal(q.remaining,15000);assert.equal(q.status,'open');assert.equal(q.account_name,'Kasadan Ahmet');
 const a=saveAccount(d,{name:'Firma',phone:'',note:'',is_active:true},'Kasa');q=run(d,{action:'pay',ticket_id:q.id,version:q.version,method:'account',account_id:a.id,amount:15000,reference:'',close:true});assert.equal(q.status,'closed');assert.equal(q.remaining,0);assert.ok(!posSummary(d).open.some(t=>t.id===q.id));assert.match(accountHistory(d,a.id)[0].note,/Kasadan Ahmet/);assert.doesNotMatch(accountHistory(d,a.id)[0].note,/Masa null|Masa 1/);
 const count=d.prepare('SELECT COUNT(*) AS n FROM pos_tickets').get()!.n;assert.throws(()=>run(d,{action:'open_quick',service_type:'counter',account_name:'Hata',lines:[{item_id:'missing',variant:'',quantity:1,note:''}]}));assert.equal(d.prepare('SELECT COUNT(*) AS n FROM pos_tickets').get()!.n,count);
 }finally{d.close();}
});

test('named quick sales can be moved to a free physical table without replacing an occupied one',()=>{
 const d=fixture();try{
 run(d,{action:'open',table:1});let q=run(d,{action:'open_quick',service_type:'counter',account_name:'Tezgah',lines:[{item_id:'tea',variant:'',quantity:3,note:''}]});assert.throws(()=>run(d,{action:'move',ticket_id:q.id,version:q.version,table:1}));q=run(d,{action:'move',ticket_id:q.id,version:q.version,table:2});assert.equal(q.service_type,'table');assert.equal(q.table_number,2);assert.equal(q.total,6000);assert.equal(run(d,{action:'open',table:2}).id,q.id);
 }finally{d.close();}
});

test('legacy ticket migration preserves ticket IDs, lines, payments and table uniqueness',()=>{
 const d=new DatabaseSync(':memory:');try{
 d.exec("PRAGMA foreign_keys=ON; CREATE TABLE pos_tickets(id TEXT PRIMARY KEY,number INTEGER NOT NULL UNIQUE,table_number INTEGER NOT NULL CHECK(table_number>0),status TEXT NOT NULL DEFAULT 'open',version INTEGER NOT NULL DEFAULT 1,opened_at TEXT NOT NULL,closed_at TEXT,discount INTEGER NOT NULL DEFAULT 0,note TEXT NOT NULL DEFAULT ''); CREATE UNIQUE INDEX one_open_ticket_per_table ON pos_tickets(table_number) WHERE status='open'; INSERT INTO pos_tickets(id,number,table_number,opened_at) VALUES('existing',1,1,'2026-11-15T10:00:00.000Z');");
 d.exec("CREATE TABLE pos_accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',is_active INTEGER NOT NULL DEFAULT 1); CREATE TABLE pos_lines(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES pos_tickets(id),item_id TEXT NOT NULL,name TEXT NOT NULL,variant TEXT NOT NULL DEFAULT '',unit_price INTEGER NOT NULL,quantity INTEGER NOT NULL,note TEXT NOT NULL DEFAULT '',source TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,voided_at TEXT,void_reason TEXT NOT NULL DEFAULT ''); CREATE TABLE pos_payments(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES pos_tickets(id),method TEXT NOT NULL,amount INTEGER NOT NULL,account_id TEXT REFERENCES pos_accounts(id),reference TEXT NOT NULL DEFAULT '',actor TEXT NOT NULL,created_at TEXT NOT NULL);");d.prepare('INSERT INTO pos_lines(id,ticket_id,item_id,name,unit_price,quantity,source,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('line','existing','tea','Çay',2000,3,'cashier','Kasa','2026-11-15T10:00:00.000Z');d.prepare('INSERT INTO pos_payments VALUES(?,?,?,?,?,?,?,?)').run('pay','existing','cash',1000,null,'','Kasa','2026-11-15T10:00:00.000Z');
 initPos(d);const old=ticket(d,'existing');assert.equal(old.table_number,1);assert.equal(old.service_type,'table');assert.equal(old.lines[0].id,'line');assert.equal(old.paid,1000);assert.equal(old.remaining,5000);
 run(d,{action:'open_quick',service_type:'counter',account_name:'Bir'});run(d,{action:'open_quick',service_type:'takeaway',account_name:'İki'});assert.equal(ticket(d,'existing').remaining,5000);assert.equal(d.prepare('PRAGMA foreign_key_check').all().length,0);
 }finally{d.close();}
});
