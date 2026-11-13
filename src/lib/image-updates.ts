import type { DatabaseSync } from 'node:sqlite';

export interface GeneratedImageUpdate { id:string;previous_image_url:string;image_url:string }

// Only fill blank slots or replace the exact old placeholder. An image uploaded
// by the owner after the snapshot must be preserved, along with all other edits.
export function applyGeneratedImageUpdates(database:DatabaseSync,updates:GeneratedImageUpdate[]) {
 const statement=database.prepare("UPDATE items SET image_url=?,image_generated=1 WHERE id=? AND (COALESCE(image_url,'')='' OR image_url=?)");
 let changed=0;
 for(const update of updates)changed+=Number(statement.run(update.image_url,update.id,update.previous_image_url).changes);
 return changed;
}
