import type {DatabaseSync} from 'node:sqlite';
export type UserRole='admin'|'cashier'|'waiter'|'kitchen';
export const userRoles:UserRole[]=['admin','cashier','waiter','kitchen'];
export function initUserAccess(d:DatabaseSync){d.exec("CREATE TABLE IF NOT EXISTS user_access(id TEXT PRIMARY KEY,role TEXT NOT NULL CHECK(role IN ('admin','cashier','waiter','kitchen')),name TEXT NOT NULL DEFAULT '')");}
export function userAccess(d:DatabaseSync,id:string,fallback:UserRole){
 if(!d.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_access'").get())return {role:fallback,name:''};
 const row=d.prepare('SELECT role,name FROM user_access WHERE id=?').get(id);
 return row&&userRoles.includes(row.role as UserRole)?{role:row.role as UserRole,name:String(row.name)}:{role:fallback,name:''};
}
export function setUserAccess(d:DatabaseSync,id:string,role:UserRole,name=''){d.prepare('INSERT INTO user_access(id,role,name) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET role=excluded.role,name=excluded.name').run(id,role,name);}
