import { createHmac, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';
const DEV_SECRET=randomBytes(32).toString('hex');
export function sessionSecret() {
 const value=process.env.SESSION_SECRET;
 if(value&&value.length>=32&&!value.startsWith('REPLACE_'))return value;
 if(process.env.NODE_ENV==='production')throw new Error('SESSION_SECRET must be a unique random value with at least 32 characters.');
 return DEV_SECRET;
}
export function safeEqual(a:string,b:string) {const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
function sign(value:string){return createHmac('sha256',sessionSecret()).update(value).digest('base64url');}
function signSession(payload:string){return sign(`session:${process.env.ADMIN_PASSWORD||''}:${payload}`);}
export function makeSession(now=Date.now()) {const payload=Buffer.from(JSON.stringify({exp:now+1000*60*60*12,nonce:randomBytes(16).toString('hex')})).toString('base64url');return `${payload}.${signSession(payload)}`;}
export function validSession(token:string|undefined,now=Date.now()) {
 if(!token||token.length>1024)return false;
 const [payload,sig,...rest]=token.split('.');if(!payload||!sig||rest.length||!safeEqual(signSession(payload),sig))return false;
 try {const data=JSON.parse(Buffer.from(payload,'base64url').toString());return typeof data.exp==='number'&&data.exp>now&&data.exp<=now+1000*60*60*12;}catch{return false;}
}
export function validPassword(password:string) {
 const expected=process.env.ADMIN_PASSWORD;
 if(!expected||expected.length<12||expected.startsWith('REPLACE_'))return false;
 const salt='natura-password-comparison';
 return timingSafeEqual(scryptSync(password,salt,32),scryptSync(expected,salt,32));
}
export function tableKey(table:number) {return sign(`table:${table}`);}
export function validTable(table:number,key:string,count:number){return Number.isInteger(table)&&table>=1&&table<=count&&safeEqual(tableKey(table),key);}
export function sameOrigin(req:Request) {
 const origin=req.headers.get('origin');if(!origin)return false;
 const expected=process.env.APP_URL||new URL(req.url).origin;
 try{return new URL(origin).origin===new URL(expected).origin;}catch{return false;}
}
