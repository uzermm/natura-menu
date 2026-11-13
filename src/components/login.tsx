'use client';
import { useState } from 'react';
import { ArrowLeft,ArrowRight,LockKeyhole } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { api } from '@/lib/client';
export default function Login(){const [error,setError]=useState(''),[busy,setBusy]=useState(false);return <main className="flex min-h-dvh items-center justify-center p-5"><div className="w-full max-w-sm"><div className="mb-10 text-center"><Brand/></div><div className="rounded-3xl border bg-white p-7 shadow-sm"><LockKeyhole size={26} className="mb-5 text-[#668458]"/><h1 className="serif text-3xl">Tekrar hoş geldiniz.</h1><p className="mb-7 mt-2 text-sm text-muted-foreground">Natura menünüzü buradan yönetin.</p><form onSubmit={async e=>{e.preventDefault();const password=new FormData(e.currentTarget).get('password');setBusy(true);setError('');try{await api('/api/auth/login',{password});location.href='/admin';}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><Label htmlFor="password">Yönetici şifresi</Label><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="mb-4 mt-2 h-12 rounded-xl"/>{error&&<p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}<Button disabled={busy} className="h-12 w-full justify-between rounded-xl">{busy?'Giriş yapılıyor…':'Giriş yap'}<ArrowRight size={18}/></Button></form></div><a href="/" className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14}/>Menüye dön</a></div></main>;}
