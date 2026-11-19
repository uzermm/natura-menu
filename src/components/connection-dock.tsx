'use client';
import {useEffect,useState} from 'react';
import {Printer,Clock3,Link2} from 'lucide-react';
import type {OnlineStatus} from '@/lib/online-status';
function shortName(name:string){if(/beyo[gğ]lu/i.test(name))return 'Beyoğlu';if(/fast/i.test(name))return 'Fast Food';if(/d[uü]r[uü]m/i.test(name))return 'Dürüm';return name.split(' ')[0];}
export function ConnectionDock({status}:{status:OnlineStatus}){
 const {branches}=status;
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(timer);},[]);
 return <footer className="connection-dock no-print" aria-label="Restoran bağlantıları">
  <img src="/online/logos/uber-eats-trendyol-go.png" alt="Uber Eats Trendyol Go" width={38} height={38}/>
  <div className="connection-dock-branches">{branches.length?branches.map(branch=>{
   const age=branch.lastSuccess?Math.max(0,Math.floor((now-branch.lastSuccess)/1000)):null;
   const health=branch.state==='error'?'error':age===null||age>90?'stale':'ok';
   return <div key={branch.id} className="connection-dock-branch" data-health={health} title={branch.name+' · '+(age===null?'Kontrol bekleniyor':age+' saniye önce')}><img className="dock-restaurant-logo" src={'/online/logos/'+(/fast/i.test(branch.name)?'fastfood':/d[uü]r[uü]m/i.test(branch.name)?'durum':'beyoglu')+'.jpeg'} alt={branch.name} width={30} height={30}/><span className="connection-dock-dot" aria-hidden="true"/><div><strong><b className="dock-branch-full">{branch.name}</b><b className="dock-branch-short">{shortName(branch.name)}</b><span> · {health==='error'?'Bağlantı hatası':health==='stale'?'Veri güncel değil':'Güncel'}</span></strong><small className="dock-age-full">{age===null?'Başarılı kontrol bekleniyor':`Son kontrol: ${age<60?age+' sn':Math.floor(age/60)+' dk'} önce`}</small><small className="dock-age-short">{age===null?'—':age<60?age+'sn':Math.floor(age/60)+'dk'}</small></div></div>;
  }):<p className="text-xs text-[#71836a]">Restoran bağlantıları kontrol ediliyor…</p>}</div>
  <div className="connection-dock-metrics" aria-label="Sipariş takip durumu">
   <div className="dock-metric dock-preparation" aria-label="Hazırlama süresi 15 dakika"><span className="dock-clock-compact" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="17" r="12" stroke="currentColor" strokeWidth="1.7"/><path d="M13 2h6M16 2v3M26 6l2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><text x="16" y="21" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" fontWeight="700">15</text></svg></span><Clock3 size={16} aria-hidden="true"/><div><small>Hazırlama süresi</small><strong>15 dk</strong></div></div>
   <div className="dock-metric dock-accounts" aria-label={status.accounts+' hesap bağlı'}><Link2 size={16} aria-hidden="true"/><div><small>Bağlı hesap</small><strong>{status.accounts}</strong></div></div>
   <div className="dock-metric dock-print" data-active={status.printing==='Aktif'}><Printer size={16} aria-hidden="true"/><div><small>Otomatik yazdırma</small><strong>{status.printing}</strong></div></div>
  </div>
 </footer>;
}
