// Node 24+, Windows. No dependencies or incoming network ports.
import { readFile,writeFile,mkdir,unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse((await readFile(path.join(root,'config.local.json'),'utf8')).replace(/^\uFEFF/,''));
if(process.platform!=='win32')throw Error('Bu yardımcı Windows içindir.');
const origin=new URL(config.url);if(origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('HTTPS site adresi gerekli.');
if(!/^[\w-]{43}$/.test(config.token))throw Error('Geçerli bağlantı anahtarı gerekli.');
const directory=path.join(root,'queue');await mkdir(directory,{recursive:true});
async function request(method,body){const res=await fetch(new URL('/api/printer',origin),{method,headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error(`Sunucu yanıtı: ${res.status}`);return res.json();}
async function print(file){await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'print-receipt.ps1'),'-ReceiptPath',file,'-PrinterName',config.printer||''],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',data=>{error+=data.toString();});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(error.slice(0,400)||`Yazdırma hatası: ${code}`)));});}
let acknowledgement=null;
console.log('Natura yazdırma yardımcısı hazır. Kuyruk 10 saniyede kontrol edilir.');
while(true){try{
 if(acknowledgement){await request('POST',acknowledgement);acknowledgement=null;}
 const {job}=await request('GET');
 if(job){
  const file=path.join(directory,`${job.id}.json`),marker=path.join(directory,`${job.id}.started`);
  let handle;try{handle=await import('node:fs/promises').then(fs=>fs.open(marker,'wx'));await handle.close();}catch{throw Error('Çıktı daha önce işleme alınmış. Yazıcı kuyruğunu kontrol edin.');}
  await writeFile(file,JSON.stringify(job.payload),'utf8');
  try{await print(file);acknowledgement={id:job.id,status:'printed',error:''};await unlink(file);}catch(error){acknowledgement={id:job.id,status:'failed',error:String(error.message).slice(0,500)};}
  await request('POST',acknowledgement);acknowledgement=null;continue;
 }
}catch(error){console.error(new Date().toLocaleTimeString('tr-TR'),error.message);}
await new Promise(resolve=>setTimeout(resolve,10000));
}
