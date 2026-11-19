'use client';
import {useEffect,useState} from 'react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
type User={id:string;username:string;role:string;enabled:boolean};
async function request(path:string,method='GET',body?:unknown){const response=await fetch('/online/api/'+path,{method,headers:{'Content-Type':'application/json','X-Panel-Request':'1'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||'İşlem tamamlanamadı.');return result;}
export function OnlineUsers({canChangePassword=false}:{canChangePassword?:boolean}){
 const [users,setUsers]=useState<User[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){setUsers((await request('users')).users);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await action();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section aria-label="Online sipariş kullanıcıları" className="mt-6 space-y-5 rounded-xl border bg-white p-5">
  <h3 className="text-lg font-bold text-[#305c3e]">Online Sipariş Kullanıcıları</h3>
  <div className="space-y-2">{users.map(user=><div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><strong className="block break-all text-sm">{user.username}</strong><small className="text-xs text-muted-foreground">{user.role==='admin'?'Online sipariş yöneticisi':user.enabled?'Sipariş yönetimi':'Pasif'}</small></div>{user.role==='viewer'&&<div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>void run(async()=>{await request('users/enabled','POST',{id:user.id,enabled:!user.enabled});})}>{user.enabled?'Pasifleştir':'Etkinleştir'}</Button><Button type="button" variant="outline" size="sm" disabled={busy} onClick={()=>{if(confirm(user.username+' kullanıcısı silinsin mi?'))void run(async()=>{await request('users/'+encodeURIComponent(user.id),'DELETE');});}}>Sil</Button></div>}</div>)}</div>
  <form className="grid gap-3" onSubmit={event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form);void run(async()=>{await request('users','POST',{username:String(data.get('username')),password:String(data.get('password'))});form.reset();setMessage('Online sipariş kullanıcısı eklendi.');});}}>
   <Label htmlFor="online-username">Kullanıcı adı</Label><Input id="online-username" name="username" required maxLength={254} autoComplete="off" autoCapitalize="none" spellCheck={false}/>
   <Label htmlFor="online-password">Şifre</Label><Input id="online-password" name="password" type="password" required minLength={4} maxLength={128} autoComplete="new-password"/>
   <Button disabled={busy}>Online kullanıcı ekle</Button>
  </form>
  {canChangePassword&&<form className="grid gap-3 border-t pt-5" aria-label="Online yönetici şifresi" onSubmit={event=>{event.preventDefault();const form=event.currentTarget,data=new FormData(form);if(data.get('password')!==data.get('confirm')){setError('Şifreler eşleşmiyor.');return;}void run(async()=>{await request('auth/password','POST',{currentPassword:data.get('currentPassword'),password:data.get('password')});form.reset();setMessage('Şifreniz güncellendi.');});}}><h3 className="font-bold">Online Yönetici Şifresi</h3><Label htmlFor="online-current-password">Mevcut şifre</Label><Input id="online-current-password" name="currentPassword" type="password" required autoComplete="current-password"/><Label htmlFor="online-new-password">Yeni şifre</Label><Input id="online-new-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/><Label htmlFor="online-confirm-password">Yeni şifre tekrar</Label><Input id="online-confirm-password" name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password"/><Button disabled={busy}>Şifreyi değiştir</Button></form>}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-green-700">{message}</p>}
 </section>;
}
