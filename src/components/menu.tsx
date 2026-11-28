'use client';
import { useState } from 'react';
import { ChevronDown,Grid2X2,Leaf } from 'lucide-react';
import { Brand } from '@/components/brand';
import { CampaignBanner } from '@/components/campaign-banner';
import { saleCategories,resolveCampaign } from '@/lib/campaign';
import { MenuProductGrid } from '@/components/menu-product-grid';
import { thumbnail,type Category,type Settings } from '@/lib/types';


type Props={categories:Category[];settings:Settings;table:number;invalidTable:boolean};
const title=(name:string)=>name.toLocaleLowerCase('tr-TR').replace(/(^|[ &])\S/g,c=>c.toLocaleUpperCase('tr-TR'));
export default function Menu({categories,settings,table}:Props) {
 const [category,setCategory]=useState('');
 const offer=resolveCampaign(categories,settings.campaign),sale=saleCategories(categories,settings.campaign);
 function scrollToCategory(id:string){document.getElementById('menu-category-'+id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 function toggleCategory(id:string){setCategory(current=>current===id?'':id);if(category!==id)requestAnimationFrame(()=>scrollToCategory(id));}
 return <div className="min-h-screen pb-8">
  <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8 md:py-7"><Brand compact/>{table>0&&<span className="rounded-full bg-[#e9eee3] px-3 py-2 text-xs font-semibold">Masa {table}</span>}</header>
  <main className="mx-auto max-w-6xl md:px-8">
   <h1 className="sr-only">Natura Bistro Menü</h1>
   {offer&&<div className="mx-4 mb-5 md:mx-0"><CampaignBanner offer={offer}/></div>}
   <div className="space-y-2 px-4 pt-3 md:space-y-3 md:px-0" aria-label="Menü kategorileri">
     <div className="mb-1 flex items-center justify-between px-1"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8c907c]">MENÜ KATEGORİLERİ</p><span className="text-xs text-[#596650]">{categories.length} kategori</span></div>
     {categories.map(c=>{const open=category===c.id,items=sale.find(row=>row.id===c.id)!.items;return <section key={c.id} id={`menu-category-${c.id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-[#e2e5d9] bg-white">
      <h2><button type="button" aria-expanded={open} aria-controls={`category-products-${c.id}`} onClick={()=>toggleCategory(c.id)} className={`flex min-h-[68px] w-full items-center gap-3 p-3 text-left md:min-h-20 md:p-4 transition-colors ${open?'bg-[#eaf0e2]':'bg-white hover:bg-[#f3f5ed]'}`}>
       {c.image_url?<img src={thumbnail(c.image_url)} alt="" width={64} height={64} loading="lazy" className="h-11 w-11 shrink-0 md:h-14 md:w-14 rounded-xl object-cover"/>:<span className="flex h-11 w-11 shrink-0 md:h-14 md:w-14 items-center justify-center rounded-xl bg-[#eef2e7]"><Grid2X2 size={24}/></span>}
       <span className="min-w-0 flex-1"><span className="serif block break-words text-base leading-snug md:text-lg">{title(c.name)}</span><span className="mt-1 block text-xs text-[#596650]">{items.length} lezzet</span></span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${open?'bg-[#305c3e] text-white':'bg-[#f0f3e9] text-[#527044]'}`}><ChevronDown size={18} aria-hidden="true" className={`transition-transform ${open?'rotate-180':''}`}/></span>
      </button></h2>
      <div id={`category-products-${c.id}`} role="region" aria-label={`${title(c.name)} ürünleri`} hidden={!open}>{open&&<div className="border-t border-[#e2e5d9] bg-[#fafbf6] p-3 md:p-5"><MenuProductGrid items={items} categories={categories}/>{!items.length&&<p className="py-8 text-center text-sm text-muted-foreground">Bu kategoride şu anda gösterilecek ürün bulunmuyor.</p>}</div>}</div>
     </section>;})}
     {!categories.length&&<p className="py-12 text-center text-sm text-muted-foreground">Menümüz henüz hazırlanıyor.</p>}
   </div>
   <footer className="px-6 pb-2 pt-12 text-center"><Leaf size={19} className="mx-auto mb-3 text-[#9ca78d]"/><p className="serif text-lg text-[#66745d]">Afiyetle, Natura.</p>{settings.address&&<p className="mt-3 text-xs text-muted-foreground">{settings.address}</p>}{settings.hours&&<p className="mt-1 text-xs text-muted-foreground">{settings.hours}</p>}<p className="mx-auto mt-4 max-w-sm text-[10px] leading-4 text-[#8d9286]">Fiyatlar Türk lirasıdır. Gıda alerjiniz varsa sipariş öncesi ekibimize bilgi verin. Temsili görseller sunumdan farklılık gösterebilir.</p></footer>
  </main>
 </div>;
}
