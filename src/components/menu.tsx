'use client';
import { useEffect,useRef,useState } from 'react';
import { Bell,Check,ChevronDown,Grid2X2,Leaf,X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from '@/components/ui/sheet';
import { Brand } from '@/components/brand';
import { CampaignBanner } from '@/components/campaign-banner';
import { resolveCampaign } from '@/lib/campaign';
import { WaiterSheet } from '@/components/waiter-sheet';
import { MenuProductGrid } from '@/components/menu-product-grid';
import { money,thumbnail,type Category,type Item,type Settings } from '@/lib/types';

// Set to true when waiter calls are ready to be offered again.
const WAITER_CALL_ENABLED=false;

type Props={categories:Category[];settings:Settings;table:number;invalidTable:boolean};
const title=(name:string)=>name.toLocaleLowerCase('tr-TR').replace(/(^|[ &])\S/g,c=>c.toLocaleUpperCase('tr-TR'));
export default function Menu({categories,settings,table,invalidTable}:Props) {
 const [category,setCategory]=useState('');
 const [detail,setDetail]=useState<Item|null>(null);
 const [notice,setNotice]=useState(''),[waiterOpen,setWaiterOpen]=useState(false),[selectedTable,setSelectedTable]=useState(table);
 const noticeTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const offer=resolveCampaign(categories,settings.campaign);
 useEffect(()=>()=>clearTimeout(noticeTimer.current),[]);
 function toast(message:string){clearTimeout(noticeTimer.current);setNotice(message);noticeTimer.current=setTimeout(()=>setNotice(''),5000);}
 function scrollToCategory(id:string){document.getElementById('menu-category-'+id)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 function toggleCategory(id:string){setCategory(current=>current===id?'':id);if(category!==id)requestAnimationFrame(()=>scrollToCategory(id));}
 function openItem(item:Item){setDetail(item);}
 function waiter(){if(WAITER_CALL_ENABLED)setWaiterOpen(true);}
 return <div className="min-h-screen pb-36 md:pb-28">
  <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8 md:py-7"><Brand compact/>{selectedTable>0&&<span className="rounded-full bg-[#e9eee3] px-3 py-2 text-xs font-semibold">Masa {selectedTable}</span>}</header>
  {invalidTable&&<div className="mx-5 mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 md:mx-auto md:max-w-5xl">Masa bağlantınız geçersiz veya artık kullanımda değil. Garson çağırırken masa numaranızı seçebilirsiniz.</div>}
  <main className="mx-auto max-w-6xl md:px-8">
   <h1 className="sr-only">Natura Bistro Menü</h1>
   {offer&&<div className="mx-4 mb-5 md:mx-0"><CampaignBanner offer={offer}/></div>}
   <div className="space-y-3 px-4 pt-4 md:px-0" aria-label="Menü kategorileri">
     <div className="mb-1 flex items-center justify-between px-1"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8c907c]">MENÜ KATEGORİLERİ</p><span className="text-[10px] text-[#7d8375]">{categories.length} kategori</span></div>
     {categories.map(c=>{const open=category===c.id,items=c.items;return <section key={c.id} id={`menu-category-${c.id}`} className="scroll-mt-4 overflow-hidden rounded-2xl border border-[#e2e5d9] bg-white">
      <h2><button type="button" aria-expanded={open} aria-controls={`category-products-${c.id}`} onClick={()=>toggleCategory(c.id)} className={`flex min-h-24 w-full items-center gap-4 p-4 text-left transition-colors ${open?'bg-[#eaf0e2]':'bg-white hover:bg-[#f3f5ed]'}`}>
       {c.image_url?<img src={thumbnail(c.image_url)} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover"/>:<span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#eef2e7]"><Grid2X2 size={24}/></span>}
       <span className="min-w-0 flex-1"><span className="serif block break-words text-lg leading-tight md:text-xl">{title(c.name)}</span><span className="mt-2 block text-[11px] text-[#7d8375]">{items.length} lezzet</span></span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${open?'bg-[#305c3e] text-white':'bg-[#f0f3e9] text-[#527044]'}`}><ChevronDown size={18} aria-hidden="true" className={`transition-transform ${open?'rotate-180':''}`}/></span>
      </button></h2>
      <div id={`category-products-${c.id}`} role="region" aria-label={`${title(c.name)} ürünleri`} hidden={!open}>{open&&<div className="border-t border-[#e2e5d9] bg-[#fafbf6] p-3 md:p-5"><MenuProductGrid items={items} categories={categories} onOpenItem={openItem}/>{!items.length&&<p className="py-8 text-center text-sm text-muted-foreground">Bu kategoride şu anda gösterilecek ürün bulunmuyor.</p>}</div>}</div>
     </section>;})}
     {!categories.length&&<p className="py-12 text-center text-sm text-muted-foreground">Menümüz henüz hazırlanıyor.</p>}
   </div>
   <footer className="px-6 pb-2 pt-12 text-center"><Leaf size={19} className="mx-auto mb-3 text-[#9ca78d]"/><p className="serif text-lg text-[#66745d]">Afiyetle, Natura.</p>{settings.address&&<p className="mt-3 text-xs text-muted-foreground">{settings.address}</p>}{settings.hours&&<p className="mt-1 text-xs text-muted-foreground">{settings.hours}</p>}<p className="mx-auto mt-4 max-w-sm text-[10px] leading-4 text-[#8d9286]">Fiyatlar Türk lirasıdır. Gıda alerjiniz varsa sipariş öncesi ekibimize bilgi verin. Temsili görseller sunumdan farklılık gösterebilir.</p></footer>
  </main>
  <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[#e6e7dd] bg-[#f9f8f3]/95 px-4 pt-3 backdrop-blur-xl"><div className="mx-auto flex max-w-[1088px] gap-3"><button disabled={!WAITER_CALL_ENABLED} title={WAITER_CALL_ENABLED?undefined:'Garson çağırma şimdilik kullanılamıyor.'} onClick={waiter} className="flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-[#305c3e] px-4 text-sm font-semibold text-white shadow-[0_6px_20px_#305c3e22] disabled:cursor-not-allowed disabled:bg-[#e1e4dc] disabled:text-[#8a9181] disabled:shadow-none"><Bell size={18}/><span>Garson çağır</span>{selectedTable>0&&<span className="rounded-lg bg-white/15 px-2 py-1 text-xs">Masa {selectedTable}</span>}</button></div></div>
  {notice&&<div role="status" className="fixed inset-x-4 bottom-28 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-white p-4 text-sm shadow-xl"><Check size={18} className="shrink-0 text-[#3a7d44]"/>{notice}<button onClick={()=>setNotice('')} className="ml-auto h-8 w-8 shrink-0" aria-label="Bildirimi kapat"><X size={16}/></button></div>}
  <WaiterSheet open={WAITER_CALL_ENABLED&&waiterOpen} onOpenChange={setWaiterOpen} tableCount={settings.table_count} initialTable={selectedTable} onCalled={(number,message)=>{setSelectedTable(number);toast(message);}}/>
  <Sheet open={!!detail} onOpenChange={open=>!open&&setDetail(null)}><SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-xl gap-0 overflow-y-auto rounded-t-3xl p-0">{detail&&<><div className="relative h-56 bg-[#eeeee7] sm:h-72">{detail.image_url&&<img src={detail.image_url} width={1000} height={1000} alt={detail.name} className="h-full w-full object-cover"/>}{detail.image_generated&&<span className="absolute bottom-3 left-4 rounded-full bg-black/50 px-3 py-1 text-[10px] text-white">Yapay zekâ ile oluşturulmuş temsili görsel</span>}</div><div className="p-5"><SheetHeader className="p-0 text-left"><div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{title(categories.find(c=>c.id===detail.category_id)?.name||'')}</div><SheetTitle className="serif text-3xl">{detail.name}</SheetTitle><SheetDescription className="mt-2 leading-relaxed">{detail.description||'Ürün hakkında ayrıntılı bilgi için ekibimize danışabilirsiniz.'}</SheetDescription></SheetHeader>{detail.tags.length>0&&<div className="mt-4 flex flex-wrap gap-2">{detail.tags.map(t=><Badge variant="secondary" key={t}>{t}</Badge>)}</div>}<div className="mt-5 rounded-xl bg-[#f3f2eb] p-3 text-xs leading-5"><strong>Alerjen bilgisi</strong><p className="text-[#767e6e]">{detail.allergens_verified?(detail.allergens.length?detail.allergens.join(', '):'Bildirilen alerjen bulunmuyor. Çapraz bulaşma için ekibimize danışın.'):'Henüz doğrulanmadı. Alerjiniz varsa sipariş öncesi ekibimize danışın.'}</p></div>{detail.variants.length>0?<div className="mt-5"><h3 className="mb-3 text-sm font-semibold">Porsiyon / boy fiyatları</h3><dl className="divide-y rounded-xl border px-4">{detail.variants.map(v=><div key={v.name} className="flex min-h-12 items-center justify-between gap-3 py-3 text-sm"><dt>{v.name}</dt><dd className="font-bold">{money(v.price)}</dd></div>)}</dl></div>:<div className="mt-5 flex items-center justify-between gap-3"><span className="serif text-2xl font-bold">{money(detail.price)}</span>{detail.original_price&&<del className="text-sm text-muted-foreground">{money(detail.original_price)}</del>}</div>}{detail.sold_out&&<p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm font-semibold">Bu ürün şu anda tükendi.</p>}<div className="safe-bottom mt-6"><Button className="h-12 w-full rounded-xl" onClick={()=>setDetail(null)}>Menüye dön</Button></div></div></>}</SheetContent></Sheet>
 </div>;
}
