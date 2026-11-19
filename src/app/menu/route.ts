import {menuOrigin} from '@/lib/app-hosts';
export async function GET(){return Response.redirect(new URL('/',menuOrigin()),307);}
