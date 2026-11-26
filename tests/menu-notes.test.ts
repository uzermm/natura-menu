import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initMenuNotes} from '../src/lib/menu-notes.ts';
test('printed menu notes import once and preserve owner changes and product descriptions',()=>{
 const d=new DatabaseSync(':memory:');d.exec("CREATE TABLE items(id TEXT PRIMARY KEY,name TEXT,description TEXT,price INTEGER);CREATE TABLE migrations(version INTEGER PRIMARY KEY,applied_at TEXT)");
 const insert=d.prepare('INSERT INTO items VALUES(?,?,?,?)');for(const name of ['Milkshake','Frozen','Smoothie','Pişi Tabağı','Serpme Kahvaltı','Köri Soslu Tavuk'])insert.run(name,name,'Mevcut açıklama',17000);
 initMenuNotes(d);assert.match(String(d.prepare("SELECT menu_note FROM items WHERE name='Milkshake'").get()!.menu_note),/Çikolata, Muz, Çilek, Vanilya/);assert.match(String(d.prepare("SELECT menu_note FROM items WHERE name='Serpme Kahvaltı'").get()!.menu_note),/kişi başıdır/);
 d.prepare("UPDATE items SET menu_note='' WHERE name='Frozen'").run();d.prepare("UPDATE items SET menu_note='Yeni çeşitler' WHERE name='Milkshake'").run();initMenuNotes(d);
 assert.equal(d.prepare("SELECT menu_note FROM items WHERE name='Frozen'").get()!.menu_note,'');assert.equal(d.prepare("SELECT menu_note FROM items WHERE name='Milkshake'").get()!.menu_note,'Yeni çeşitler');
 assert.equal(d.prepare("SELECT description FROM items WHERE name='Milkshake'").get()!.description,'Mevcut açıklama');assert.equal(d.prepare("SELECT price FROM items WHERE name='Milkshake'").get()!.price,17000);d.close();
});
