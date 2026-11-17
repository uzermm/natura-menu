import {requireCashier} from '@/lib/operator';
import {writeFileSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db,dataDir} from '@/lib/db';
import {jsonBody,noStore,HttpError,requireAdmin} from '@/lib/api';
import {businessDay,dayTotals,closePreview,closeBusinessDay,rejectExpiredRequest} from '@/lib/pos-operations';
import {recordPosEvent} from '@/lib/pos-core';
import {posErrorResponse} from '@/lib/pos-response';
import {cashBreakdownSchema} from '@/lib/cash-breakdown';
import {openingPreset,saveOpeningPreset,recordOpeningCash} from '@/lib/cash-opening';
const base={request_id:z.string().uuid(),day_id:z.string().uuid()},amount=z.number().int().min(0).max(100000000),note=z.string().trim().max(500);
const cashAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('opening'),...base,amount,note,breakdown:cashBreakdownSchema.optional(),opening_version:z.number().int().min(0).optional(),save_preset:z.boolean().optional(),preset_version:z.number().int().positive().optional()}),
 z.object({action:z.literal('opening_preset'),...base,breakdown:cashBreakdownSchema,preset_version:z.number().int().positive()}),
 z.object({action:z.enum(['in','out']),...base,amount:amount.min(1),note:note.min(1)}),
]);
export async function GET(req:Request){try{await requireCashier();if(new URL(req.url).searchParams.get('export')==='cari'){const {cariExcel}=await import('@/lib/cari-excel');const data=await cariExcel(db());return new Response(new Uint8Array(data),{headers:{...noStore,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="natura-cari.xlsx"'}});}return Response.json({...closePreview(db()),opening_preset:openingPreset(db())},{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{
 const operator=await requireCashier(req);const raw=await jsonBody(req);if(raw.action==='opening'||raw.action==='opening_preset')await requireAdmin(req);
 if(raw.action==='close'){
  const v=z.object({action:z.literal('close'),request_id:z.string().uuid(),day_id:z.string().uuid(),revision:z.string(),counted_cash:z.number().int().min(0).max(1000000000),note:z.string().trim().max(500),confirm:z.literal('GÜNÜ KAPAT')}).parse(raw);
  const result=closeBusinessDay(db(),v,snapshot=>{mkdirSync(dataDir,{recursive:true});const tmp=path.join(dataDir,'cari-koruma.tmp'),dest=path.join(dataDir,'cari-koruma.json');writeFileSync(tmp,JSON.stringify(snapshot),{mode:0o600});renameSync(tmp,dest);});return Response.json(result,{headers:noStore});
 }
 const v=cashAction.parse(raw),d=db();d.exec('BEGIN IMMEDIATE');try{
  rejectExpiredRequest(d,v.request_id);const day=businessDay(d);if(v.day_id!==day.day_id)throw new HttpError(409,'Gün değişti. Özeti yenileyin.');const payload=JSON.stringify(v),old=d.prepare('SELECT payload FROM pos_requests WHERE id=?').get(v.request_id);if(old){if(old.payload!==payload)throw new HttpError(409,'İşlem anahtarı kullanılmış.');d.exec('COMMIT');return Response.json(dayTotals(d));}
  if(v.action==='opening_preset')saveOpeningPreset(d,v.breakdown,v.preset_version);
  else if(v.action==='opening'){
   recordOpeningCash(d,v.amount,v.breakdown,v.opening_version,v.note);
   if(v.save_preset){if(!v.breakdown||v.preset_version===undefined)throw new HttpError(400,'Açılış şablonunu yenileyin.');saveOpeningPreset(d,v.breakdown,v.preset_version);}
  }else d.prepare('INSERT INTO pos_cash_moves VALUES(?,?,?,?,?,?,?)').run(randomUUID(),day.day_id,v.action,v.amount,v.note,operator.actor,new Date().toISOString());
  recordPosEvent(d,'cash_'+v.action,operator.actor,v);d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(v.request_id,payload,'cash',new Date().toISOString());d.exec('COMMIT');return Response.json(dayTotals(d));
 }catch(error){d.exec('ROLLBACK');throw error;}
}catch(error){return posErrorResponse(error);}}
