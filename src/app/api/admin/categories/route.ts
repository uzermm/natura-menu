import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { categorySchema } from '@/lib/validation';
import { requireAdmin,errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try {
 await requireAdmin(req);const c=categorySchema.parse(await jsonBody(req));const id=c.id||randomUUID();
 if(c.id){if(!db().prepare('UPDATE categories SET name=?,image_url=?,display_order=?,is_active=? WHERE id=?').run(c.name,c.image_url,c.display_order,Number(c.is_active),id).changes)throw new HttpError(404,'Kategori bulunamadı.');}
 else db().prepare('INSERT INTO categories(id,name,image_url,display_order,is_active) VALUES(?,?,?,?,?)').run(id,c.name,c.image_url,c.display_order,Number(c.is_active));
 return Response.json({id});
}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try {await requireAdmin(req);const {id}=await jsonBody(req);if(typeof id!=='string')throw new HttpError(400,'Geçersiz kategori.');db().prepare('DELETE FROM categories WHERE id=?').run(id);return Response.json({ok:true});}catch(e){return errorResponse(e);}}
