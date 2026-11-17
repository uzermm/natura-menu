'use client';
import {api} from './client';
export async function disableDevicePush(){try{localStorage.setItem('natura-push-wanted','off');}catch{}if(!('serviceWorker' in navigator))return;const registration=await navigator.serviceWorker.getRegistration('/'),sub=await registration?.pushManager?.getSubscription();if(!sub)return;try{await api('/api/notifications',{endpoint:sub.endpoint},'DELETE');}finally{await sub.unsubscribe();}}
export function pushWanted(){try{return localStorage.getItem('natura-push-wanted')!=='off';}catch{return true;}}
export function rememberPush(){try{localStorage.setItem('natura-push-wanted','on');}catch{}}
