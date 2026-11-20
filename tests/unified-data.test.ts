import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,mkdirSync,writeFileSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {auditUnifiedData} from '../scripts/check-unified-data.mjs';
test('whole-file snapshots preserve cari ledgers and original password hashes; missing volumes fail closed',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'unified-data-test-')),onlineDir=path.join(dir,'online');mkdirSync(onlineDir);
 try{
  assert.throws(()=>auditUnifiedData(dir,onlineDir),/bulunamadı/);
  const cafe=new DatabaseSync(path.join(dir,'natura.sqlite'));
  cafe.exec("CREATE TABLE admin_identity(username TEXT);INSERT INTO admin_identity VALUES('same.owner');CREATE TABLE employees(username TEXT,password_hash TEXT);INSERT INTO employees VALUES('cashier','scrypt:preserved');CREATE TABLE pos_accounts(id TEXT,balance INTEGER);INSERT INTO pos_accounts VALUES('customer-1',15000);CREATE TABLE pos_ledger(account_id TEXT,amount INTEGER);INSERT INTO pos_ledger VALUES('customer-1',20000),('customer-1',-5000)");cafe.close();
  const online=new DatabaseSync(path.join(onlineDir,'sites.sqlite'));online.exec("CREATE TABLE portal_records(key TEXT,value TEXT);CREATE TABLE auth_users(id TEXT,username TEXT,role TEXT,enabled INTEGER,credential TEXT);INSERT INTO auth_users VALUES('owner','same.owner','admin',1,'original-pbkdf2-hash')");online.close();writeFileSync(path.join(onlineDir,'sites-data.key'),Buffer.alloc(32,7).toString('base64'));
  const report=auditUnifiedData(dir,onlineDir);assert.equal(report.cafe.tables.pos_accounts,1);assert.equal(report.cafe.tables.pos_ledger,2);assert.deepEqual(report.usernameCollisions,['same.owner']);
  const result=spawnSync(process.execPath,['scripts/backup-unified.mjs'],{cwd:path.resolve('.'),env:{...process.env,DATA_DIR:dir,ONLINE_DATA_DIR:onlineDir},encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const directories=readdirSync(path.join(dir,'backups'),{withFileTypes:true}).filter(entry=>entry.isDirectory()&&entry.name.startsWith('unified-v2-'));assert.equal(directories.length,1);const target=path.join(dir,'backups',directories[0].name);const copy=new DatabaseSync(path.join(target,'natura.sqlite'),{readOnly:true});assert.equal(copy.prepare('SELECT SUM(amount) AS balance FROM pos_ledger').get()?.balance,15000);assert.equal(copy.prepare('SELECT password_hash FROM employees').get()?.password_hash,'scrypt:preserved');copy.close();
  const portalCopy=new DatabaseSync(path.join(target,'online','sites.sqlite'),{readOnly:true});assert.equal(portalCopy.prepare('SELECT credential FROM auth_users').get()?.credential,'original-pbkdf2-hash');portalCopy.close();assert.equal(readFileSync(path.join(target,'online','sites-data.key'),'utf8'),readFileSync(path.join(onlineDir,'sites-data.key'),'utf8'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
