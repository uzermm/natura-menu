'use client';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {RestaurantStatusControl} from './restaurant-status-control';
import {RestaurantHoursEditor} from './restaurant-hours-editor';
import {Printer,Clock3,Link2} from 'lucide-react';
import {restaurantAvailability,restaurantDays,restaurantToday,hoursForDay} from '../../online/portal/public/restaurant-status.js';
import type {OnlineStatus} from '@/lib/online-status';
function shortName(name:string){if(/beyo[gğ]lu/i.test(name))return 'Beyoğlu';if(/fast/i.test(name))return 'Fast Food';if(/d[uü]r[uü]m/i.test(name))return 'Dürüm';return name.split(' ')[0];}
export function ConnectionDock({status,canEditHours=false}:{status:OnlineStatus;canEditHours?:boolean}){
 const [hoursBusy,setHoursBusy]=useState(false);
 const {branches}=status;const [selected,setSelected]=useState<string|null>(null);const branch=branches.find(item=>item.id===selected);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(timer);},[]);
 return <footer className="connection-dock no-print" aria-label="Restoran bağlantıları">
  <img src="/online/logos/uber-eats-trendyol-go.png" alt="Uber Eats Trendyol Go" width={38} height={38}/>
  <div className="connection-dock-branches">{branches.length?branches.map(branch=>{
   const age=branch.lastSuccess?Math.max(0,Math.floor((now-branch.lastSuccess)/1000)):null;
   const availability=restaurantAvailability(branch.restaurant,now);
   const health=branch.state==='error'?'error':age===null||age>90?'stale':'ok';
   return <button type="button" onClick={()=>setSelected(branch.id)} aria-label={branch.name+' bağlantı ayrıntıları'} key={branch.id} className="connection-dock-branch" data-health={health} data-availability={availability.state} title={branch.name+' · '+availability.label+' · Bugün '+availability.today+' · '+(age===null?'Kontrol bekleniyor':age+' saniye önce')}><img className="dock-restaurant-logo" src={'/online/logos/'+(/fast/i.test(branch.name)?'fastfood':/d[uü]r[uü]m/i.test(branch.name)?'durum':'beyoglu')+'.jpeg'} alt={branch.name} width={30} height={30}/><span className="connection-dock-dot" aria-hidden="true"/><div><strong><b className="dock-branch-full">{branch.name}</b><b className="dock-branch-short">{shortName(branch.name)}</b><span className="dock-order-state">{availability.short}</span></strong><small className="dock-today-hours">{availability.today==='Saat paylaşılmadı'?'Saat paylaşılmadı':availability.today}</small></div></button>;
  }):<p className="text-xs text-[#71836a]">Restoran bağlantıları kontrol ediliyor…</p>}</div>
  <div className="connection-dock-metrics" aria-label="Sipariş takip durumu">
   <div className="dock-metric dock-preparation" aria-label="Hazırlama süresi 15 dakika"><span className="dock-clock-compact" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="17" r="12" stroke="currentColor" strokeWidth="1.7"/><path d="M13 2h6M16 2v3M26 6l2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><text x="16" y="21" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12" fontWeight="700">15</text></svg></span><Clock3 size={16} aria-hidden="true"/><div><small>Hazırlama süresi</small><strong>15 dk</strong></div></div>
   <div className="dock-metric dock-accounts" aria-label={status.accounts+' hesap bağlı'}><Link2 size={16} aria-hidden="true"/><div><small>Bağlı hesap</small><strong>{status.accounts}</strong></div></div>
   <div className="dock-metric dock-print" data-active={status.printing==='Aktif'}><Printer size={16} aria-hidden="true"/><div><small>Otomatik yazdırma</small><strong>{status.printing}</strong></div></div>
  </div>
 <Dialog open={!!branch} onOpenChange={value=>!value&&!hoursBusy&&setSelected(null)}><DialogContent className="restaurant-hours-dialog"><DialogHeader><DialogTitle>{branch?.name}</DialogTitle><DialogDescription>Sipariş durumu ve çalışma saatleri</DialogDescription></DialogHeader>{branch&&<>
  <div className="restaurant-availability" data-state={restaurantAvailability(branch.restaurant,now).state}><span/>{restaurantAvailability(branch.restaurant,now).label}</div>
  {branch.restaurant?.error&&<p className="text-xs text-amber-800" role="status">{branch.restaurant.error}{branch.restaurant.checkedAt?' Saatler son başarılı kontrolden gösteriliyor.':''}</p>}
  <RestaurantStatusControl key={branch.id+':status'} branchId={branch.id} info={branch.restaurant} canEdit={canEditHours} onBusy={setHoursBusy}/>
  <RestaurantHoursEditor key={branch.id} branchId={branch.id} hours={branch.restaurant?.workingHours||[]} canEdit={canEditHours} now={now} onBusy={setHoursBusy}/>
  <dl className="restaurant-connection-details"><div><dt>Mağaza bilgisi kontrolü</dt><dd>{branch.restaurant?.checkedAt?new Date(branch.restaurant.checkedAt).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Henüz alınamadı'}</dd></div><div><dt>Sipariş bağlantısı</dt><dd>{branch.state==='error'?'Bağlantı hatası':!branch.lastSuccess||now-branch.lastSuccess>90000?'Veri güncel değil':'Güncel'}</dd></div><div><dt>Son sipariş kontrolü</dt><dd>{branch.lastSuccess?new Date(branch.lastSuccess).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}):'Henüz yok'}</dd></div>{branch.state==='error'&&branch.message&&<div><dt>Açıklama</dt><dd>{branch.message}</dd></div>}</dl>
 </>}</DialogContent></Dialog>
 </footer>;
}
