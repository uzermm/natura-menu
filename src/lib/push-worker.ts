import {db} from './db';
import {deliverPush} from './push-delivery';
import {recoverPushEvents} from './push-store';
const state=globalThis as typeof globalThis&{naturaPushFlush?:Promise<void>;naturaPushAgain?:boolean};
export async function flushPush(){if(state.naturaPushFlush){state.naturaPushAgain=true;return state.naturaPushFlush;}const task=(async()=>{const d=db();for(let pass=0;pass<3;pass++){state.naturaPushAgain=false;recoverPushEvents(d);await deliverPush(d);if(!state.naturaPushAgain)break;}})();state.naturaPushFlush=task;try{await task;}catch{console.error('Bildirim kuyruğu daha sonra yeniden denenecek.');}finally{if(state.naturaPushFlush===task)state.naturaPushFlush=undefined;}}
