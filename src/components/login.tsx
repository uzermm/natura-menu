'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,LockKeyhole} from 'lucide-react';
import {AppInstall} from './app-install';

import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {clearDraft} from '@/lib/order-draft';
import {api} from '@/lib/client';
export default function Login(){const [error,setError]=useState(''),[busy,setBusy]=useState(false);return <main className="flex min-h-dvh items-center justify-center p-5"><div className="w-full max-w-sm"><div className="mb-10 text-center"><div className="inline-flex items-center gap-2 font-bold text-3xl tracking-tight text-[#183f30]"><img src="/icons/naturapp-leaf.svg" alt="" width={48} height={48}/>NaturApp</div></div><div className="rounded-3xl border bg-white p-7 shadow-sm"><LockKeyhole size={26} className="mb-5 text-[#668458]"/><h1 className="mb-6 serif text-3xl">Tekrar hoş geldiniz.</h1><form onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);setBusy(true);setError('');try{await api('/api/auth/login',{username:fd.get('username'),password:fd.get('password')});clearDraft();location.href='/admin';}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><Label htmlFor="username">Kullanıcı adı</Label><Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} className="mb-4 mt-2 h-12 rounded-xl"/><Label htmlFor="password">Şifre</Label><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="mb-4 mt-2 h-12 rounded-xl"/>{error&&<p role="alert" className="mb-4 text-sm text-red-700">{error}</p>}<Button disabled={busy} className="h-12 w-full justify-between rounded-xl">{busy?'Giriş yapılıyor…':'Giriş yap'}<ArrowRight size={18}/></Button></form></div><div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><AppInstall/>Uygulamayı yükle</div><a href="/menu" className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ArrowLeft size={14}/>Menüye dön</a></div></main>;}
