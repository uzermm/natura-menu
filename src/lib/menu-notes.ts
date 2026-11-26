import type {DatabaseSync} from 'node:sqlite';
// Import the printed menu notes once. Later edits, including deliberately clearing
// a note, belong to the owner and must never be restored on restart.
export function initMenuNotes(d:DatabaseSync){
 d.exec('BEGIN IMMEDIATE');try{
 if(!d.prepare('PRAGMA table_info(items)').all().some(c=>c.name==='menu_note'))d.exec("ALTER TABLE items ADD COLUMN menu_note TEXT NOT NULL DEFAULT ''");
 if(d.prepare('SELECT 1 FROM migrations WHERE version=3').get()){d.exec('COMMIT');return;}
  const notes:[string,string][]=[['Milkshake','Çikolata, Muz, Çilek, Vanilya'],['Frozen','Çarkıfelek, Mango, Ananas, Şeftali, Yeşil Elma'],['Smoothie','Çarkıfelek, Mango, Ananas, Şeftali, Yeşil Elma'],['Pişi Tabağı','2 adet sade pişi; domates, salatalık ve zeytin ile servis edilir.'],['Serpme Kahvaltı','Fiyat kişi başıdır. En az iki kişilik servis edilir.']];
  for(const name of ['Dağ Kekikli Tavuk','Kremalı Tavuk','Köri Soslu Tavuk','Acılı Tavuk','Barbekü Soslu Tavuk','Soya Soslu Tavuk'])notes.push([name,'Makarna ve salata ile servis edilir.']);
  const update=d.prepare("UPDATE items SET menu_note=? WHERE name=? AND menu_note=''");for(const [name,note] of notes)update.run(note,name);
  d.prepare('INSERT INTO migrations VALUES(3,?)').run(new Date().toISOString());d.exec('COMMIT');
 }catch(error){d.exec('ROLLBACK');throw error;}
}

