'use client';
import {useEffect,useRef,useState} from 'react';
import type {OnlineStatus,BranchConnection} from '@/lib/online-status';
type View='orders'|'reviews'|'settings';
export function OnlineWorkspace({view,active,onStatus,soundEnabled}:{view:View;active:boolean;soundEnabled:boolean;onStatus:(value:OnlineStatus)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),[heights,setHeights]=useState({orders:480,reviews:480,settings:900});
 const current=useRef({view,active,onStatus,soundEnabled});current.current={view,active,onStatus,soundEnabled};
 const sequence=useRef(0),pending=useRef<{id:number;view:View;active:boolean;soundEnabled:boolean}|null>(null),retry=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
 function synchronize(){clearInterval(retry.current);const {view,active,soundEnabled}=current.current;pending.current={id:++sequence.current,view,active,soundEnabled};const send=()=>{if(pending.current)frame.current?.contentWindow?.postMessage({type:'online:context',...pending.current},location.origin);};send();let attempts=0;retry.current=setInterval(()=>{if(++attempts>=40){clearInterval(retry.current);return;}send();},250);}
 useEffect(()=>{
  function message(event:MessageEvent){
   if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='online:ready')synchronize();
   if(event.data?.type==='online:context-applied'&&event.data.id===pending.current?.id){pending.current=null;clearInterval(retry.current);}
   if(event.data?.type==='online:height'&&Number.isFinite(event.data.height)&&['orders','reviews','settings'].includes(event.data.view)){const key=event.data.view as View,height=Math.max(1,Math.min(1000000,Math.ceil(event.data.height)));setHeights(previous=>previous[key]===height?previous:{...previous,[key]:height});}
   if(event.data?.type==='online:status')current.current.onStatus({printing:String(event.data.printing||'Kapalı'),refreshing:!!event.data.refreshing,canRefresh:!!event.data.canRefresh,accounts:String(event.data.accounts||'0/0'),branches:Array.isArray(event.data.branches)?event.data.branches.filter((b:BranchConnection)=>typeof b.id==='string'&&typeof b.name==='string').map((b:BranchConnection)=>({id:b.id,name:b.name,state:String(b.state||'waiting'),lastSuccess:typeof b.lastSuccess==='number'?b.lastSuccess:null,message:typeof b.message==='string'?b.message.slice(0,300):'',restaurant:b.restaurant?{workingStatus:['OPEN','CLOSED'].includes(b.restaurant.workingStatus)?b.restaurant.workingStatus:'UNKNOWN',checkedAt:typeof b.restaurant.checkedAt==='number'?b.restaurant.checkedAt:null,error:String(b.restaurant.error||'').slice(0,300),workingHours:Array.isArray(b.restaurant.workingHours)?b.restaurant.workingHours.filter(h=>typeof h.dayOfWeek==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.openingTime)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h.closingTime)).slice(0,70):[]}:undefined})):[]});
   if(event.data?.type==='online:feedback'&&typeof event.data.message==='string')window.dispatchEvent(new CustomEvent('natura:online-feedback',{detail:{message:event.data.message.slice(0,350),error:!!event.data.error,pending:!!event.data.pending}}));
   if(event.data?.type==='online:login')location.assign('/login');
  }
  const command=(event:Event)=>{const action=(event as CustomEvent).detail;if(['refresh','print'].includes(action))frame.current?.contentWindow?.postMessage({type:'online:command',action},location.origin);};
  window.addEventListener('natura:online-command',command);
  window.addEventListener('message',message);return()=>{window.removeEventListener('natura:online-command',command);window.removeEventListener('message',message);clearInterval(retry.current);};
 },[]);
 useEffect(()=>{synchronize();},[view,active,soundEnabled]);
 return <section aria-label={view==='settings'?'Online sipariş bağlantıları':view==='reviews'?'Restoran yorumları':'Online siparişler'} aria-hidden={!active} style={active?undefined:{position:'fixed',left:'-200vw',top:0,width:'calc(100vw - 32px)',pointerEvents:'none'}}>
  <iframe ref={frame} src="/online/" title="Online sipariş yönetimi" onLoad={synchronize} tabIndex={active?0:-1} className="block w-full border-0 online-workspace-frame" style={{height:heights[view],minHeight:1}} allow="autoplay"/>
 </section>;
}
