import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {hashPassword} from '../src/lib/security.ts';
import {makeEmployeeSession,employeeSession} from '../src/lib/employee-session.ts';
import {assertOrderPermission,assertWaiterTicket} from '../src/lib/operator-policy.ts';
import type {PosCommand} from '../src/lib/pos-core.ts';
import type {Ticket} from '../src/lib/pos-types.ts';
import {panelOperator,panelSections} from '../src/lib/panel-access.ts';
test('employee tokens are credential-bound and immediately revoked by role, password or active status changes',()=>{
 const d=new DatabaseSync(':memory:');try{d.exec('CREATE TABLE employees(id TEXT,username TEXT,name TEXT,role TEXT,password_hash TEXT,is_active INTEGER)');const employee={id:'employee',username:'test.employee',name:'Çalışan',role:'waiter',password_hash:hashPassword('test12345'),is_active:1};d.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?)').run(employee.id,employee.username,employee.name,employee.role,employee.password_hash,1);const now=Date.now(),token=makeEmployeeSession(employee,now);
 assert.equal(employeeSession(d,token,now)?.role,'waiter');assert.equal(employeeSession(d,token+'x',now),null);assert.equal(employeeSession(d,token,now+12*3600000),null);d.prepare("UPDATE employees SET username='renamed'").run();assert.equal(employeeSession(d,token,now),null);d.prepare("UPDATE employees SET username='test.employee',role='cashier'").run();assert.equal(employeeSession(d,token,now),null);d.prepare("UPDATE employees SET role='waiter',is_active=0").run();assert.equal(employeeSession(d,token,now),null);d.prepare('UPDATE employees SET is_active=1,password_hash=?').run(hashPassword('new12345'));assert.equal(employeeSession(d,token,now),null);d.prepare("UPDATE employees SET role='kitchen'").run();assert.equal(employeeSession(d,makeEmployeeSession({...employee,role:'kitchen'},now),now),null);
 }finally{d.close();}
});
test('waiters can add table orders, change quantities or notes; financial, cancellation, merge, quick and cari commands are denied',()=>{
 const t={service_type:'table',linked_account_id:null,status:'open'} as Ticket;
 const allowed=[{action:'open_order',table:1,lines:[]},{action:'add',ticket_id:'id',version:1,lines:[]},{action:'note',ticket_id:'id',version:1,note:'Not'},{action:'quantity',ticket_id:'id',version:1,line_id:'line',quantity:2}] as PosCommand[];
 for(const c of allowed)assert.doesNotThrow(()=>assertOrderPermission('waiter',c,t));
 for(const action of ['open','open_account','open_quick','label','void','discount','move','pay','pay_items','refund','correct_payment','close']){const c={action} as PosCommand;assert.throws(()=>assertOrderPermission('waiter',c,t));assert.doesNotThrow(()=>assertOrderPermission('cashier',c,t));}
 assert.throws(()=>assertOrderPermission('waiter',{...allowed[1],quick:{service_type:'counter',account_name:'Kaçak'}} as PosCommand,t));assert.throws(()=>assertOrderPermission('waiter',allowed[1],{...t,linked_account_id:'account'}));assert.throws(()=>assertOrderPermission('waiter',allowed[1],{...t,service_type:'counter'}));assert.throws(()=>assertWaiterTicket({...t,status:'closed'}));assert.throws(()=>assertWaiterTicket({...t,linked_account_id:'account'}));assert.doesNotThrow(()=>assertWaiterTicket(t));assert.throws(()=>assertOrderPermission('waiter',allowed[3],{...t,linked_account_id:'account'}));assert.throws(()=>assertOrderPermission('waiter',allowed[3],{...t,service_type:'counter'}));
});

test('cashier gets operational pages, waiter gets tables only and source online roles are not expanded',()=>{
 assert.deepEqual(panelSections('waiter'),['pos']);
 assert.deepEqual(panelSections('cashier'),['onlineOrders','onlineReviews','pos','quick','pending','accounts','history','summary']);
 assert.deepEqual(panelSections('online'),['onlineOrders','onlineReviews']);
 for(const role of ['cashier','waiter'] as const){const op={id:'employee',username:'staff',name:'Staff',actor:'Staff',role,onlineAdmin:true,onlineUserId:'source-owner'};const effective=panelOperator(op)!;assert.equal(effective.role,role);assert.equal(effective.onlineAdmin,false);assert.equal(op.onlineAdmin,true);assert.equal(effective.onlineUserId,'source-owner');assert.ok(!panelSections(role).includes('settings'));assert.ok(!panelSections(role).includes('menu'));}
 assert.equal(panelOperator(null),null);
});
