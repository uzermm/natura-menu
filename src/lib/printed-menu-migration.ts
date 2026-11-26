import type {DatabaseSync} from 'node:sqlite';
export function initPrintedMenu(d:DatabaseSync){
 d.exec('BEGIN IMMEDIATE');try{
  const cats=d.prepare('PRAGMA table_info(categories)').all(),items=d.prepare('PRAGMA table_info(items)').all();
  if(!cats.some(c=>c.name==='print_page')){d.exec("ALTER TABLE categories ADD COLUMN print_page TEXT NOT NULL DEFAULT 'food' CHECK(print_page IN ('food','drinks'))");for(const c of d.prepare('SELECT id,name FROM categories').all())if(/içecek/i.test(String(c.name).toLocaleLowerCase('tr-TR')))d.prepare("UPDATE categories SET print_page='drinks' WHERE id=?").run(c.id!);}
  if(!items.some(c=>c.name==='service_note'))d.exec("ALTER TABLE items ADD COLUMN service_note TEXT NOT NULL DEFAULT ''");
  if(!d.prepare('SELECT 1 FROM migrations WHERE version=4').get()){
   d.prepare("UPDATE items SET service_note='Sadece hafta sonları' WHERE service_note='' AND (id='4b50fd9c-dc08-4eb6-ae2c-1f6ea5f56829' OR name='Serpme Kahvaltı')").run();
   d.prepare('INSERT INTO migrations VALUES(4,?)').run(new Date().toISOString());
  }d.exec('COMMIT');
 }catch(error){d.exec('ROLLBACK');throw error;}
}
