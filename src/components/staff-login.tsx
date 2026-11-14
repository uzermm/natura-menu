'use client';
import { useState } from 'react';
import { Brand } from './brand';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { api } from '@/lib/client';
export function StaffLogin(){const [busy,setBusy]=useState(false),[error,setError]=useState('');return <main className="flex min-h-dvh items-center justify-center p-5"><div className="w-full max-w-sm"><div className="mb-8 text-center"><Brand/></div><form className="space-y-5 rounded-3xl border bg-white p-7" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);setBusy(true);setError('');try{await api('/api/staff/login',{username:String(fd.get('username')),password:String(fd.get('password'))});location.href='/garson';}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><h1 className="serif text-3xl">Garson girişi</h1><div className="space-y-2"><Label htmlFor="waiter-username">Kullanıcı adı</Label><Input id="waiter-username" name="username" autoComplete="username" required maxLength={40}/></div><div className="space-y-2"><Label htmlFor="waiter-password">Şifre</Label><Input id="waiter-password" name="password" type="password" autoComplete="current-password" required maxLength={256}/></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<Button className="h-12 w-full" disabled={busy}>{busy?'Giriş yapılıyor…':'Giriş yap'}</Button></form></div></main>;}
