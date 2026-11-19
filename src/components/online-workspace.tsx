'use client';
import {useEffect,useRef,useState} from 'react';
import type {OnlineStatus,BranchConnection} from '@/lib/online-status';
export function OnlineWorkspace({view,active,onStatus,soundEnabled}:{view:'orders'|'reviews'|'settings';active:boolean;soundEnabled:boolean;onStatus:(value:OnlineStatus)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),[ready,setReady]=useState(false),[heights,setHeights]=useState({orders:480,reviews:480,settings:900});
 const current=useRef({view,active,onStatus,soundEnabled});current.current={view,active,onStatus,soundEnabled};
 useEffect(()=>{
  function message(event:MessageEvent){
   if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='online:ready'){frame.current?.contentWindow?.postMessage({type:'online:sound',enabled:current.current.soundEnabled},location.origin);setReady(true);frame.current?.contentWindow?.postMessage({type:'online:visibility',active:current.current.active},location.origin);frame.current?.contentWindow?.postMessage({type:'online:navigate',view:current.current.view},location.origin);}
   if(event.data?.type==='online:height'&&Number.isFinite(event.data.height)&&['orders','reviews','settings'].includes(event.data.view)){const key=event.data.view as typeof view,height=Math.max(1,Math.min(1000000,Math.ceil(event.data.height)));setHeights(previous=>previous[key]===height?previous:{...previous,[key]:height});}
   if(event.data?.type==='online:status')current.current.onStatus({printing:String(event.data.printing||'Kapalı'),accounts:String(event.data.accounts||'0/0'),branches:Array.isArray(event.data.branches)?event.data.branches.filter((b:BranchConnection)=>typeof b.id==='string'&&typeof b.name==='string').map((b:BranchConnection)=>({id:b.id,name:b.name,state:String(b.state||'waiting'),lastSuccess:typeof b.lastSuccess==='number'?b.lastSuccess:null})):[]});
   if(event.data?.type==='online:login')location.assign('/login');
  }
  window.addEventListener('message',message);return()=>window.removeEventListener('message',message);
 },[]);
 useEffect(()=>{if(ready)frame.current?.contentWindow?.postMessage({type:'online:visibility',active},location.origin);},[active,ready]);
 useEffect(()=>{if(ready)frame.current?.contentWindow?.postMessage({type:'online:sound',enabled:soundEnabled},location.origin);},[soundEnabled,ready]);
 useEffect(()=>{if(ready)frame.current?.contentWindow?.postMessage({type:'online:navigate',view},location.origin);},[view,ready]);
 return <section aria-label={view==='settings'?'Online sipariş bağlantıları':view==='reviews'?'Restoran yorumları':'Online siparişler'} aria-hidden={!active} style={active?undefined:{position:'fixed',left:'-200vw',top:0,width:'calc(100vw - 32px)',pointerEvents:'none'}}>
  <iframe ref={frame} src="/online/" title="Online sipariş yönetimi" onLoad={()=>{setReady(true);frame.current?.contentWindow?.postMessage({type:'online:navigate',view:current.current.view},location.origin);}} tabIndex={active?0:-1} className="block w-full border-0 online-workspace-frame" style={{height:heights[view],minHeight:1}} allow="autoplay"/>
 </section>;
}
