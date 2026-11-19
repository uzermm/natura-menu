import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {initUserAccess,setUserAccess,userAccess} from '../src/lib/user-access.ts';
import {employeeSession,makeEmployeeSession} from '../src/lib/employee-session.ts';
import {panelSections} from '../src/lib/panel-access.ts';
process.env.SESSION_SECRET='user-access-test-secret-at-least-32-characters';

test('roles are source-scoped, preserve credentials and changes apply to existing sessions',()=>{
 const d=new DatabaseSync(':memory:');try{
 d.exec('CREATE TABLE employees(id TEXT,username TEXT,name TEXT,role TEXT,password_hash TEXT,is_active INTEGER)');
 const row={id:'one',username:'user',name:'User',role:'cashier',password_hash:'unchanged-test-hash',is_active:1};
 d.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?)').run(row.id,row.username,row.name,row.role,row.password_hash,row.is_active);
 const token=makeEmployeeSession(row);assert.equal(employeeSession(d,token)?.role,'cashier');
 initUserAccess(d);setUserAccess(d,'employee:one','admin');setUserAccess(d,'portal:one','kitchen');
 assert.equal(employeeSession(d,token)?.role,'admin');assert.equal(userAccess(d,'portal:one','admin').role,'kitchen');
 setUserAccess(d,'employee:one','waiter');assert.equal(employeeSession(d,token)?.role,'waiter');
 assert.equal(d.prepare('SELECT password_hash FROM employees').get()?.password_hash,row.password_hash);
 d.prepare('UPDATE employees SET is_active=0').run();assert.equal(employeeSession(d,token),null);
 }finally{d.close();}
});

test('kitchen native login is valid but navigation only includes online orders',()=>{
 const d=new DatabaseSync(':memory:');try{
 d.exec("CREATE TABLE employees(id TEXT,username TEXT,name TEXT,role TEXT,password_hash TEXT,is_active INTEGER);INSERT INTO employees VALUES('k','mutfak','Mutfak','kitchen','hash',1)");
 const token=makeEmployeeSession({id:'k',username:'mutfak',name:'Mutfak',role:'kitchen',password_hash:'hash',is_active:1});
 assert.equal(employeeSession(d,token)?.role,'kitchen');assert.deepEqual(panelSections('kitchen'),['onlineOrders']);
 }finally{d.close();}
});
