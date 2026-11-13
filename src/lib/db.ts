import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import seed from '@/data/menu.json';
import type { Category, Item, Settings, WaiterCall } from './types';

export const dataDir=path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR||'data');
let singleton:DatabaseSync|undefined;
export function db() {
 if(singleton)return singleton;
 mkdirSync(dataDir,{recursive:true});
 const d=new DatabaseSync(path.join(dataDir,'natura.sqlite'));
 d.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,image_url TEXT NOT NULL DEFAULT '',display_order INTEGER NOT NULL DEFAULT 0,is_active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY,category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',price INTEGER NOT NULL CHECK(price>=0),image_url TEXT NOT NULL DEFAULT '',image_generated INTEGER NOT NULL DEFAULT 0,display_order INTEGER NOT NULL DEFAULT 0,is_active INTEGER NOT NULL DEFAULT 1,sold_out INTEGER NOT NULL DEFAULT 0,featured INTEGER NOT NULL DEFAULT 0,allergens TEXT NOT NULL DEFAULT '[]',allergens_verified INTEGER NOT NULL DEFAULT 0,tags TEXT NOT NULL DEFAULT '[]',variants TEXT NOT NULL DEFAULT '[]',original_price INTEGER);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS waiter_calls(id TEXT PRIMARY KEY,table_number INTEGER NOT NULL,created_at TEXT NOT NULL,resolved_at TEXT);
 CREATE UNIQUE INDEX IF NOT EXISTS one_open_call_per_table ON waiter_calls(table_number) WHERE resolved_at IS NULL;
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
 `);
 d.exec('BEGIN IMMEDIATE');
 try {
  if(!d.prepare('SELECT 1 FROM migrations WHERE version=1').get()) {
   const cat=d.prepare('INSERT INTO categories(id,name,image_url,display_order,is_active) VALUES(?,?,?,?,?)');
   const item=d.prepare('INSERT INTO items(id,category_id,name,description,price,image_url,image_generated,display_order,is_active) VALUES(?,?,?,?,?,?,?,?,?)');
   for(const c of seed){cat.run(c.id,c.name,c.image_url||'',c.display_order,Number(c.is_active));for(const i of c.items){item.run(i.id,c.id,i.name,i.description||'',Math.round(Number(String(i.price).replace(',','.'))*100),i.image_url||'',Number('image_generated' in i && i.image_generated),i.display_order,Number(i.is_active));}}
   const settings:Settings={whatsapp:'905513700989',table_count:35,subtitle:'Güzel bir güne, lezzetli bir mola.',address:'',hours:'',announcement:''};
   d.prepare('INSERT INTO settings(id,value) VALUES(1,?)').run(JSON.stringify(settings));
   d.prepare('INSERT INTO migrations VALUES(1,?)').run(new Date().toISOString());
  }
  d.exec('COMMIT');
 }catch(e){d.exec('ROLLBACK');d.close();throw e;}
 singleton=d;return d;
}
export function getSettings():Settings{return JSON.parse(db().prepare('SELECT value FROM settings WHERE id=1').get()!.value as string);}
function readItem(row:Record<string,unknown>):Item {return {...row,is_active:!!row.is_active,sold_out:!!row.sold_out,featured:!!row.featured,image_generated:!!row.image_generated,allergens_verified:!!row.allergens_verified,allergens:JSON.parse(row.allergens as string),tags:JSON.parse(row.tags as string),variants:JSON.parse(row.variants as string)} as Item;}
export function getCategories(admin=false):Category[] {
 const d=db();const rows=d.prepare(`SELECT * FROM items ${admin?'':'WHERE is_active=1'} ORDER BY display_order,name`).all().map(readItem);
 return d.prepare(`SELECT * FROM categories ${admin?'':'WHERE is_active=1'} ORDER BY display_order,name`).all().map(c=>({...c,is_active:!!c.is_active,items:rows.filter(i=>i.category_id===c.id)}) as unknown as Category);
}
export function getCalls():WaiterCall[] {return db().prepare('SELECT * FROM waiter_calls WHERE resolved_at IS NULL OR id IN (SELECT id FROM waiter_calls WHERE resolved_at IS NOT NULL ORDER BY created_at DESC LIMIT 100) ORDER BY created_at DESC').all().map(row=>({...row})) as unknown as WaiterCall[];}
export function transaction<T>(fn:()=>T):T { const d=db();d.exec('BEGIN IMMEDIATE');try {const r=fn();d.exec('COMMIT');return r;}catch(e){d.exec('ROLLBACK');throw e;} }
