type Event={at:string;kind:string;duration_ms?:number;status?:number};
const state=globalThis as typeof globalThis&{naturaDiagnostics?:{counts:Record<string,number>;recent:Event[]}};
const data=state.naturaDiagnostics??={counts:{},recent:[]};
export function recordDiagnostic(kind:string,detail:{duration_ms?:number;status?:number}={}){data.counts[kind]=(data.counts[kind]||0)+1;if(kind.includes('error')||kind.includes('retry')||Number(detail.duration_ms)>250){const e={at:new Date().toISOString(),kind,...detail};data.recent.push(e);if(data.recent.length>30)data.recent.shift();console.warn(JSON.stringify(e));}}
export function diagnostics(){return {counts:{...data.counts},recent:[...data.recent]};}
