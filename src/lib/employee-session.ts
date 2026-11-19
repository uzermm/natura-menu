import {createHmac,randomBytes} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {sessionSecret,safeEqual} from './security.ts';
import {userAccess,type UserRole} from './user-access.ts';
export type OperatorRole='admin'|'cashier'|'waiter'|'online'|'online_admin'|'kitchen';
export type Operator={id:string;username:string;role:OperatorRole;actor:string;name:string;onlineAdmin?:boolean;onlineUserId?:string};
type Employee={id:string;username?:string;name:string;role:string;password_hash:string;is_active:number};
const duration=12*60*60*1000;
function signature(payload:string,e:Employee){return createHmac('sha256',sessionSecret()).update(`employee-v1:${e.id}:${e.role}:${e.username||''}:${e.password_hash}:${payload}`).digest('base64url');}
export function makeEmployeeSession(e:Employee,now=Date.now()){const payload=Buffer.from(JSON.stringify({id:e.id,exp:now+duration,nonce:randomBytes(16).toString('hex')})).toString('base64url');return `${payload}.${signature(payload,e)}`;}
export function employeeSession(d:DatabaseSync,token:string|undefined,now=Date.now()):Operator|null{
 if(!token||token.length>1024)return null;
 try{const [payload,sig,...rest]=token.split('.');if(!payload||!sig||rest.length)return null;const v=JSON.parse(Buffer.from(payload,'base64url').toString());if(typeof v.id!=='string'||typeof v.exp!=='number'||v.exp<=now||v.exp>now+duration)return null;
 const e=d.prepare('SELECT id,username,name,role,password_hash,is_active FROM employees WHERE id=?').get(v.id) as Employee|undefined;
 if(!e||!e.is_active||!['cashier','waiter','kitchen'].includes(e.role)||!safeEqual(signature(payload,e),sig))return null;
 return {id:e.id,username:e.username||'',name:e.name,role:userAccess(d,'employee:'+e.id,e.role as UserRole).role,actor:e.name};
 }catch{return null;}
}
