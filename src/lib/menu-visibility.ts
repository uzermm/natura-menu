import type {DatabaseSync} from 'node:sqlite';

// Keep QR visibility separate from whether a product/category can be sold.
// Existing menus remain unchanged until the owner toggles this setting.
export function initMenuVisibility(d:DatabaseSync){
 d.exec('CREATE TABLE IF NOT EXISTS menu_revision(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL);INSERT OR IGNORE INTO menu_revision VALUES(1,1)');
 for(const table of ['categories','items']){
  const columns=d.prepare(`PRAGMA table_info(${table})`).all();
  if(columns.length&&!columns.some(c=>c.name==='version'))d.exec(`ALTER TABLE ${table} ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
  if(columns.length&&!columns.some(c=>c.name==='qr_visible'))d.exec(`ALTER TABLE ${table} ADD COLUMN qr_visible INTEGER NOT NULL DEFAULT 1 CHECK(qr_visible IN (0,1))`);
  if(columns.length)for(const action of ['INSERT','UPDATE','DELETE'])d.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_revision_${action} AFTER ${action} ON ${table} BEGIN UPDATE menu_revision SET revision=revision+1 WHERE id=1;END;`);
  if(columns.length)d.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_version AFTER UPDATE ON ${table} WHEN NEW.version=OLD.version BEGIN UPDATE ${table} SET version=version+1 WHERE id=NEW.id;END;`);
 }
 if(d.prepare('PRAGMA table_info(items)').all().some(c=>c.name==='category_id')&&d.prepare('PRAGMA table_info(categories)').all().length){
  d.exec('CREATE TRIGGER IF NOT EXISTS item_parent_insert AFTER INSERT ON items BEGIN UPDATE categories SET version=version+1 WHERE id=NEW.category_id;END;CREATE TRIGGER IF NOT EXISTS item_parent_delete AFTER DELETE ON items BEGIN UPDATE categories SET version=version+1 WHERE id=OLD.category_id;END;CREATE TRIGGER IF NOT EXISTS item_parent_update AFTER UPDATE ON items WHEN NEW.version!=OLD.version OR NEW.category_id!=OLD.category_id BEGIN UPDATE categories SET version=version+1 WHERE id IN (NEW.category_id,OLD.category_id);END;');
 }
 if(d.prepare('PRAGMA table_info(settings)').all().length&&!d.prepare('PRAGMA table_info(settings)').all().some(c=>c.name==='version'))d.exec('ALTER TABLE settings ADD COLUMN version INTEGER NOT NULL DEFAULT 1');
 if(d.prepare('PRAGMA table_info(settings)').all().length)d.exec('CREATE TRIGGER IF NOT EXISTS settings_revision AFTER UPDATE ON settings BEGIN UPDATE menu_revision SET revision=revision+1 WHERE id=1;END;');
 d.exec('CREATE TABLE IF NOT EXISTS menu_requests(id TEXT PRIMARY KEY,payload TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL)');
}
