'use client';
import {ExternalLink,LogOut,X,type LucideIcon} from 'lucide-react';
import type {Operator} from '@/lib/employee-session';
export type SidebarLink={id:string;label:string;icon:LucideIcon};
export function AdminSidebar({links,active,operator,onNavigate,onLogout,openCalls,busy,onClose}:{links:readonly SidebarLink[];active:string;operator:Operator;onNavigate:(id:string)=>void;onLogout:()=>void;openCalls:number;busy:boolean;onClose?:()=>void}){
 return <div className="kitchen-sidebar-inner">
  {onClose&&<button type="button" className="kitchen-menu-close" aria-label="Menüyü kapat" onClick={onClose}><X size={18}/></button>}
  <a href="/admin" className="kitchen-brand" aria-label="NaturApp">
   <img src="/icons/naturapp-leaf.svg" width={48} height={48} alt=""/>
   <span>NaturApp</span>
  </a>
  <nav aria-label="Ana menü" className="kitchen-nav">{links.map(link=>{
   const count=link.id==='pos'?openCalls:0;
   return <button key={link.id} type="button" title={link.label} aria-current={active===link.id?'page':undefined} onClick={()=>onNavigate(link.id)}><link.icon size={21} aria-hidden="true"/><span>{link.label}</span>{count>0&&<b className="kitchen-nav-count">{count}</b>}</button>;
  })}</nav>
  <div className="kitchen-sidebar-bottom">
   <a href="/menu" target="_blank" rel="noreferrer" className="kitchen-menu-link" title="Müşteri menüsünü görüntüle"><ExternalLink size={17}/><span>QR Menü</span></a>
   <button type="button" className="kitchen-logout" aria-label="Çıkış yap" title={operator.name+' · '+operator.username+' · Çıkış yap'} disabled={busy} onClick={onLogout}><LogOut size={17}/><span>Çıkış</span></button>
  </div>
 </div>;
}
