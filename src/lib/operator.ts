import { cookies } from 'next/headers';
import { db } from './db';
import { validSession as validAdmin } from './auth';
import { makeSession,validSession,sameOrigin } from './security';
import { HttpError } from './api';
import type { Staff } from './pos-types';

export function makeStaffSession(staffId:string,hash:string,version:number){return `${staffId}~${makeSession(Date.now(),`staff:${staffId}:${hash}:${version}`)}`;}
export function readStaffSession(token:string|undefined):Staff|null{
 if(!token||token.length>1200)return null;const [id,signed,...rest]=token.split('~');if(!id||!signed||rest.length)return null;
 const row=db().prepare('SELECT * FROM pos_staff WHERE id=? AND is_active=1').get(id);if(!row||!validSession(signed,Date.now(),`staff:${id}:${row.password_hash}:${row.session_version}`))return null;
 return {id,username:String(row.username),name:String(row.name),is_active:true};
}
export async function requireOperator(req?:Request){
 const jar=await cookies();if(req&&!['GET','HEAD'].includes(req.method)&&!sameOrigin(req))throw new HttpError(403,'Geçersiz istek kaynağı.');
 if(req?.headers.get('x-natura-staff')!=='1'&&validAdmin(jar.get('natura_session')?.value))return {role:'admin' as const,actor:'Kasa',name:'Kasa'};
 const staff=readStaffSession(jar.get('natura_staff')?.value);if(!staff)throw new HttpError(401,'Lütfen giriş yapın.');return {role:'waiter' as const,actor:staff.username,name:staff.name};
}
