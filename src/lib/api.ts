import { cookies } from 'next/headers';
import { createHmac } from 'node:crypto';
import { ZodError } from 'zod';
import { db, transaction } from './db';
import { sameOrigin, sessionSecret, validSession } from './security';
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export async function requireAdmin(req?:Request) {
 if(!validSession((await cookies()).get('natura_session')?.value))throw new HttpError(401,'Lütfen yönetici girişi yapın.');
 if(req&&!sameOrigin(req))throw new HttpError(403,'Geçersiz istek kaynağı.');
}
export function requireOrigin(req:Request){if(!sameOrigin(req))throw new HttpError(403,'Geçersiz istek kaynağı.');}
export function limited(key:string,max:number,windowMs:number) {
 const d=db(),now=Date.now();
 return transaction(()=>{
 d.prepare('DELETE FROM rate_limits WHERE reset_at<?').run(now);
 const row=d.prepare('SELECT count,reset_at FROM rate_limits WHERE key=?').get(key);
 if(row&&Number(row.count)>=max)return true;
 if(row)d.prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);
 else d.prepare('INSERT INTO rate_limits VALUES(?,?,?)').run(key,1,now+windowMs);
 return false;
 });
}
export function clientKey(req:Request){return createHmac('sha256',sessionSecret()).update(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local').digest('hex');}
export async function jsonBody(req:Request) {
 if(Number(req.headers.get('content-length')||0)>128000)throw new HttpError(413,'İstek çok büyük.');
 if(!req.body)throw new HttpError(400,'Geçersiz veri.');
 const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>128000){await reader.cancel();throw new HttpError(413,'İstek çok büyük.');}chunks.push(value);}
 const body=Buffer.concat(chunks).toString('utf8');
 try{return JSON.parse(body);}catch{throw new HttpError(400,'Geçersiz veri.');}
}
export function errorResponse(error:unknown){
 if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status});
 if(error instanceof ZodError)return Response.json({error:error.issues.map(i=>i.message).join(' ')},{status:400});
 console.error(error instanceof Error?error.message:'Unexpected server error');
 return Response.json({error:'İşlem tamamlanamadı. Lütfen tekrar deneyin.'},{status:500});
}
export const noStore={'Cache-Control':'no-store'};
