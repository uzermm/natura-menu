export function createOrderNotifier() {
 const seen=new Set();const readyAccounts=new Set();let initialized=false;
 return (state,now=Date.now())=>{
  const fresh=[];
  for(const o of state.orders){
   if(initialized&&readyAccounts.has(o.accountId)&&!seen.has(o.id)&&!o.test&&['Created','Picking','Invoiced','Shipped'].includes(o.status)&&Number(o.createdAt)>now-10*60000&&Number(o.createdAt)<=now+60000)fresh.push(o);
   seen.add(o.id);
  }
  for(const a of state.accounts)if(a.status?.state==='ok')readyAccounts.add(a.id);
  initialized=true;return fresh;
 };
}
const bells = new WeakMap();
export async function playOrderBell(context) {
 let bell = bells.get(context);
 if (!bell) {
  bell = {buffer:null,playing:false};
  bells.set(context,bell);
 }
 if (bell.playing || context.state !== 'running') return;
 bell.playing = true;
 try {
  if (!bell.buffer) {
   const response = await fetch('/order-bell.wav');
   if (!response.ok) throw Error('Sipariş zili yüklenemedi.');
   bell.buffer = await context.decodeAudioData(await response.arrayBuffer());
  }
  if (context.state !== 'running') {
   bell.playing = false;
   return;
  }
  const source = context.createBufferSource();
  source.buffer = bell.buffer;
  source.connect(context.destination);
  source.onended = () => {
   source.disconnect();
   bell.playing = false;
  };
  source.start();
 } catch (error) {
  bell.playing = false;
  throw error;
 }
}

// Preference and browser readiness are separate: autoplay may require a gesture.
export function createSoundController({createContext=()=>new AudioContext(),onChange=()=>{}}={}){
 let context=null,enabled=true;
 const ready=()=>enabled&&context?.state==='running';
 function prime(){
  if(!enabled)return Promise.resolve(false);
  try{if(!context){context=createContext();context.onstatechange=()=>onChange();}
   const pending=context.state==='running'?Promise.resolve():context.resume();onChange();
   return Promise.resolve(pending).then(()=>{onChange();return !!ready();},()=>{onChange();return false;});
  }catch{onChange();return Promise.resolve(false);}
 }
 return {get context(){return context;},get enabled(){return enabled;},get ready(){return !!ready();},prime,
  enable(){enabled=true;return prime();},
  disable(){enabled=false;try{Promise.resolve(context?.suspend()).catch(()=>{});}catch{}onChange();}
 };
}
