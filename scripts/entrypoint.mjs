import { mkdirSync } from 'node:fs';
if(process.env.REQUIRE_EXISTING_DATA==='1'){
 const {auditUnifiedData}=await import('./check-unified-data.mjs');
 const checked=auditUnifiedData(process.env.DATA_DIR||'/app/data',process.env.ONLINE_DATA_DIR||'/app/online-data');
 if(checked.usernameCollisions.length)console.warn('İki kaynakta aynı kullanıcı adı var. Her alanın yetkisi kendi kaydından ve mevcut parolasından doğrulanır.');
 console.log('Mevcut kafe, cari ve sipariş veritabanları doğrulandı.');
}
const password=process.env.ADMIN_PASSWORD||'',secret=process.env.SESSION_SECRET||'';
if(password.length<8||password.startsWith('REPLACE_'))throw new Error('Set ADMIN_PASSWORD to a unique password with at least 8 characters.');
if(secret.length<32||secret.startsWith('REPLACE_'))throw new Error('Set SESSION_SECRET to a unique random value with at least 32 characters.');
if(!process.env.APP_URL?.startsWith('https://'))throw new Error('Set APP_URL to your public HTTPS domain.');
mkdirSync(`${process.env.DATA_DIR||'/app/data'}/uploads`,{recursive:true});
await import('../online/runtime.mjs');
await import('../server.js');
