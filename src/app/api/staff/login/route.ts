import {cookies} from 'next/headers';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireOrigin,errorResponse,HttpError,limited,clientKey,jsonBody} from '@/lib/api';
import {hashPassword,verifyPasswordHash} from '@/lib/security';
import {makeEmployeeSession} from '@/lib/employee-session';
const dummy=hashPassword('unavailable-employee');
export async function POST(req:Request){try{
 requireOrigin(req);if(limited('employee-login:'+clientKey(req),8,15*60*1000))throw new HttpError(429,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');
 const v=z.object({username:z.string().trim().toLowerCase().max(40),password:z.string().max(256)}).parse(await jsonBody(req));
 const e=db().prepare('SELECT id,name,role,password_hash,is_active FROM employees WHERE username=?').get(v.username) as {id:string;name:string;role:string;password_hash:string;is_active:number}|undefined;
 const valid=verifyPasswordHash(v.password,e?.password_hash||dummy);if(!valid||!e?.is_active||!['cashier','waiter'].includes(e.role))throw new HttpError(401,'Kullanıcı adı veya şifre yanlış ya da hesap pasif.');
 const c=await cookies();c.delete('natura_session');c.set('natura_staff',makeEmployeeSession(e),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:12*60*60});return Response.json({ok:true});
}catch(error){return errorResponse(error);}}
