import {requireCashier} from '@/lib/operator';
import { z } from 'zod';
import { db,transaction } from '@/lib/db';
import { errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try {
 await requireCashier(req);const {kind,ids,category_id}=z.object({kind:z.enum(['categories','items']),ids:z.array(z.string().min(1)).min(1).max(2000),category_id:z.string().optional()}).parse(await jsonBody(req));
 if(new Set(ids).size!==ids.length)throw new HttpError(400,'Tekrarlanan sıra.');
 const existing=kind==='categories'?db().prepare('SELECT id FROM categories').all():db().prepare('SELECT id FROM items WHERE category_id=?').all(category_id||'');
 if(existing.length!==ids.length||existing.some(x=>!ids.includes(String(x.id))))throw new HttpError(409,'Liste değişti. Sayfayı yenileyin.');
 transaction(()=>{const stmt=db().prepare(`UPDATE ${kind} SET display_order=? WHERE id=?`);ids.forEach((id,index)=>stmt.run(index,id));});return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
