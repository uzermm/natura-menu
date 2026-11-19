import {readdir,lstat,unlink,realpath} from 'node:fs/promises';
import path from 'node:path';
import type {DatabaseSync} from 'node:sqlite';
const filename=/^[a-f0-9-]{36}(-sm)?\.webp$/;
function references(d:DatabaseSync){const used=new Set<string>();for(const r of d.prepare('SELECT image_url FROM items UNION SELECT image_url FROM categories').all()){const url=String(r.image_url);if(url.startsWith('/media/')){used.add(path.basename(url));used.add(path.basename(url).replace(/\.webp$/,'-sm.webp'));}}return used;}
export async function unusedImages(d:DatabaseSync,dir:string,remove=false,now=Date.now()){
 let base:string;try{base=await realpath(dir);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {count:0,bytes:0};throw error;}
 const used=references(d);let count=0,bytes=0;for(const name of await readdir(base)){if(!filename.test(name)||used.has(name))continue;const target=path.resolve(base,name);if(path.dirname(target)!==base)continue;let info;try{info=await lstat(target);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}if(!info.isFile()||info.isSymbolicLink()||now-info.mtimeMs<7*86400000)continue;
 if(remove){if(references(d).has(name))continue;try{await unlink(target);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}}count++;bytes+=info.size;}return {count,bytes};
}
