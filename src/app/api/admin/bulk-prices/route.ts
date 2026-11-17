import {requireAdmin} from '@/lib/api';
import { z } from 'zod';
import { db,transaction } from '@/lib/db';
import { errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try{
 await requireAdmin(req);const {percent,category_id}=z.object({percent:z.number().min(-90).max(500),category_id:z.string().max(80)}).parse(await jsonBody(req));
 const rows=category_id?db().prepare('SELECT * FROM items WHERE category_id=?').all(category_id):db().prepare('SELECT * FROM items').all();
 const factor=1+percent/100;
 if(rows.some(i=>Number(i.price)*factor>100000000||JSON.parse(i.variants as string).some((v:{price:number})=>v.price*factor>100000000)))throw new HttpError(400,'Fiyat sınırı aşılıyor.');
 transaction(()=>{for(const i of rows){const variants=JSON.parse(i.variants as string).map((v:{name:string;price:number})=>({...v,price:Math.round(v.price*factor)}));db().prepare('UPDATE items SET price=?,original_price=?,variants=? WHERE id=?').run(Math.round(Number(i.price)*factor),i.original_price===null?null:Math.round(Number(i.original_price)*factor),JSON.stringify(variants),i.id);}});
 return Response.json({updated:rows.length});
}catch(e){return errorResponse(e);}}
