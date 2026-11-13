import { cookies } from 'next/headers';
import { z } from 'zod';
import { clientKey, errorResponse, HttpError, jsonBody, limited, requireAdmin } from '@/lib/api';
import { makeSession, validPassword } from '@/lib/auth';
import { hashPassword } from '@/lib/security';
import { db, transaction } from '@/lib/db';

export const runtime='nodejs';
export async function POST(req:Request){try{
 await requireAdmin(req);
 if(limited(`password:${clientKey(req)}`,5,15*60*1000))throw new HttpError(429,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
 const input=z.object({currentPassword:z.string().min(1).max(256),newPassword:z.string().min(8,'Yeni şifre en az 8 karakter olmalı.').max(256),confirmPassword:z.string().max(256)}).parse(await jsonBody(req));
 if(input.newPassword!==input.confirmPassword)throw new HttpError(400,'Yeni şifreler eşleşmiyor.');
 if(input.currentPassword===input.newPassword)throw new HttpError(400,'Yeni şifre mevcut şifreden farklı olmalı.');
 transaction(()=>{
  if(!validPassword(input.currentPassword))throw new HttpError(400,'Mevcut şifre yanlış.');
  db().prepare('INSERT INTO admin_credentials(id,password_hash) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash').run(hashPassword(input.newPassword));
 });
 (await cookies()).set('natura_session',makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*12});
 return Response.json({ok:true});
}catch(error){return errorResponse(error);}}
