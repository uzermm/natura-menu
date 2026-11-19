import {cookies} from 'next/headers';
import {z} from 'zod';
import {db} from './db';
import {requireOrigin,errorResponse,HttpError,limited,isLimited,clientKey,jsonBody} from './api';
import {makeSession,validPassword} from './auth';
import {adminUsername,usernameSchema} from './usernames';
import {hashPassword,verifyPasswordHash} from './security';
import {makeEmployeeSession} from './employee-session';
const dummy=hashPassword('unavailable-user');
export async function login(req:Request){try{
 requireOrigin(req);
 const v=z.object({username:usernameSchema,password:z.string().max(256)}).parse(await jsonBody(req)),d=db(),admin=v.username===adminUsername(d);
 const e=admin?undefined:d.prepare('SELECT id,username,name,role,password_hash,is_active FROM employees WHERE username=?').get(v.username) as {id:string;username:string;name:string;role:string;password_hash:string;is_active:number}|undefined;
 const ip='login-failed:'+clientKey(req),user=ip+':'+v.username;if(isLimited(ip,40)||isLimited(user,8))throw new HttpError(429,'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
 const valid=admin?validPassword(v.password):verifyPasswordHash(v.password,e?.password_hash||dummy);
 if(!valid||!admin&&(!e?.is_active||!['cashier','waiter'].includes(e.role))){limited(ip,40,15*60*1000);limited(user,8,15*60*1000);throw new HttpError(401,'Kullanıcı adı veya şifre yanlış ya da hesap pasif.');}d.prepare('DELETE FROM rate_limits WHERE key=?').run(user);
 const c=await cookies(),options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge:12*60*60};
 if(admin){c.delete('natura_staff');c.set('natura_session',makeSession(),options);}else{c.delete('natura_session');c.set('natura_staff',makeEmployeeSession(e!),options);}return Response.json({ok:true});
 }catch(error){return errorResponse(error);}}
