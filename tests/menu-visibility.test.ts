import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {initPos,executePos,submitCustomerOrder,decideCustomerOrder,saveAccount} from '../src/lib/pos-core.ts';
import {resolveCampaign} from '../src/lib/campaign.ts';
import type {Category} from '../src/lib/types.ts';
function fixture(){const d=new DatabaseSync(':memory:');d.exec(`PRAGMA foreign_keys=ON;CREATE TABLE settings(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO settings VALUES(1,'{"table_count":35}');CREATE TABLE categories(id TEXT PRIMARY KEY,is_active INTEGER);INSERT INTO categories VALUES('food',1);CREATE TABLE items(id TEXT PRIMARY KEY,category_id TEXT,name TEXT,price INTEGER,variants TEXT,is_active INTEGER,sold_out INTEGER);INSERT INTO items VALUES('tea','food','Çay',2000,'[]',1,0);`);initPos(d);return d;}
const lines=[{item_id:'tea',quantity:1,variant:'',note:''}];
test('visibility migration keeps existing activation, defaults visible and does not reset hidden flags',()=>{const d=fixture();try{assert.equal(d.prepare("SELECT qr_visible FROM items WHERE id='tea'").get()!.qr_visible,1);d.exec("UPDATE categories SET qr_visible=0;UPDATE items SET qr_visible=0,is_active=0");initPos(d);assert.equal(d.prepare("SELECT qr_visible FROM categories WHERE id='food'").get()!.qr_visible,0);assert.equal(d.prepare("SELECT is_active FROM items WHERE id='tea'").get()!.is_active,0);assert.equal(d.prepare("SELECT qr_visible FROM items WHERE id='tea'").get()!.qr_visible,0);}finally{d.close();}});
test('QR-hidden products and categories remain sellable in tables, quick orders and cari, but reject customer orders',()=>{const d=fixture();try{
 for(const table of ['items','categories']){
  d.exec('UPDATE items SET qr_visible=1;UPDATE categories SET qr_visible=1');d.exec(`UPDATE ${table} SET qr_visible=0`);
  assert.throws(()=>submitCustomerOrder(d,randomUUID(),1,lines,''),/QR menü/);
  assert.equal(executePos(d,randomUUID(),{action:'open_order',table:table==='items'?1:2,lines}).lines.length,1);
  assert.equal(executePos(d,randomUUID(),{action:'open_quick',service_type:'counter',account_name:'Kasa',lines}).lines.length,1);
  const a=saveAccount(d,{name:table,phone:'',note:'',is_active:true},'Kasa');assert.equal(executePos(d,randomUUID(),{action:'open_account',account_id:a.id,lines}).lines.length,1);
 }
 d.exec('UPDATE items SET qr_visible=1;UPDATE categories SET qr_visible=1');const pending=submitCustomerOrder(d,randomUUID(),3,lines,'');d.exec('UPDATE items SET qr_visible=0');assert.throws(()=>decideCustomerOrder(d,pending.id,true,'Kasa'),/QR menü/);d.exec('UPDATE items SET qr_visible=1');assert.ok(decideCustomerOrder(d,pending.id,true,'Kasa').ticket_id);
 d.exec('UPDATE items SET is_active=0');assert.throws(()=>executePos(d,randomUUID(),{action:'open_quick',service_type:'counter',account_name:'Pasif',lines}),/satışta değil/);
}finally{d.close();}});
test('QR-hidden products and parent categories cannot leak through campaigns',()=>{
 const categories:Category[]=[{id:'food',name:'İçecek',image_url:'',display_order:0,is_active:true,qr_visible:true,items:[{id:'tea',category_id:'food',name:'Çay',description:'',display_order:0,is_active:true,qr_visible:true,sold_out:false,featured:false,image_url:'/menu/tea.webp',image_generated:false,allergens:[],allergens_verified:false,tags:[],variants:[],price:2000,original_price:null}]}];
 const c={item_id:'tea',variant:'',price:1500};assert.ok(resolveCampaign(categories,c));categories[0].items[0].qr_visible=false;assert.equal(resolveCampaign(categories,c),null);categories[0].items[0].qr_visible=true;categories[0].qr_visible=false;assert.equal(resolveCampaign(categories,c),null);
});
