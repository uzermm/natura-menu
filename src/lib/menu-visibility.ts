import type {DatabaseSync} from 'node:sqlite';

// Keep QR visibility separate from whether a product/category can be sold.
// Existing menus remain unchanged until the owner toggles this setting.
export function initMenuVisibility(d:DatabaseSync){
 for(const table of ['categories','items']){
  const columns=d.prepare(`PRAGMA table_info(${table})`).all();
  if(columns.length&&!columns.some(c=>c.name==='qr_visible'))d.exec(`ALTER TABLE ${table} ADD COLUMN qr_visible INTEGER NOT NULL DEFAULT 1 CHECK(qr_visible IN (0,1))`);
 }
}
