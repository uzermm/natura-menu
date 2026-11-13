import { DatabaseSync,backup } from 'node:sqlite';
import { mkdir,cp,writeFile } from 'node:fs/promises';
import path from 'node:path';
const dataDir=path.resolve(process.env.DATA_DIR||'data');
const target=path.join(dataDir,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(target,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'natura.sqlite'),{readOnly:true});
await backup(db,path.join(target,'natura.sqlite'));db.close();
try{await cp(path.join(dataDir,'uploads'),path.join(target,'uploads'),{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile(path.join(target,'backup-info.json'),JSON.stringify({createdAt:new Date().toISOString(),formatVersion:1,notes:'SQLite online backup + immutable uploaded WebP files. Restore only while the application is stopped.'},null,2));
console.log(`Backup ready: ${target}`);
