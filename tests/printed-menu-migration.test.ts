import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initPrintedMenu} from '../src/lib/printed-menu-migration.ts';
test('printed page assignments and breakfast service note survive renames and owner edits',()=>{
 const d=new DatabaseSync(':memory:');d.exec("CREATE TABLE categories(id TEXT,name TEXT);CREATE TABLE items(id TEXT,name TEXT);CREATE TABLE migrations(version INTEGER PRIMARY KEY,applied_at TEXT);INSERT INTO categories VALUES('hot','SICAK İÇECEKLER'),('food','YEMEKLER');INSERT INTO items VALUES('breakfast','Serpme Kahvaltı')");initPrintedMenu(d);
 assert.equal(d.prepare("SELECT print_page FROM categories WHERE id='hot'").get()!.print_page,'drinks');assert.equal(d.prepare("SELECT service_note FROM items").get()!.service_note,'Sadece hafta sonları');
 d.exec("UPDATE categories SET name='KAHVELER' WHERE id='hot';UPDATE categories SET print_page='drinks' WHERE id='food';UPDATE items SET service_note=''");initPrintedMenu(d);
 assert.equal(d.prepare("SELECT print_page FROM categories WHERE id='hot'").get()!.print_page,'drinks');assert.equal(d.prepare("SELECT print_page FROM categories WHERE id='food'").get()!.print_page,'drinks');assert.equal(d.prepare('SELECT service_note FROM items').get()!.service_note,'');d.close();
});
