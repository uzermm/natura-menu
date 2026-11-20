'use client';
import {useEffect,useRef} from 'react';
const loaders=new Map<symbol,{scope:string;load:()=>Promise<unknown>}>();
export function usePanelRefresh(scope:string,load:()=>Promise<unknown>){const latest=useRef(load);latest.current=load;useEffect(()=>{const id=Symbol(scope);loaders.set(id,{scope,load:()=>latest.current()});return()=>{loaders.delete(id);};},[scope]);}
export async function refreshPanel(scope:string){await Promise.all([...loaders.values()].filter(entry=>entry.scope===scope||scope==='settings'&&['users','system'].includes(entry.scope)).map(entry=>entry.load()));}
