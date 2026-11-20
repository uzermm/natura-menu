import {pathToFileURL} from 'node:url';
import path from 'node:path';
import type {Operator} from './employee-session';
type OnlineRuntime={operationsHealth:()=>Promise<{backup:Record<string,unknown>;telegram:{enabled:boolean;counts:{status:string;count:number}[];recent:{id:string;kind:string;status:string;attempts:number;createdAt:number;code:string;restaurant:string}[]};onlinePushSubscriptions:number}>;runUnifiedBackup:()=>Promise<Record<string,unknown>>;retryTelegram:(id:string)=>{ok:boolean};subscribeOnline:(callback:()=>void)=>()=>void;renewLegacy:(req:Request)=>Promise<string>;listLegacyUsers:()=>{id:string;username:string;role:string;enabled:boolean}[];saveLegacyUser:(input:{id:string;username:string;role:string;enabled:boolean;password?:string})=>Promise<void>;removeLegacyUser:(id:string)=>void;syncIdentities:()=>void;legacySessionValid:(token:string|undefined,id:string)=>boolean;onlineRequest:(request:Request,operator:Operator|null)=>Promise<Response>;legacyLogin:(request:Request,input:{username:string;password:string})=>Promise<{cookie:string|null;limited?:boolean}>;legacyOperator:(token:string)=>Promise<Operator|null>;legacyLogout:(token:string)=>Promise<void>};
let loaded:Promise<OnlineRuntime>|undefined;
export function onlineRuntime(){
 // The existing Node service is shipped intact beside the Next standalone build.
 // Native import avoids bundling SQLite connections and background timers twice.
 loaded??=(new Function('url','return import(url)') as (url:string)=>Promise<OnlineRuntime>)(pathToFileURL(path.join(process.cwd(),'online/runtime.mjs')).href);
 return loaded;
}
