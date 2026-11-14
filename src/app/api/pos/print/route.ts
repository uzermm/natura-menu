import { createHash,randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin,jsonBody,HttpError,noStore } from '@/lib/api';
import { ticket } from '@/lib/pos-core';
import { posErrorResponse } from '@/lib/pos-response';
export async function GET(){try{await requireAdmin();const p=db().prepare('SELECT last_seen FROM pos_printers WHERE id=1').get();return Response.json({configured:!!p,last_seen:p?.last_seen||null,jobs:db().prepare('SELECT id,ticket_id,status,created_at,claimed_at,finished_at,error FROM pos_print_jobs ORDER BY created_at DESC LIMIT 30').all()},{headers:noStore});}catch(e){return posErrorResponse(e);}}
export async function POST(req:Request){try{
 await requireAdmin(req);const input=await jsonBody(req),d=db();
 if(input.action==='configure'){
  const token=randomBytes(32).toString('base64url');d.prepare('INSERT INTO pos_printers(id,token_hash) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,last_seen=NULL').run(createHash('sha256').update(token).digest('hex'));return Response.json({token},{headers:noStore});
 }
 const v=z.object({ticket_id:z.string().uuid(),version:z.number().int().positive(),request_id:z.string().uuid()}).parse(input);
 if(!d.prepare('SELECT 1 FROM pos_printers WHERE id=1').get())throw new HttpError(400,'Önce Yazıcı bölümünden kasa bilgisayarının bağlantısını kurun.');
 const t=ticket(d,v.ticket_id);if(t.version!==v.version)throw new HttpError(409,'Adisyon değişti. Yenileyip tekrar yazdırın.');
 const old=d.prepare('SELECT ticket_id FROM pos_print_jobs WHERE id=?').get(v.request_id);if(old){if(old.ticket_id!==t.id)throw new HttpError(409,'İşlem anahtarı başka bir çıktı için kullanılmış.');return Response.json({ok:true,id:v.request_id});}
 d.prepare('INSERT INTO pos_print_jobs(id,ticket_id,payload,created_at) VALUES(?,?,?,?)').run(v.request_id,t.id,JSON.stringify({business:'Natura Bistro',ticket:t,requested_by:'Kasa',printed_at:new Date().toISOString()}),new Date().toISOString());return Response.json({ok:true,id:v.request_id});
}catch(e){return posErrorResponse(e);}}
