import {restaurantGroups} from './summary.js';
// Availability comes from the restaurant API, never from the working-hours clock.
export const restaurantDays=[['MONDAY','Pazartesi'],['TUESDAY','Salı'],['WEDNESDAY','Çarşamba'],['THURSDAY','Perşembe'],['FRIDAY','Cuma'],['SATURDAY','Cumartesi'],['SUNDAY','Pazar']];
export function restaurantToday(now=Date.now()){return new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Istanbul',weekday:'long'}).format(now).toUpperCase();}
export function hoursForDay(hours,day){const rows=(hours||[]).filter(row=>row.dayOfWeek===day);return rows.length?rows.map(row=>row.openingTime.slice(0,5)+'–'+row.closingTime.slice(0,5)+(row.closingTime<row.openingTime?' (+1 gün)':'')).join(' / '):'Saat paylaşılmadı';}
export function restaurantAvailability(info,now=Date.now()){
 const fresh=!!info?.checkedAt&&!info?.error&&now-info.checkedAt>=-30000&&now-info.checkedAt<=120000;
 const state=fresh&&['OPEN','CLOSED'].includes(info.workingStatus)?info.workingStatus:'UNKNOWN';
 return {state,label:state==='OPEN'?'Siparişe açık':state==='CLOSED'?'Siparişe kapalı':'Durum alınamadı',short:state==='OPEN'?'Açık':state==='CLOSED'?'Kapalı':'Belirsiz',today:hoursForDay(info?.workingHours,restaurantToday(now))};
}

export function branchConnectionStatuses(accounts,orders){
 const grouped=accounts.map(a=>({...a,stores:a.stores?.length?a.stores:(a.restaurantInfo?.stores||[]).map(s=>({id:s.id,name:s.name}))}));
 return restaurantGroups(grouped,orders).map(group=>{const account=accounts.find(a=>a.id===group.accountId),metadata=account?.restaurantInfo,restaurant=metadata?.stores?.find(row=>row.id===group.storeId);return {id:group.id,name:group.name,state:account?.status?.state||'waiting',lastSuccess:account?.status?.lastSuccess||null,message:account?.status?.message||'',restaurant:{closure:account?.closures?.[group.id]||null,workingStatus:restaurant?.workingStatus||'UNKNOWN',workingHours:restaurant?.workingHours||[],checkedAt:metadata?.checkedAt||null,error:metadata?.error||(!restaurant?'Restoran bilgisi bekleniyor.':'')}};});
}
