import {cookies} from 'next/headers';
import {z} from 'zod';
import {db} from './db';
import {requireOrigin,errorResponse,HttpError,limited,isLimited,clientKey,jsonBody} from './api';
import {makeSession,validPassword} from './auth';
import {adminUsername} from './usernames';
import {hashPassword,verifyPasswordHash} from './security';
import {makeEmployeeSession} from './employee-session';
import {onlineRuntime} from './online-runtime';
import {removePushDevice} from './push-store';
const dummy=hashPassword('unavailable-user');
async function clearCafeDeviceForOnlineLogin(){const c=await cookies(),key=c.get('natura_push_device')?.value;if(!key)return;const d=db();for(const owner of ['admin',...d.prepare('SELECT id FROM employees').all().map(row=>String(row.id))])removePushDevice(d,owner,key);c.delete('natura_push_device');}
export async function login(req:Request){try{
 requireOrigin(req);
 const input=z.object({username:z.string().trim().min(1).max(254),password:z.string().max(256)}).parse(await jsonBody(req)),v={...input,username:input.username.toLowerCase()},d=db(),admin=v.username===adminUsername(d);
 const e=admin?undefined:d.prepare('SELECT id,username,name,role,password_hash,is_active FROM employees WHERE username=?').get(v.username) as {id:string;username:string;name:string;role:string;password_hash:string;is_active:number}|undefined;
 const ip='login-failed:'+clientKey(req),user=ip+':'+v.username;if(isLimited(ip,40)||isLimited(user,8))throw new HttpError(429,'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
 const valid=admin?validPassword(v.password):verifyPasswordHash(v.password,e?.password_hash||dummy);
 if(!valid||!admin&&(!e?.is_active||!['cashier','waiter','kitchen'].includes(e.role))){
 const portal=await(await onlineRuntime()).legacyLogin(req,input);
 if(portal.cookie){await clearCafeDeviceForOnlineLogin();d.prepare('DELETE FROM rate_limits WHERE key=?').run(user);const value=portal.cookie.split(';')[0].slice('__Host-om_session='.length),c=await cookies();c.delete('natura_session');c.delete('natura_staff');c.set('__Host-om_session',value,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:12*60*60});return Response.json({ok:true});}
 limited(ip,40,15*60*1000);limited(user,8,15*60*1000);if(portal.limited)throw new HttpError(429,'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');throw new HttpError(401,'Kullanıcı adı veya şifre yanlış ya da hesap pasif.');
 }d.prepare('DELETE FROM rate_limits WHERE key=?').run(user);
 const c=await cookies();c.set('__Host-om_session','',{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:0});const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge:12*60*60};
 if(!admin){const portal=await(await onlineRuntime()).legacyLogin(req,input);if(portal.cookie)c.set('__Host-om_session',portal.cookie.split(';')[0].slice('__Host-om_session='.length),{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:12*60*60});}
 if(admin){c.delete('natura_staff');c.set('natura_session',makeSession(),options);}else{c.delete('natura_session');c.set('natura_staff',makeEmployeeSession(e!),options);}return Response.json({ok:true});
 }catch(error){return errorResponse(error);}}
