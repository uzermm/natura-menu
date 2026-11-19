'use client';
import {useEffect,useState} from 'react';
import type {BranchConnection} from '@/lib/online-status';
export function ConnectionDock({branches}:{branches:BranchConnection[]}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 return <footer className="connection-dock no-print" aria-label="Restoran bağlantıları">
  <img src="/online/logos/uber-eats-trendyol-go.png" alt="Uber Eats Trendyol Go" width={38} height={38}/>
  <div className="connection-dock-branches">{branches.length?branches.map(branch=>{
   const age=branch.lastSuccess?Math.max(0,Math.floor((now-branch.lastSuccess)/1000)):null;
   const health=branch.state==='error'?'error':age===null||age>90?'stale':'ok';
   return <div key={branch.id} className="connection-dock-branch" data-health={health}><span className="connection-dock-dot" aria-hidden="true"/><div><strong>{branch.name}<span> · {health==='error'?'Bağlantı hatası':health==='stale'?'Veri güncel değil':'Güncel'}</span></strong><small>{age===null?'Başarılı kontrol bekleniyor':`Son kontrol: ${age<60?age+' sn':Math.floor(age/60)+' dk'} önce`}</small></div></div>;
  }):<p className="text-xs text-[#71836a]">Restoran bağlantıları kontrol ediliyor…</p>}</div>
 </footer>;
}
