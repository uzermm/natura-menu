import {requireAdmin} from '@/lib/api';
import { z } from 'zod';
import { db,transaction } from '@/lib/db';
import { errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try{
 await requireAdmin(req);const {percent,category_id,versions,request_id}=z.object({percent:z.number().min(-90).max(500),category_id:z.string().max(80),versions:z.record(z.string(),z.number().int().positive()),request_id:z.string().uuid()}).parse(await jsonBody(req));

 const d=db(),payload=JSON.stringify({percent,category_id,versions});const result=transaction(()=>{
 const old=d.prepare('SELECT payload,result FROM menu_requests WHERE id=?').get(request_id);if(old){if(old.payload!==payload)throw new HttpError(409,'İşlem anahtarı kullanılmış.');return JSON.parse(String(old.result));}
 const rows=category_id?d.prepare('SELECT * FROM items WHERE category_id=?').all(category_id):d.prepare('SELECT * FROM items').all();
 if(rows.length!==Object.keys(versions).length||rows.some(i=>versions[String(i.id)]!==i.version))throw new HttpError(409,'Fiyatlar başka bir ekranda değişti. Sayfayı yenileyin.');
 const factor=1+percent/100;if(rows.some(i=>Number(i.price)*factor>100000000||JSON.parse(String(i.variants)).some((v:{price:number})=>v.price*factor>100000000)))throw new HttpError(400,'Fiyat sınırı aşılıyor.');
 const update=d.prepare('UPDATE items SET price=?,original_price=?,variants=? WHERE id=?');for(const i of rows){const variants=JSON.parse(String(i.variants)).map((v:{name:string;price:number})=>({...v,price:Math.round(v.price*factor)}));update.run(Math.round(Number(i.price)*factor),i.original_price===null?null:Math.round(Number(i.original_price)*factor),JSON.stringify(variants),i.id);}
 const result={updated:rows.length};d.prepare('INSERT INTO menu_requests VALUES(?,?,?,?)').run(request_id,payload,JSON.stringify(result),Date.now());d.prepare('DELETE FROM menu_requests WHERE created_at<?').run(Date.now()-30*86400000);return result;});
 return Response.json(result);
}catch(e){return errorResponse(e);}}
