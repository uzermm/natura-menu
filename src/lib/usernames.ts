import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {PosError} from './pos-error.ts';
export const usernameSchema=z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/,'Kullanıcı adı 3–40 karakter olmalı; küçük harf, rakam, nokta, tire veya alt çizgi kullanın.');
export function initAdminIdentity(d:DatabaseSync){d.exec('CREATE TABLE IF NOT EXISTS admin_identity(id INTEGER PRIMARY KEY CHECK(id=1),username TEXT NOT NULL UNIQUE)');if(!d.prepare('SELECT 1 FROM admin_identity WHERE id=1').get()){let username='admin',i=1;while(d.prepare('SELECT 1 FROM employees WHERE username=? COLLATE NOCASE').get(username))username='admin'+i++;d.prepare('INSERT INTO admin_identity VALUES(1,?)').run(username);}}
export function adminUsername(d:DatabaseSync){return String(d.prepare('SELECT username FROM admin_identity WHERE id=1').get()!.username);}
export function assertUsernameAvailable(d:DatabaseSync,username:string,employeeId?:string){if(adminUsername(d)===username||d.prepare('SELECT 1 FROM employees WHERE username=? COLLATE NOCASE AND id!=?').get(username,employeeId||''))throw new PosError('Bu kullanıcı adı kullanılıyor.');}
export function renameAdmin(d:DatabaseSync,username:string){const value=usernameSchema.parse(username);if(d.prepare('SELECT 1 FROM employees WHERE username=? COLLATE NOCASE').get(value))throw new PosError('Bu kullanıcı adı kullanılıyor.');d.prepare('UPDATE admin_identity SET username=? WHERE id=1').run(value);return value;}
