import { cookies } from 'next/headers';
import { redirect,notFound } from 'next/navigation';
import { validSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { ticket,PosError } from '@/lib/pos-core';
import { paymentLabels,ticketLabel,serviceLabels } from '@/lib/pos-types';
import { ReceiptControls,type ReceiptFormat } from '@/components/receipt-controls';
export const dynamic='force-dynamic';
export const metadata={title:'Adisyon | Natura Bistro',robots:{index:false,follow:false}};
const price=(n:number)=>(n/100).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
export default async function ReceiptPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{format?:string;print?:string}>}){
 if(!validSession((await cookies()).get('natura_session')?.value))redirect('/admin/login');
 const {id}=await params,query=await searchParams;const format:ReceiptFormat=query.format==='a4'?'a4':query.format==='thermal'?'thermal':'auto';
 let t;try{t=ticket(db(),id);}catch(error){if(error instanceof PosError)notFound();throw error;}
 return <main className="p-4 print:p-0"><ReceiptControls format={format} autoPrint={query.print==='1'}/><article data-format={format} className="receipt mx-auto bg-white text-black" style={{width:format==='a4'?'210mm':'80mm',maxWidth:'100%',padding:format==='a4'?'12mm':'4mm',fontFamily:'Arial, sans-serif',fontSize:format==='a4'?'14px':'11px'}}>
  <h1 style={{fontSize:'23px',fontWeight:800,textAlign:'center',marginBottom:'9px'}}>Natura Bistro</h1>
  <h2 style={{border:'1px solid black',textAlign:'center',fontSize:'21px',fontWeight:800,padding:'3px'}}>{ticketLabel(t)}</h2>{t.service_type!=='table'&&<p style={{textAlign:'center',fontWeight:700,marginTop:'5px'}}>{serviceLabels[t.service_type]}</p>}
  <p style={{fontWeight:700,textAlign:'center',margin:'7px 0'}}>{new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'long',year:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit'})}</p>
  <p style={{borderTop:'1px dashed black',paddingTop:'5px',fontWeight:700}}>Adisyon No: {t.number}</p>
  <table style={{width:'100%',borderCollapse:'collapse',marginTop:'12px'}}><thead><tr style={{borderBottom:'1px dashed black'}}><th style={{textAlign:'left',paddingBottom:'5px'}}>ÜRÜN</th><th style={{textAlign:'right',paddingBottom:'5px',whiteSpace:'nowrap'}}>TUTAR (₺)</th></tr></thead><tbody>{t.lines.filter(l=>!l.voided_at).map(l=><tr key={l.id}><td style={{padding:'5px 5px 3px 0',verticalAlign:'top',fontWeight:700}}>{l.quantity}x {l.name}{l.variant&&` / ${l.variant}`}{l.note&&<small style={{display:'block',fontWeight:400,marginTop:'3px'}}>Not: {l.note}</small>}</td><td style={{textAlign:'right',whiteSpace:'nowrap',verticalAlign:'top',paddingTop:'5px',fontWeight:700}}>{price(l.quantity*l.unit_price)}</td></tr>)}</tbody></table>
  <div style={{borderTop:'3px double black',marginTop:'8px',paddingTop:'7px'}}>{t.discount>0&&<><p style={{display:'flex',justifyContent:'space-between'}}><span>Ara toplam</span><span>{price(t.subtotal)}</span></p><p style={{display:'flex',justifyContent:'space-between'}}><span>İndirim</span><span>−{price(t.discount)}</span></p></>}<p style={{display:'flex',justifyContent:'space-between',fontSize:'25px',fontWeight:900,margin:'4px 0'}}><span>Toplam:</span><span>{price(t.total)}</span></p></div>
  {t.payments.map(p=><p key={p.id} style={{display:'flex',justifyContent:'space-between',gap:'8px',marginTop:'4px'}}><span>{paymentLabels[p.method]}{p.account_name&&` / ${p.account_name}`}</span><strong>{price(p.amount)}</strong></p>)}
  {t.paid>0&&<p style={{display:'flex',justifyContent:'space-between',fontWeight:700,marginTop:'6px'}}><span>Kalan</span><span>{price(t.remaining)}</span></p>}{t.note&&<p style={{marginTop:'8px'}}>{t.service_type==='table'?'Masa notu':'Sipariş notu'}: {t.note}</p>}
  <p style={{marginTop:'12px',textAlign:'center'}}>Çalışan: Kasa</p><p style={{marginTop:'7px',textAlign:'center',fontWeight:800,fontSize:'13px'}}>BİZİ TERCİH ETTİĞİNİZ İÇİN TEŞEKKÜR EDERİZ!</p><p style={{marginTop:'8px',textAlign:'center',fontSize:'9px'}}>Adisyon / Hesap dökümü</p>
 </article><style>{`@media print{@page{size:${format==='a4'?'A4':format==='thermal'?'80mm 297mm':'auto'};margin:${format==='a4'?'12mm':'4mm'}}html,body{background:#fff!important;width:auto}body{margin:0}.receipt{width:100%!important;max-width:none!important;padding:0!important;margin:0!important;font-size:clamp(11px,2vw,15px)!important}.receipt tr{break-inside:avoid}.receipt thead{display:table-header-group}}`}</style></main>;
}
