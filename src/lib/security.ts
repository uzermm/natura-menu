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
function signSession(payload:string,credential:string){return sign(`session:${credential}:${payload}`);}
export function makeSession(now=Date.now(),credential=process.env.ADMIN_PASSWORD||'') {const payload=Buffer.from(JSON.stringify({exp:now+1000*60*60*12,nonce:randomBytes(16).toString('hex')})).toString('base64url');return `${payload}.${signSession(payload,credential)}`;}
export function validSession(token:string|undefined,now=Date.now(),credential=process.env.ADMIN_PASSWORD||'') {
 if(!token||token.length>1024)return false;
 const [payload,sig,...rest]=token.split('.');if(!payload||!sig||rest.length||!safeEqual(signSession(payload,credential),sig))return false;
 try {const data=JSON.parse(Buffer.from(payload,'base64url').toString());return typeof data.exp==='number'&&data.exp>now&&data.exp<=now+1000*60*60*12;}catch{return false;}
}
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${scryptSync(password,salt,32).toString('hex')}`;}
export function verifyPasswordHash(password:string,encoded:string){
 const match=/^scrypt:([a-f0-9]{32}):([a-f0-9]{64})$/.exec(encoded);
 return !!match&&safeEqual(scryptSync(password,match[1],32).toString('hex'),match[2]);
}
export function validPassword(password:string) {
 const expected=process.env.ADMIN_PASSWORD;
 if(!expected||expected.length<8||expected.startsWith('REPLACE_'))return false;
 const salt='natura-password-comparison';
 return timingSafeEqual(scryptSync(password,salt,32),scryptSync(expected,salt,32));
}
export function tableKey(table:number) {return sign(`table:${table}`);}
export function validTable(table:number,key:string,count:number){return Number.isInteger(table)&&table>=1&&table<=count&&safeEqual(tableKey(table),key);}
export function sameOrigin(req:Request) {
 const origin=req.headers.get('origin');if(!origin)return false;
 const expected=process.env.APP_URL||new URL(req.url).origin;
 try{const source=new URL(origin);const allowed=[expected,process.env.PANEL_URL,process.env.MENU_URL].filter(Boolean).map(value=>new URL(value!).origin);return allowed.includes(source.origin)&&(!process.env.PANEL_URL||source.host===(req.headers.get('host')||new URL(req.url).host));}catch{return false;}
}
