import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSession,validSession,tableKey,validTable,sameOrigin,hashPassword,verifyPasswordHash } from '../src/lib/security.ts';
process.env.SESSION_SECRET='test-only-secret-with-at-least-32-characters';
test('stored password hashes use unique salts and rotate session signatures',()=>{
 const password='a-new-test-password',first=hashPassword(password),second=hashPassword(password);
 assert.notEqual(first,second);assert.equal(first.includes(password),false);
 assert.equal(verifyPasswordHash(password,first),true);
 assert.equal(verifyPasswordHash('wrong',first),false);
 assert.equal(verifyPasswordHash(password,'invalid'),false);
 const now=Date.now(),token=makeSession(now,first),key=tableKey(1);
 assert.equal(validSession(token,now,first),true);assert.equal(validSession(token,now,second),false);
 assert.equal(validTable(1,key,35),true);
});
test('signed sessions reject tampering, expiration and the old fixed auth cookie',()=>{
 const now=Date.now(),token=makeSession(now);
 assert.equal(validSession(token,now),true);
 assert.equal(validSession(token+'x',now),false);
 assert.equal(validSession('true',now),false);
 assert.equal(validSession(undefined,now),false);
 assert.equal(validSession(token,now+12*60*60*1000+1),false);
 assert.equal(validSession(token+'.extra',now),false);
});
test('QR key is bound to table, current table range and session secret',()=>{
 const key=tableKey(35);assert.equal(validTable(35,key,35),true);assert.equal(validTable(34,key,35),false);assert.equal(validTable(35,key,30),false);assert.equal(validTable(0,tableKey(0),35),false);assert.equal(validTable(1.5,tableKey(1.5),35),false);
 const previous=process.env.SESSION_SECRET;process.env.SESSION_SECRET='a-different-test-secret-at-least-32-chars';assert.equal(validTable(35,key,35),false);process.env.SESSION_SECRET=previous;
});
test('password rotation revokes sessions without changing table QR keys',()=>{
 const before=process.env.ADMIN_PASSWORD;process.env.ADMIN_PASSWORD='old-test-password';const token=makeSession(),key=tableKey(1);
 process.env.ADMIN_PASSWORD='new-test-password';assert.equal(validSession(token),false);assert.equal(validTable(1,key,35),true);
 if(before===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=before;
});
test('mutations require an exact origin including port',()=>{
 process.env.APP_URL='https://natura.beyoglumutfagi.com';
 const req=(origin?:string)=>new Request('http://internal:3000/api/waiter',{headers:origin?{origin}:{}});
 assert.equal(sameOrigin(req('https://natura.beyoglumutfagi.com')),true);
 assert.equal(sameOrigin(req('https://evil.example')),false);
 assert.equal(sameOrigin(req('https://natura.beyoglumutfagi.com.evil.example')),false);
 assert.equal(sameOrigin(req()),false);
});
