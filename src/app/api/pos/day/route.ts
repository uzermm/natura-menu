import {writeFileSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db,dataDir} from '@/lib/db';
import {requireAdmin,jsonBody,noStore,HttpError} from '@/lib/api';
import {businessDay,dayTotals,closePreview,closeBusinessDay,cariExport,rejectExpiredRequest} from '@/lib/pos-operations';
import {recordPosEvent} from '@/lib/pos-core';
import {posErrorResponse} from '@/lib/pos-response';
export async function GET(req:Request){try{await requireAdmin();if(new URL(req.url).searchParams.get('export')==='cari')return Response.json(cariExport(db()),{headers:{...noStore,'Content-Disposition':'attachment; filename="natura-cari.json"'}});return Response.json(closePreview(db()),{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{
 await requireAdmin(req);const raw=await jsonBody(req);
 if(raw.action==='close'){
  const v=z.object({action:z.literal('close'),request_id:z.string().uuid(),day_id:z.string().uuid(),revision:z.string(),counted_cash:z.number().int().min(0).max(1000000000),note:z.string().trim().max(500),confirm:z.literal('GÜNÜ KAPAT')}).parse(raw);
  const result=closeBusinessDay(db(),v,snapshot=>{mkdirSync(dataDir,{recursive:true});const tmp=path.join(dataDir,'cari-koruma.tmp'),dest=path.join(dataDir,'cari-koruma.json');writeFileSync(tmp,JSON.stringify(snapshot),{mode:0o600});renameSync(tmp,dest);});return Response.json(result,{headers:noStore});
 }
 const v=z.object({action:z.enum(['opening','in','out']),request_id:z.string().uuid(),day_id:z.string().uuid(),amount:z.number().int().min(0).max(100000000),note:z.string().trim().max(500)}).parse(raw),d=db();d.exec('BEGIN IMMEDIATE');try{
  rejectExpiredRequest(d,v.request_id);const day=businessDay(d);if(v.day_id!==day.day_id)throw new HttpError(409,'Gün değişti. Özeti yenileyin.');const payload=JSON.stringify(v),old=d.prepare('SELECT payload FROM pos_requests WHERE id=?').get(v.request_id);if(old){if(old.payload!==payload)throw new HttpError(409,'İşlem anahtarı kullanılmış.');d.exec('COMMIT');return Response.json(dayTotals(d));}
  if(v.action==='opening'){if(day.opening_cash!==null)throw new HttpError(400,'Açılış kasası zaten girilmiş.');d.prepare('UPDATE pos_day SET opening_cash=? WHERE id=1').run(v.amount);}else{if(v.amount<=0||!v.note)throw new HttpError(400,'Tutar ve neden girin.');d.prepare('INSERT INTO pos_cash_moves VALUES(?,?,?,?,?,?,?)').run(randomUUID(),day.day_id,v.action,v.amount,v.note,'Kasa',new Date().toISOString());}
  recordPosEvent(d,'cash_'+v.action,'Kasa',{amount:v.amount,note:v.note});d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(v.request_id,payload,'cash',new Date().toISOString());d.exec('COMMIT');return Response.json(dayTotals(d));
 }catch(error){d.exec('ROLLBACK');throw error;}
}catch(error){return posErrorResponse(error);}}
