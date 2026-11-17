'use client';
import {ChevronsLeft,ExternalLink,LogOut,X,type LucideIcon} from 'lucide-react';
import type {Operator} from '@/lib/employee-session';
import {Brand} from './brand';
import {Button} from './ui/button';
export type SidebarLink={id:string;label:string;icon:LucideIcon};
export function AdminSidebar({links,active,operator,onNavigate,onClose,onLogout,pendingOrders,openCalls,busy,mobile=false}:{links:readonly SidebarLink[];active:string;operator:Operator;onNavigate:(id:string)=>void;onClose:()=>void;onLogout:()=>void;pendingOrders:number;openCalls:number;busy:boolean;mobile?:boolean}){
 const role={admin:'Yönetici',cashier:'Kasiyer',waiter:'Garson'}[operator.role];
 return <div className="flex h-full min-h-0 flex-col bg-white">
  <div className="flex h-24 shrink-0 items-center justify-between gap-2 border-b px-4"><a href="/" aria-label="Natura Bistro menüsünü aç"><Brand compact/></a><Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl" aria-label={mobile?'Sol menüyü kapat':'Sol menüyü gizle'} onClick={onClose}>{mobile?<X size={18}/>:<ChevronsLeft size={18}/>}</Button></div>
  <p className="px-6 pb-3 pt-6 text-[10px] font-bold tracking-[.18em] text-[#99a08f]">YÖNETİM PANELİ</p>
  <nav aria-label="Ana menü" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-4">{links.map(l=><button key={l.id} type="button" aria-current={active===l.id?'page':undefined} onClick={()=>onNavigate(l.id)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${active===l.id?'border-[#d5e2cb] bg-[#eaf0e4] font-bold text-[#305c3e] shadow-sm':'border-transparent text-[#78816e] hover:bg-[#f3f5ef]'}`}><l.icon size={18} className="shrink-0"/><span className="min-w-0 flex-1">{l.label}</span>{l.id==='pending'&&pendingOrders>0&&<span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">{pendingOrders}</span>}{l.id==='pos'&&openCalls>0&&<span className="rounded-full bg-[#305c3e] px-2 py-0.5 text-[10px] font-bold text-white">{openCalls}</span>}</button>)}</nav>
  <div className="shrink-0 space-y-3 border-t bg-[#fafbf8] px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
   <a href="/" target="_blank" rel="noreferrer" className="flex min-h-9 items-center gap-2 px-3 text-xs text-[#78816e]"><ExternalLink size={15}/>Menüyü görüntüle</a>
   <div aria-label="Oturum bilgileri" className="flex items-center gap-3 rounded-2xl border border-[#e1e7dc] bg-white p-3 shadow-sm"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#305c3e] text-lg font-bold text-white">{operator.name.charAt(0).toLocaleUpperCase('tr-TR')}</span><div className="min-w-0 flex-1"><p title={operator.name} className="truncate text-sm font-bold text-[#244b39]">{operator.name}</p><p title={operator.username} className="mt-0.5 truncate text-[11px] text-muted-foreground">{operator.username}</p><p className="mt-1 text-[10px] font-semibold text-[#6d8859]">{role}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Çıkış yap" title="Çıkış yap" className="h-8 w-8 shrink-0 text-[#78816e]" disabled={busy} onClick={onLogout}><LogOut size={16}/></Button></div>
  </div>
 </div>;
}
