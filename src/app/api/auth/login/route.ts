import { cookies } from 'next/headers';
import { z } from 'zod';
import { clientKey, errorResponse, HttpError, jsonBody, limited, requireOrigin } from '@/lib/api';
import { makeSession, validPassword } from '@/lib/auth';
export const runtime='nodejs';
export async function POST(req:Request) {try {
 requireOrigin(req);
 if(limited(`login:${clientKey(req)}`,8,15*60*1000))throw new HttpError(429,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
 const {password}=z.object({password:z.string().max(256)}).parse(await jsonBody(req));
 if(!validPassword(password))throw new HttpError(401,'Şifre yanlış veya yönetici şifresi henüz yapılandırılmadı.');
 (await cookies()).delete('natura_staff');
 (await cookies()).set('natura_session',makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*12});
 return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
