'use client';
import {useEffect,useState} from 'react';
import {Printer,Clock3,Link2} from 'lucide-react';
import type {OnlineStatus} from '@/lib/online-status';
export function ConnectionDock({status}:{status:OnlineStatus}){
 const {branches}=status;
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 return <footer className="connection-dock no-print" aria-label="Restoran bağlantıları">
  <img src="/online/logos/uber-eats-trendyol-go.png" alt="Uber Eats Trendyol Go" width={38} height={38}/>
  <div className="connection-dock-branches">{branches.length?branches.map(branch=>{
   const age=branch.lastSuccess?Math.max(0,Math.floor((now-branch.lastSuccess)/1000)):null;
   const health=branch.state==='error'?'error':age===null||age>90?'stale':'ok';
   return <div key={branch.id} className="connection-dock-branch" data-health={health}><span className="connection-dock-dot" aria-hidden="true"/><div><strong>{branch.name}<span> · {health==='error'?'Bağlantı hatası':health==='stale'?'Veri güncel değil':'Güncel'}</span></strong><small>{age===null?'Başarılı kontrol bekleniyor':`Son kontrol: ${age<60?age+' sn':Math.floor(age/60)+' dk'} önce`}</small></div></div>;
  }):<p className="text-xs text-[#71836a]">Restoran bağlantıları kontrol ediliyor…</p>}</div>
  <div className="connection-dock-metrics" aria-label="Sipariş takip durumu">
   <div className="dock-metric"><Clock3 size={16} aria-hidden="true"/><div><small>Hazırlama süresi</small><strong>15 dk</strong></div></div>
   <div className="dock-metric"><Link2 size={16} aria-hidden="true"/><div><small>Bağlı hesap</small><strong>{status.accounts}</strong></div></div>
   <div className="dock-metric dock-print" data-active={status.printing==='Aktif'}><Printer size={16} aria-hidden="true"/><div><small>Otomatik yazdırma</small><strong>{status.printing}</strong></div></div>
  </div>
 </footer>;
}
