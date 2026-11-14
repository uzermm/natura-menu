import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin,jsonBody,noStore,HttpError } from '@/lib/api';
import { hashPassword } from '@/lib/security';
import { recordPosEvent } from '@/lib/pos-core';
import { posErrorResponse } from '@/lib/pos-response';
export async function GET(){try{await requireAdmin();return Response.json(db().prepare('SELECT id,username,name,is_active FROM pos_staff ORDER BY name').all().map(r=>({...r,is_active:!!r.is_active})),{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{
 await requireAdmin(req);const v=z.object({id:z.string().uuid().optional(),username:z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/,'Kullanıcı adı 3–40 karakter olmalı; İngilizce harf, sayı, nokta ve tire kullanabilirsiniz.'),name:z.string().trim().min(1).max(80),password:z.string().min(8).max(256).optional(),is_active:z.boolean()}).parse(await jsonBody(req));
 const d=db(),old=v.id?d.prepare('SELECT * FROM pos_staff WHERE id=?').get(v.id):undefined;
 if(v.id&&!old)throw new HttpError(404,'Garson hesabı bulunamadı.');if(!old&&!v.password)throw new HttpError(400,'Yeni hesap için şifre girin.');
 if(old&&old.username!==v.username)throw new HttpError(400,'Kullanıcı adı değiştirilemez.');
 if(d.prepare('SELECT id FROM pos_staff WHERE username=? AND id!=?').get(v.username,v.id||''))throw new HttpError(400,'Bu kullanıcı adı zaten kullanılıyor.');
 d.prepare('INSERT INTO pos_staff(id,username,name,password_hash,is_active) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,is_active=excluded.is_active,session_version=pos_staff.session_version+1').run(v.id||randomUUID(),v.username,v.name,v.password?hashPassword(v.password):String(old!.password_hash),Number(v.is_active));recordPosEvent(d,'staff_save','Kasa',{username:v.username,active:v.is_active});return Response.json({ok:true});
}catch(error){return posErrorResponse(error);}}
