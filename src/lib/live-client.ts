'use client';
import {useEffect,useState} from 'react';
import {api} from './client';
import type {WaiterCall} from './types';
let liveConnected=false;
export const isLiveConnected=()=>liveConnected;
export type LiveActivity={calls:WaiterCall[];pending_order_ids:string[];revision?:string};
export function useLiveActivity(){
 const [activity,setActivity]=useState<LiveActivity|null>(null),[connected,setConnected]=useState(false),[showReconnectWarning,setShowReconnectWarning]=useState(false);
 useEffect(()=>{
  let source:EventSource|null=null,stopped=false,online=false,inFlight=false,lastRevision='',lastContact=Date.now(),lastSignal=Date.now(),graceStart=Date.now();
  const status=(value:boolean)=>{online=value;liveConnected=value;setConnected(value);window.dispatchEvent(new CustomEvent('natura:live-status',{detail:value}));};
  const touch=()=>{lastContact=Date.now();setShowReconnectWarning(false);};
  const warning=()=>{if(!stopped&&!document.hidden)setShowReconnectWarning(!navigator.onLine||Date.now()-Math.max(lastContact,graceStart)>15000);};
  const apply=(value:LiveActivity)=>{if(stopped)return;touch();setActivity(value);if(!value.revision||value.revision!==lastRevision){lastRevision=value.revision||'';if(!document.hidden)window.dispatchEvent(new Event('natura:live-change'));}};
  async function fallback(force=false){if(stopped||document.hidden||inFlight||online&&!force)return;inFlight=true;try{apply(await api<LiveActivity>('/api/admin/activity',undefined,'GET'));}catch{warning();}finally{inFlight=false;}}
  function connect(){
   if(stopped||document.hidden||!navigator.onLine)return;
   if(source&&(source.readyState===EventSource.OPEN||source.readyState===EventSource.CONNECTING))return;
   if(!('EventSource' in window)){void fallback();return;}
   lastSignal=Date.now();source=new EventSource('/api/admin/live');
   source.onopen=()=>{lastSignal=Date.now();status(true);touch();};
   source.onmessage=e=>{try{const value=JSON.parse(e.data);lastSignal=Date.now();apply(value);}catch{}};
   source.addEventListener('heartbeat',()=>{lastSignal=Date.now();touch();});
   source.onerror=()=>{status(false);warning();};
   source.addEventListener('expired',()=>{source?.close();source=null;status(false);graceStart=Date.now();connect();});
  }
  const visible=()=>{
   if(document.hidden)return;
   graceStart=Date.now();setShowReconnectWarning(false);
   if(source&&Date.now()-lastSignal>30000){source.close();source=null;status(false);}
   connect();void fallback(true);warning();
  };
  const offline=()=>{source?.close();source=null;status(false);warning();};
  const message=(e:MessageEvent)=>{if(e.data?.type==='natura-push'&&!document.hidden)void fallback(true);};
  document.addEventListener('visibilitychange',visible);window.addEventListener('focus',visible);window.addEventListener('pageshow',visible);window.addEventListener('online',visible);window.addEventListener('offline',offline);navigator.serviceWorker?.addEventListener('message',message);
  const timer=setInterval(()=>{warning();void fallback();},10000);connect();
  return()=>{stopped=true;liveConnected=false;source?.close();clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);window.removeEventListener('pageshow',visible);window.removeEventListener('online',visible);window.removeEventListener('offline',offline);navigator.serviceWorker?.removeEventListener('message',message);};
 },[]);
 return {activity,connected,showReconnectWarning};
}
