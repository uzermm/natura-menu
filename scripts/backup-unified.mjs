import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,cp,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {auditUnifiedData} from './check-unified-data.mjs';
const cafeDir=path.resolve(process.env.DATA_DIR||'data'),onlineDir=path.resolve(process.env.ONLINE_DATA_DIR||path.join(cafeDir,'online'));
const before=auditUnifiedData(cafeDir,onlineDir);
const target=path.join(cafeDir,'backups','unified-'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(path.join(target,'online'),{recursive:true,mode:0o700});
const cafe=new DatabaseSync(path.join(cafeDir,'natura.sqlite'),{readOnly:true}),online=new DatabaseSync(path.join(onlineDir,'sites.sqlite'),{readOnly:true});
try{await backup(cafe,path.join(target,'natura.sqlite'));await backup(online,path.join(target,'online','sites.sqlite'));}finally{cafe.close();online.close();}
for(const file of ['sites-data.key','web-push.key'])if(existsSync(path.join(onlineDir,file)))await cp(path.join(onlineDir,file),path.join(target,'online',file));
if(existsSync(path.join(cafeDir,'uploads')))await cp(path.join(cafeDir,'uploads'),path.join(target,'uploads'),{recursive:true});
const snapshot=auditUnifiedData(target,path.join(target,'online'));
await writeFile(path.join(target,'backup-info.json'),JSON.stringify({formatVersion:1,before,snapshot,notes:'Whole SQLite snapshots include accounts, ledger, tickets, payments and password hashes. Runtime SESSION_SECRET and ADMIN_PASSWORD stay in Dokploy Environment.'},null,2),{mode:0o600});
console.log('Birleşik veri yedeği hazır: '+target);
