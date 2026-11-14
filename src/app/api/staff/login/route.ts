import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '@/lib/db';
import { clientKey,errorResponse,HttpError,jsonBody,limited,requireOrigin } from '@/lib/api';
import { verifyPasswordHash } from '@/lib/security';
import { makeStaffSession } from '@/lib/operator';
export async function POST(req:Request){try{
 requireOrigin(req);if(limited(`staff-login:${clientKey(req)}`,10,15*60*1000))throw new HttpError(429,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
 const v=z.object({username:z.string().trim().toLowerCase().max(40),password:z.string().max(256)}).parse(await jsonBody(req));
 const row=db().prepare('SELECT * FROM pos_staff WHERE username=? AND is_active=1').get(v.username);
 if(!row||!verifyPasswordHash(v.password,String(row.password_hash)))throw new HttpError(401,'Kullanıcı adı veya şifre yanlış.');
 (await cookies()).set('natura_staff',makeStaffSession(String(row.id),String(row.password_hash),Number(row.session_version)),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*12});return Response.json({ok:true});
}catch(error){return errorResponse(error);}}
