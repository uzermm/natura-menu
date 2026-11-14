'use client';
import { Brand } from './brand';
import { Button } from './ui/button';
import { PosPanel } from './pos-panel';
import { api } from '@/lib/client';
import type { Category } from '@/lib/types';
export function StaffPanel({name,categories,tableCount}:{name:string;categories:Category[];tableCount:number}){return <div className="min-h-dvh bg-[#f6f7f3]"><header className="border-b bg-white p-4"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><Brand compact/><div className="flex items-center gap-3"><span className="text-sm font-semibold">{name}</span><Button variant="outline" onClick={async()=>{await api('/api/staff/logout');location.href='/garson/giris';}}>Çıkış yap</Button></div></div></header><main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8"><h1 className="serif text-3xl">Masalar ve siparişler</h1><PosPanel categories={categories} tableCount={tableCount} role="waiter"/></main></div>;}
