import {pathToFileURL} from 'node:url';
import path from 'node:path';
import type {Operator} from './employee-session';
type OnlineRuntime={onlineRequest:(request:Request,operator:Operator|null)=>Promise<Response>;legacyLogin:(request:Request,input:{username:string;password:string})=>Promise<{cookie:string|null;limited?:boolean}>;legacyOperator:(token:string)=>Promise<Operator|null>;legacyLogout:(token:string)=>Promise<void>};
let loaded:Promise<OnlineRuntime>|undefined;
export function onlineRuntime(){
 // The existing Node service is shipped intact beside the Next standalone build.
 // Native import avoids bundling SQLite connections and background timers twice.
 loaded??=(new Function('url','return import(url)') as (url:string)=>Promise<OnlineRuntime>)(pathToFileURL(path.join(process.cwd(),'online/runtime.mjs')).href);
 return loaded;
}
