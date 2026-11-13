import { db } from './db';
import { makeSession as signSession, validSession as checkSession, validPassword as checkBootstrapPassword, verifyPasswordHash } from './security';

function storedHash(){return db().prepare('SELECT password_hash FROM admin_credentials WHERE id=1').get()?.password_hash as string|undefined;}
function credential(){return storedHash()??process.env.ADMIN_PASSWORD??'';}
export function makeSession(){return signSession(Date.now(),credential());}
export function validSession(token:string|undefined){return checkSession(token,Date.now(),credential());}
export function validPassword(password:string){const hash=storedHash();return hash?verifyPasswordHash(password,hash):checkBootstrapPassword(password);}
