import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db,transaction } from '@/lib/db';
import { HttpError,jsonBody,noStore } from '@/lib/api';
import { safeEqual } from '@/lib/security';
import { posErrorResponse } from '@/lib/pos-response';
function authenticate(req:Request){const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(token.length!==43)throw new HttpError(401,'Yazıcı anahtarı geçersiz.');const p=db().prepare('SELECT token_hash FROM pos_printers WHERE id=1').get();if(!p||!safeEqual(String(p.token_hash),createHash('sha256').update(token).digest('hex')))throw new HttpError(401,'Yazıcı anahtarı geçersiz.');db().prepare('UPDATE pos_printers SET last_seen=? WHERE id=1').run(new Date().toISOString());}
export async function GET(req:Request){try{authenticate(req);const job=transaction(()=>{const row=db().prepare("SELECT id,payload FROM pos_print_jobs WHERE status='queued' ORDER BY created_at LIMIT 1").get();if(!row)return null;db().prepare("UPDATE pos_print_jobs SET status='claimed',claimed_at=? WHERE id=?").run(new Date().toISOString(),String(row.id));return {id:row.id,payload:JSON.parse(String(row.payload))};});return Response.json({job},{headers:noStore});}catch(e){return posErrorResponse(e);}}
export async function POST(req:Request){try{authenticate(req);const v=z.object({id:z.string().uuid(),status:z.enum(['printed','failed']),error:z.string().max(500).default('')}).parse(await jsonBody(req));db().prepare("UPDATE pos_print_jobs SET status=?,finished_at=?,error=? WHERE id=? AND status='claimed'").run(v.status,new Date().toISOString(),v.error,v.id);return Response.json({ok:true});}catch(e){return posErrorResponse(e);}}
