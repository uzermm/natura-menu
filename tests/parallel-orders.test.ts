import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const data=mkdtempSync(path.join(tmpdir(),'natura-parallel-'));process.env.DATA_DIR=data;process.env.ONLINE_DATA_DIR=path.join(data,'online');process.env.ONLINE_BACKGROUND='0';process.env.TELEGRAM_BOT_TOKEN='';process.env.TELEGRAM_CHAT_ID='';
const {tick,subscribeOnline}=await import('../online/runtime.mjs');const {DB,sqlite,dataKey}=await import('../online/dokploy/database.mjs');const {storage,seal}=await import('../online/portal/store.mjs');const store=storage({DB});
after(()=>{sqlite.close();rmSync(data,{recursive:true,force:true});});
test('a slow branch cannot delay other branches and parallel merging preserves every order',async()=>{
 const accounts=[1,2,3].map(id=>({id:String(id),supplierId:String(id),label:'Branch '+id,environment:'stage',agentName:'QA',executorEmail:'qa@example.test',apiKey:'test',apiSecret:'test',stores:[{id:String(id),name:'Branch '+id}]}));await store.set('config',await seal({accounts,interval:15},dataKey()));
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let fast!:()=>void;const fastDone=new Promise<void>(resolve=>fast=resolve);const original=globalThis.fetch;
 const unsubscribe=subscribeOnline(()=>{void store.get('orders',[]).then(rows=>{if(rows.some((o:{accountId:string})=>o.accountId==='2')&&rows.some((o:{accountId:string})=>o.accountId==='3'))fast();});});
 globalThis.fetch=async(input)=>{const url=new URL(String(input)),id=url.pathname.match(/suppliers\/(\d+)/)![1];if(id==='1')await gate;return Response.json({content:[{id:'package-'+id,storeId:Number(id),orderNumber:'100'+id,orderCode:'00'+id,packageStatus:'Delivered',packageCreationDate:Date.now(),packageModificationDate:Date.now(),lines:[],payment:{},address:{},totalPrice:10}],totalPages:1});};
 let timer:ReturnType<typeof setTimeout>|undefined;const pending=tick();
 try{await Promise.race([fastDone,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Fast branches waited for the slow branch')),3000))]);const intermediate=await store.get('orders',[]);assert.deepEqual(intermediate.map((o:{accountId:string})=>o.accountId).sort(),['2','3']);release();await pending;assert.deepEqual((await store.get('orders',[])).map((o:{accountId:string})=>o.accountId).sort(),['1','2','3']);}finally{release();await pending;clearTimeout(timer);unsubscribe();globalThis.fetch=original;}
});
