'use client';
import {usePanelRefresh} from '@/lib/panel-refresh';
import {useEffect,useState} from 'react';
import {Plus,UsersRound} from 'lucide-react';
import {api} from '@/lib/client';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import type {ManagedUser} from '@/lib/users';
const roles={admin:'Admin',cashier:'Kasiyer',waiter:'Garson',kitchen:'Mutfak'};
const permissions={admin:'Tüm ekranlar ve kullanıcı yönetimi.',cashier:'Ayarlar ve Menü Yönetimi dışındaki operasyon ekranları.',waiter:'Yalnız Masalar; sipariş alma ve adet artırma/azaltma.',kitchen:'Yalnız online Siparişler; Kabul Et ve Hazırlandı.'};
export function Users(){
 const [rows,setRows]=useState<ManagedUser[]>([]),[editing,setEditing]=useState<Partial<ManagedUser>|null>(null),[role,setRole]=useState<ManagedUser['role']>('waiter'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){setRows(await api<ManagedUser[]>('/api/admin/users',undefined,'GET'));}
 usePanelRefresh('users',load);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 function edit(user:Partial<ManagedUser>){setError('');setRole(user.role||'waiter');setEditing(user);}
 return <section aria-label="Kullanıcılar" className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold text-[#305c3e]"><UsersRound size={20}/>Kullanıcılar</h2><Button onClick={()=>edit({name:'',username:'',role:'waiter',is_active:true})}><Plus size={16}/>Kullanıcı ekle</Button></div>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {rows.map(user=><div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><strong className="block break-words text-sm">{user.name}</strong><p className="break-all text-xs text-muted-foreground">{user.username} · {roles[user.role]} · {user.is_active?'Aktif':'Pasif'}</p></div>{user.protected?<span className="text-xs text-muted-foreground">Ana yönetici</span>:<div className="flex gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={()=>edit(user)}>Düzenle</Button><Button variant="outline" size="sm" disabled={busy} onClick={async()=>{if(!confirm(user.username+' kullanıcısı silinsin mi?'))return;setBusy(true);setError('');try{await api('/api/admin/users',{id:user.id},'DELETE');await load();}catch(error){setError((error as Error).message);}finally{setBusy(false);}}}>Sil</Button></div>}</div>)}
  <Dialog open={!!editing} onOpenChange={open=>!open&&!busy&&setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id?'Kullanıcıyı düzenle':'Kullanıcı ekle'}</DialogTitle><DialogDescription>{permissions[role]}</DialogDescription></DialogHeader>{editing&&<form className="space-y-4" onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError('');try{const result=await api<{reauthenticate?:boolean}>('/api/admin/users',{...(editing.id?{id:editing.id}:{}),name:String(data.get('name')),username:String(data.get('username')),role,is_active:data.get('active')==='on',...(data.get('password')?{password:String(data.get('password'))}:{})});if(result.reauthenticate){location.href='/login';return;}await load();setEditing(null);}catch(error){setError((error as Error).message);}finally{setBusy(false);}}}>
   <Label htmlFor="user-name">Ad soyad</Label><Input id="user-name" name="name" defaultValue={editing.name} required maxLength={80}/>
   <Label htmlFor="user-username">Kullanıcı adı</Label><Input id="user-username" name="username" defaultValue={editing.username} required maxLength={254} autoCapitalize="none" spellCheck={false}/>
   <Label htmlFor="user-role">Rol</Label><select id="user-role" value={role} onChange={event=>setRole(event.target.value as ManagedUser['role'])} className="h-11 w-full rounded-xl border bg-white px-3">{Object.entries(roles).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
   <Label htmlFor="user-password">{editing.id?'Yeni şifre (isteğe bağlı)':'Şifre'}</Label><Input id="user-password" name="password" type="password" autoComplete="new-password" required={!editing.id} minLength={role==='admin'?8:4} maxLength={128}/>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={editing.is_active}/>Aktif</label>
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<Button disabled={busy} className="w-full">Kaydet</Button>
  </form>}</DialogContent></Dialog>
 </section>;
}
