import {requireCashier} from '@/lib/operator';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { itemSchema } from '@/lib/validation';
import { errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try {
 await requireCashier(req);const i=itemSchema.parse(await jsonBody(req));const id=i.id||randomUUID();
 if(!db().prepare('SELECT id FROM categories WHERE id=?').get(i.category_id))throw new HttpError(400,'Kategori bulunamadı.');
 const values=[i.category_id,i.name,i.description,i.price,i.image_url,Number(i.image_generated),i.display_order,Number(i.is_active),Number(i.sold_out),Number(i.featured),JSON.stringify(i.allergens),Number(i.allergens_verified),JSON.stringify(i.tags),JSON.stringify(i.variants),i.original_price];
 if(i.id){if(!db().prepare('UPDATE items SET category_id=?,name=?,description=?,price=?,image_url=?,image_generated=?,display_order=?,is_active=?,sold_out=?,featured=?,allergens=?,allergens_verified=?,tags=?,variants=?,original_price=?,qr_visible=COALESCE(?,qr_visible) WHERE id=?').run(...values,i.qr_visible===undefined?null:Number(i.qr_visible),id).changes)throw new HttpError(404,'Ürün bulunamadı.');}
 else db().prepare('INSERT INTO items(category_id,name,description,price,image_url,image_generated,display_order,is_active,sold_out,featured,allergens,allergens_verified,tags,variants,original_price,qr_visible,id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(...values,Number(i.qr_visible??true),id);
 return Response.json({id});
}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try{await requireCashier(req);const {id}=await jsonBody(req);if(typeof id!=='string')throw new HttpError(400,'Geçersiz ürün.');db().prepare('DELETE FROM items WHERE id=?').run(id);return Response.json({ok:true});}catch(e){return errorResponse(e);}}
