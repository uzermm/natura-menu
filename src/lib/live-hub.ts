import {recordDiagnostic} from './diagnostics';
import {db} from './db';
import type {WaiterCall} from './types';
import {posRevision} from './pos-core';
type Client={send:(value:string)=>void;valid:()=>boolean;close:()=>void};
type Hub={clients:Set<Client>;timer?:ReturnType<typeof setInterval>;signature:string;ticks:number};
const global=globalThis as typeof globalThis&{naturaLiveHub?:Hub};
const hub=global.naturaLiveHub??= {clients:new Set(),signature:'',ticks:0};
export function liveSnapshot(){return {menu_revision:Number(db().prepare('SELECT revision FROM menu_revision WHERE id=1').get()!.revision),calls:db().prepare('SELECT * FROM waiter_calls WHERE resolved_at IS NULL ORDER BY created_at,id').all() as unknown as WaiterCall[],pending_order_ids:db().prepare("SELECT id FROM pos_orders WHERE status='pending' ORDER BY id").all().map(r=>String(r.id)),revision:posRevision(db())};}
function tick(){try{const snapshot=JSON.stringify(liveSnapshot()),changed=snapshot!==hub.signature;hub.signature=snapshot;hub.ticks++;for(const c of [...hub.clients]){try{if(changed||hub.ticks%5===0){if(!c.valid()){c.send('event: expired\ndata: {}\n\n');c.close();continue;}c.send(changed?'data: '+snapshot+'\n\n':'event: heartbeat\ndata: {}\n\n');}}catch{c.close();}}}catch{/* Existing connections recover on the next lightweight tick. */}}
export function subscribeLive(client:Client){const snapshot=JSON.stringify(liveSnapshot());if(!hub.clients.size)hub.signature=snapshot;hub.clients.add(client);recordDiagnostic('live.connect');client.send('retry: 1500\n\ndata: '+snapshot+'\n\n');if(!hub.timer){hub.timer=setInterval(tick,2000);hub.timer.unref?.();}return()=>{hub.clients.delete(client);recordDiagnostic('live.disconnect');if(!hub.clients.size&&hub.timer){clearInterval(hub.timer);hub.timer=undefined;hub.signature='';}};}
