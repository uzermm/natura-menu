import {readdir,readFile,writeFile} from 'node:fs/promises';
const assets={};
async function walk(dir,prefix=''){
 for(const file of await readdir(dir,{withFileTypes:true})){
  if(file.isDirectory()){await walk(dir+'/'+file.name,prefix+file.name+'/');continue;}
  const name=prefix+file.name,bytes=await readFile(dir+'/'+file.name),binary=/\.(jpeg|png|jpg|webp|ico|wav)$/.test(name);
  let body=bytes.toString(binary?'base64':'utf8');
  // Namespace the original UI and APIs so the cafe routes stay independent.
  if(!binary&&/\.(js|html|css|webmanifest)$/.test(name))body=body.replace(/(["'`])\/(?=[A-Za-z])(?!online\/)/g,'$1/online/');
  if(name==='push-worker.js')body=body.replace("new URL('/online/?section=onlineOrders'", "new URL('/?section=onlineOrders'");
  assets[name]={body,base64:binary,type:name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.webmanifest')?'application/manifest+json':name.endsWith('.jpeg')?'image/jpeg':name.endsWith('.png')?'image/png':name.endsWith('.wav')?'audio/wav':'text/html; charset=utf-8'};
 }
}
await walk('online/portal/public');
await writeFile('online/portal/assets.generated.mjs','export const assets='+JSON.stringify(assets)+';');
