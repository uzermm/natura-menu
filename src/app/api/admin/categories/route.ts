import {requireAdmin} from '@/lib/api';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { categorySchema } from '@/lib/validation';
import { errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try {
 await requireAdmin(req);const c=categorySchema.parse(await jsonBody(req));const id=c.id||randomUUID();
 if(c.id){if(!c.version)throw new HttpError(409,'Kategori değişti. Sayfayı yenileyin.');if(!db().prepare('UPDATE categories SET name=?,image_url=?,display_order=?,is_active=?,qr_visible=COALESCE(?,qr_visible),print_page=COALESCE(?,print_page) WHERE id=? AND version=?').run(c.name,c.image_url,c.display_order,Number(c.is_active),c.qr_visible===undefined?null:Number(c.qr_visible),c.print_page??null,id,c.version).changes)throw new HttpError(409,'Kategori değişti. Sayfayı yenileyin.');}
 else db().prepare('INSERT INTO categories(id,name,image_url,display_order,is_active,qr_visible,print_page) VALUES(?,?,?,?,?,?,?)').run(id,c.name,c.image_url,c.display_order,Number(c.is_active),Number(c.qr_visible??true),c.print_page??'food');
 return Response.json({id});
}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try {await requireAdmin(req);const {id,version}=await jsonBody(req);if(typeof id!=='string'||!Number.isInteger(version))throw new HttpError(400,'Geçersiz kategori.');if(!db().prepare('DELETE FROM categories WHERE id=? AND version=?').run(id,version).changes)throw new HttpError(409,'Kayıt değişti. Sayfayı yenileyin.');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
