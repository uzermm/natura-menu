import {DatabaseSync} from 'node:sqlite';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createDecipheriv} from 'node:crypto';
export function auditUnifiedData(cafeDir,onlineDir){
 const cafeFile=path.resolve(cafeDir,'natura.sqlite'),onlineFile=path.resolve(onlineDir,'sites.sqlite'),keyFile=path.resolve(onlineDir,'sites-data.key');
 for(const file of [cafeFile,onlineFile,keyFile])if(!existsSync(file))throw Error('Mevcut veri dosyası bulunamadı: '+file);
 if(Buffer.from(readFileSync(keyFile,'utf8').trim(),'base64').length!==32)throw Error('Sipariş şifreleme anahtarı geçersiz.');
 const cafe=new DatabaseSync(cafeFile,{readOnly:true}),online=new DatabaseSync(onlineFile,{readOnly:true});
 try{
  const inspect=db=>{
   const check=db.prepare('PRAGMA quick_check').all();if(check.some(row=>Object.values(row)[0]!=='ok'))throw Error('Veritabanı bütünlük kontrolü geçmedi.');
   if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Veritabanında ilişkili kayıt hatası var.');
   return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(row=>[row.name,db.prepare('SELECT COUNT(*) AS count FROM "'+row.name.replaceAll('"','""')+'"').get().count]));
  };
  const cafeTables=inspect(cafe),onlineTables=inspect(online);
  if(!('pos_accounts' in cafeTables)||!('pos_ledger' in cafeTables)||!('employees' in cafeTables))throw Error('Kafe/cari veritabanı doğrulanamadı.');
  if(!('portal_records' in onlineTables)||!('auth_users' in onlineTables))throw Error('Sipariş veritabanı doğrulanamadı.');
  const configRow=online.prepare("SELECT value FROM portal_records WHERE key='config'").get();
  if(configRow){
   try{
    let encrypted=JSON.parse(String(configRow.value));
    if(encrypted.__portalChunks){const parts=[];for(let i=0;i<encrypted.__portalChunks;i++){const part=online.prepare('SELECT value FROM portal_records WHERE key=?').get('config::chunk::'+String(i).padStart(6,'0'));if(!part)throw Error();parts.push(part.value);}encrypted=JSON.parse(parts.join(''));}
    const key=Buffer.from(readFileSync(keyFile,'utf8').trim(),'base64'),bytes=Buffer.from(encrypted.body,'base64'),decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(encrypted.iv,'base64'));decipher.setAuthTag(bytes.subarray(-16));
    const parsed=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(0,-16)),decipher.final()]).toString('utf8'));if(!Array.isArray(parsed.accounts))throw Error();
   }catch{throw Error('Sipariş verisi ve sites-data.key eşleşmiyor; doğru anahtarı bağlayın.');}
  }
  const cafeUsers=[...cafe.prepare('SELECT username FROM admin_identity').all(),...cafe.prepare('SELECT username FROM employees').all()].map(row=>String(row.username).normalize('NFKC').toLowerCase());
  const onlineUsers=online.prepare("SELECT username,role,enabled FROM auth_users WHERE id NOT LIKE 'unified:%'").all();
  const usernameCollisions=onlineUsers.filter(user=>cafeUsers.includes(String(user.username).normalize('NFKC').toLowerCase())).map(user=>user.username);
  return {checkedAt:new Date().toISOString(),cafe:{file:cafeFile,tables:cafeTables},online:{file:onlineFile,tables:onlineTables,users:onlineUsers.length},usernameCollisions};
 }finally{cafe.close();online.close();}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{console.log(JSON.stringify(auditUnifiedData(process.env.DATA_DIR||'data',process.env.ONLINE_DATA_DIR||'data/online'),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
