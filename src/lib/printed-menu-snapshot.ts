import {db,getCategories} from './db';
import {printedHeaderDishes,type PrintedSnapshot} from './printed-menu-types';
export function printedMenuSnapshot():PrintedSnapshot{
 const d=db();d.exec('BEGIN');try{
  const categories=getCategories(),revision=Number(d.prepare('SELECT revision FROM menu_revision WHERE id=1').get()!.revision);
  const image=d.prepare('SELECT image_url FROM items WHERE id=?');
  const headerImages=Object.fromEntries(printedHeaderDishes.map(dish=>[dish.id,String(image.get(dish.id)?.image_url||dish.src)]));
  d.exec('COMMIT');return {categories,revision,headerImages,checkedAt:new Date().toISOString()};
 }catch(error){d.exec('ROLLBACK');throw error;}
}
