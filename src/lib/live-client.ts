'use client';
import {useEffect,useState} from 'react';
import {api} from './client';
import type {WaiterCall} from './types';
let liveConnected=false;
export const isLiveConnected=()=>liveConnected;
export type LiveActivity={calls:WaiterCall[];pending_order_ids:string[];revision?:string};
export function useLiveActivity(){const [activity,setActivity]=useState<LiveActivity|null>(null),[connected,setConnected]=useState(false);useEffect(()=>{
 let source:EventSource|null=null,stopped=false,online=false,inFlight=false,lastRevision='';
 const status=(value:boolean)=>{online=value;liveConnected=value;setConnected(value);window.dispatchEvent(new CustomEvent('natura:live-status',{detail:value}));};
 const apply=(value:LiveActivity)=>{if(stopped)return;setActivity(value);if(!value.revision||value.revision!==lastRevision){lastRevision=value.revision||'';window.dispatchEvent(new Event('natura:live-change'));}};
 async function fallback(){if(stopped||document.hidden||inFlight||online)return;inFlight=true;try{apply(await api<LiveActivity>('/api/admin/activity',undefined,'GET'));}catch{}finally{inFlight=false;}}
 function connect(){if(stopped||document.hidden||!navigator.onLine)return;source?.close();if(!('EventSource' in window)){void fallback();return;}source=new EventSource('/api/admin/live');source.onopen=()=>status(true);source.onmessage=e=>{try{apply(JSON.parse(e.data));}catch{}};source.onerror=()=>status(false);source.addEventListener('expired',()=>{source?.close();status(false);connect();});}
 const visible=()=>{if(document.hidden){source?.close();source=null;status(false);}else{connect();void fallback();}};const offline=()=>{source?.close();source=null;status(false);};
 const push=()=>{if(!document.hidden){void api<LiveActivity>('/api/admin/activity',undefined,'GET').then(apply).catch(()=>{});}};
 const message=(e:MessageEvent)=>{if(e.data?.type==='natura-push')push();};
 document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);window.addEventListener('offline',offline);navigator.serviceWorker?.addEventListener('message',message);const timer=setInterval(()=>void fallback(),10000);connect();
 return()=>{stopped=true;liveConnected=false;source?.close();clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);window.removeEventListener('offline',offline);navigator.serviceWorker?.removeEventListener('message',message);};
 },[]);return {activity,connected};}
