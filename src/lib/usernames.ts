import type {DatabaseSync} from 'node:sqlite';
import {z} from 'zod';
import {PosError} from './pos-error.ts';
export const INITIAL_ADMIN_USERNAME='beyoglumutfagi@gmail.com';
export const usernameSchema=z.string().trim().toLowerCase().min(3).max(120).refine(v=>/^[a-z0-9._-]{3,40}$/.test(v)||z.email().safeParse(v).success,'Geçerli bir kullanıcı adı veya e-posta adresi girin.');
export function initAdminIdentity(d:DatabaseSync){
 d.exec('CREATE TABLE IF NOT EXISTS admin_identity(id INTEGER PRIMARY KEY CHECK(id=1),username TEXT NOT NULL UNIQUE)');
 if(!d.prepare('PRAGMA table_info(admin_identity)').all().some(c=>c.name==='login_version'))d.exec('ALTER TABLE admin_identity ADD COLUMN login_version INTEGER NOT NULL DEFAULT 0');
 if(!d.prepare('SELECT 1 FROM admin_identity WHERE id=1').get())d.prepare('INSERT INTO admin_identity(id,username,login_version) VALUES(1,?,1)').run(INITIAL_ADMIN_USERNAME);
 // Apply the owner-requested login change once; later edits are preserved.
 if(Number(d.prepare('SELECT login_version FROM admin_identity WHERE id=1').get()!.login_version)<1)d.prepare('UPDATE admin_identity SET username=?,login_version=1 WHERE id=1').run(INITIAL_ADMIN_USERNAME);
}
export function adminUsername(d:DatabaseSync){return String(d.prepare('SELECT username FROM admin_identity WHERE id=1').get()!.username);}
export function assertUsernameAvailable(d:DatabaseSync,username:string,employeeId?:string){if(adminUsername(d)===username||d.prepare('SELECT 1 FROM employees WHERE username=? COLLATE NOCASE AND id!=?').get(username,employeeId||''))throw new PosError('Bu kullanıcı adı kullanılıyor.');}
export function renameAdmin(d:DatabaseSync,username:string){const value=usernameSchema.parse(username);if(d.prepare('SELECT 1 FROM employees WHERE username=? COLLATE NOCASE').get(value))throw new PosError('Bu kullanıcı adı kullanılıyor.');d.prepare('UPDATE admin_identity SET username=? WHERE id=1').run(value);return value;}
