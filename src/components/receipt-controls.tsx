'use client';
import { useEffect,useRef } from 'react';
import { Button } from './ui/button';
export type ReceiptFormat='auto'|'a4'|'thermal';
export function ReceiptControls({format,autoPrint}:{format:ReceiptFormat;autoPrint:boolean}){
 const started=useRef(false),ready=useRef(false);
 useEffect(()=>{try{const saved=localStorage.getItem('natura-receipt-format');if(!new URL(location.href).searchParams.has('format')&&(saved==='a4'||saved==='thermal')){const url=new URL(location.href);url.searchParams.set('format',saved);location.replace(url);return;}}catch{}ready.current=true;},[]);
 async function print(){
  await document.fonts.ready;
  if(format==='thermal'){
   const receipt=document.querySelector<HTMLElement>('.receipt');
   if(receipt){const height=Math.ceil(receipt.scrollHeight*25.4/96+8);let style=document.getElementById('receipt-page-size');if(!style){style=document.createElement('style');style.id='receipt-page-size';document.body.appendChild(style);}style.textContent=`@media print{@page{size:80mm ${Math.max(60,height)}mm;margin:4mm}}`;}
  }
  window.print();
 }
 useEffect(()=>{if(!autoPrint||started.current||!ready.current)return;let cancelled=false;void document.fonts.ready.then(()=>{if(!cancelled){started.current=true;void print();}});return()=>{cancelled=true;};},[autoPrint,format]);
 return <div className="no-print mx-auto mb-6 max-w-md space-y-3"><label className="block text-sm font-semibold">Kağıt düzeni<select aria-label="Kağıt düzeni" value={format} onChange={event=>{try{localStorage.setItem('natura-receipt-format',event.target.value);}catch{}const url=new URL(location.href);url.searchParams.set('format',event.target.value);url.searchParams.delete('print');location.replace(url);}} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3 text-sm"><option value="auto">Tarayıcı kâğıt ayarı</option><option value="a4">A4</option><option value="thermal">Possify · 80 mm</option></select></label><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={()=>{if(new URL(location.href).searchParams.get('embedded')==='1')parent.postMessage({type:'receipt:close'},location.origin);else window.close();}}>Kapat</Button><Button className="flex-1" onClick={()=>print()}>Yazdır</Button></div></div>;
}
