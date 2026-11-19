'use client';
import {ExternalLink,LogOut,type LucideIcon} from 'lucide-react';
import type {Operator} from '@/lib/employee-session';
export type SidebarLink={id:string;label:string;icon:LucideIcon};
export function AdminSidebar({links,active,operator,onNavigate,onLogout,pendingOrders,openCalls,busy}:{links:readonly SidebarLink[];active:string;operator:Operator;onNavigate:(id:string)=>void;onLogout:()=>void;pendingOrders:number;openCalls:number;busy:boolean}){
 return <div className="kitchen-sidebar-inner">
  <a href="/admin" className="kitchen-brand" aria-label="Online Mutfak">
   <svg viewBox="0 0 64 42" width="48" height="32" fill="none" aria-hidden="true"><path d="M21 9a17 17 0 0 1 22 0M26 14a9 9 0 0 1 12 0" stroke="#c4dc8e" strokeWidth="3" strokeLinecap="round"/><circle cx="32" cy="19" r="2" fill="#c4dc8e"/><path d="M13 35a19 16 0 0 1 38 0H13Z" fill="currentColor"/><path d="M9 40h46" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
   <span>ONLINE<br/>MUTFAK</span>
  </a>
  <nav aria-label="Ana menü" className="kitchen-nav">{links.map(link=>{
   const count=link.id==='pending'?pendingOrders:link.id==='pos'?openCalls:0;
   return <button key={link.id} type="button" title={link.label} aria-current={active===link.id?'page':undefined} onClick={()=>onNavigate(link.id)}><link.icon size={21} aria-hidden="true"/><span>{link.label}</span>{count>0&&<b className="kitchen-nav-count">{count}</b>}</button>;
  })}</nav>
  <div className="kitchen-sidebar-bottom">
   <a href="/menu" target="_blank" rel="noreferrer" className="kitchen-menu-link" title="Müşteri menüsünü görüntüle"><ExternalLink size={17}/><span>QR Menü</span></a>
   <button type="button" className="kitchen-logout" aria-label="Çıkış yap" title={operator.name+' · '+operator.username+' · Çıkış yap'} disabled={busy} onClick={onLogout}><LogOut size={17}/><span>Çıkış</span></button>
  </div>
 </div>;
}
