import {audit} from './audit-log';
import {randomUUID} from 'node:crypto';
import {db,transaction} from './db';
import {adminUsername} from './usernames';
import {hashPassword} from './security';
import {HttpError} from './api';
import {onlineRuntime} from './online-runtime';
import {userAccess,setUserAccess,type UserRole} from './user-access';
export type ManagedUser={id:string;username:string;name:string;role:UserRole;is_active:boolean;protected:boolean};
const fold=(value:string)=>value.normalize('NFKC').trim().toLocaleLowerCase('tr');
export async function listUsers():Promise<ManagedUser[]>{
 const d=db(),runtime=await onlineRuntime();
 const employees=d.prepare('SELECT id,username,name,role,is_active FROM employees ORDER BY name').all().map(row=>({id:String(row.id),username:String(row.username),name:String(row.name),role:userAccess(d,'employee:'+row.id,row.role as UserRole).role,is_active:!!row.is_active,protected:false}));
 const legacy=runtime.listLegacyUsers().map(row=>{const access=userAccess(d,'portal:'+row.id,row.role==='admin'?'admin':'kitchen');return {id:'portal:'+row.id,username:row.username,name:access.name||row.username,role:access.role,is_active:row.enabled,protected:false};});
 return [{id:'admin',username:adminUsername(d),name:'Yönetici',role:'admin',is_active:true,protected:true},...employees,...legacy];
}
export async function saveUser(input:{id?:string;username:string;name:string;role:UserRole;is_active:boolean;password?:string},actor:string){
 input={...input,username:input.username.normalize('NFKC').trim().toLowerCase()};
 const users=await listUsers(),old=input.id?users.find(user=>user.id===input.id):undefined;
 if(input.id&&!old)throw new HttpError(404,'Kullanıcı bulunamadı.');
 if(old?.protected)throw new HttpError(400,'Ana yönetici hesabını kendi kullanıcı adı ve şifre alanından düzenleyin.');
 if(old?.id===actor&&(input.role!=='admin'||!input.is_active))throw new HttpError(400,'Kendi yönetici yetkinizi kapatamazsınız.');
 if((!old||fold(old.username)!==fold(input.username))&&users.some(user=>user.id!==input.id&&fold(user.username)===fold(input.username)))throw new HttpError(400,'Bu kullanıcı adı kullanılıyor.');
 if(!old&&!input.password)throw new HttpError(400,'Yeni kullanıcı için şifre girin.');
 if(input.password&&(input.password.length<(input.role==='admin'?8:4)||input.password.length>128))throw new HttpError(400,input.role==='admin'?'Yönetici şifresi en az 8 karakter olmalı.':'Şifre en az 4 karakter olmalı.');
 const runtime=await onlineRuntime(),d=db();
 if(old?.id.startsWith('portal:')){
  await runtime.saveLegacyUser({id:old.id.slice(7),username:input.username,role:input.role,enabled:input.is_active,password:input.password});
  setUserAccess(d,old.id,input.role,input.name);
 }else{
  transaction(()=>{const id=old?.id||randomUUID(),row=old?d.prepare('SELECT password_hash FROM employees WHERE id=?').get(id):null;
   d.prepare("INSERT INTO employees(id,username,name,password_hash,role,is_active,permissions) VALUES(?,?,?,?,?,?,'[]') ON CONFLICT(id) DO UPDATE SET username=excluded.username,name=excluded.name,password_hash=excluded.password_hash,role=excluded.role,is_active=excluded.is_active").run(id,input.username.toLowerCase(),input.name,input.password?hashPassword(input.password):String(row!.password_hash),['admin','kitchen'].includes(input.role)?'cashier':input.role,Number(input.is_active));
   setUserAccess(d,'employee:'+id,input.role,input.name);
  });
 }
 audit(d,users.find(user=>user.id===actor)?.username||actor,old?'user.update':'user.create',input.username+' · '+input.role);
 runtime.syncIdentities();
}
export async function removeUser(id:string,actor:string){
 const user=(await listUsers()).find(row=>row.id===id);if(!user)throw new HttpError(404,'Kullanıcı bulunamadı.');
 if(user.protected||id===actor)throw new HttpError(400,'Kendi hesabınız veya ana yönetici silinemez.');
 const d=db(),runtime=await onlineRuntime();
 if(id.startsWith('portal:')){runtime.removeLegacyUser(id.slice(7));d.prepare('DELETE FROM push_subscriptions WHERE owner_id=?').run(id);d.prepare('DELETE FROM user_access WHERE id=?').run(id);}
 else transaction(()=>{d.prepare('DELETE FROM push_subscriptions WHERE owner_id=?').run(id);d.prepare('DELETE FROM employees WHERE id=?').run(id);d.prepare('DELETE FROM user_access WHERE id=?').run('employee:'+id);});
 audit(d,(await listUsers()).find(row=>row.id===actor)?.username||actor,'user.delete',user.username);
 runtime.syncIdentities();
}
