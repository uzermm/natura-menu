'use client';
import {useEffect,useRef,useState} from 'react';
export function OnlineWorkspace({view,active,onStatus}:{view:'orders'|'reviews'|'settings';active:boolean;onStatus:(value:{printing:string;accounts:string})=>void}){
 const frame=useRef<HTMLIFrameElement>(null),[ready,setReady]=useState(false);
 const current=useRef({view,active,onStatus});current.current={view,active,onStatus};
 useEffect(()=>{
  function message(event:MessageEvent){
   if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='online:ready'){setReady(true);frame.current?.contentWindow?.postMessage({type:'online:navigate',view:current.current.view},location.origin);}
   if(event.data?.type==='online:status')current.current.onStatus({printing:String(event.data.printing||'Kapalı'),accounts:String(event.data.accounts||'0/0')});
   if(event.data?.type==='online:login')location.assign('/login');
  }
  window.addEventListener('message',message);return()=>window.removeEventListener('message',message);
 },[]);
 useEffect(()=>{if(ready)frame.current?.contentWindow?.postMessage({type:'online:navigate',view},location.origin);},[view,ready]);
 return <section aria-label={view==='settings'?'Online sipariş bağlantıları':view==='reviews'?'Restoran yorumları':'Online siparişler'} aria-hidden={!active} style={active?undefined:{position:'fixed',left:'-200vw',top:0,width:'calc(100vw - 32px)',pointerEvents:'none'}}>
  <iframe ref={frame} src="/online/" title="Online sipariş yönetimi" tabIndex={active?0:-1} className="block w-full border-0" style={{height:'calc(100dvh - 130px)',minHeight:480}} allow="autoplay"/>
 </section>;
}
