import { mkdirSync } from 'node:fs';
const password=process.env.ADMIN_PASSWORD||'',secret=process.env.SESSION_SECRET||'';
if(password.length<12||password.startsWith('REPLACE_'))throw new Error('Set ADMIN_PASSWORD to a unique password with at least 12 characters.');
if(secret.length<32||secret.startsWith('REPLACE_'))throw new Error('Set SESSION_SECRET to a unique random value with at least 32 characters.');
if(!process.env.APP_URL?.startsWith('https://'))throw new Error('Set APP_URL to your public HTTPS domain.');
mkdirSync(`${process.env.DATA_DIR||'/app/data'}/uploads`,{recursive:true});
await import('../server.js');
