import { money,thumbnail } from '@/lib/types';
import type { resolveCampaign } from '@/lib/campaign';
import { Sparkles } from 'lucide-react';

export function CampaignBanner({offer}:{offer:NonNullable<ReturnType<typeof resolveCampaign>>}) {
 const discount=Math.round((offer.regularPrice-offer.campaignPrice)/offer.regularPrice*100);
 return <section aria-label="Kampanya" className="relative isolate overflow-hidden rounded-3xl border border-[#b2c38e] bg-gradient-to-br from-[#254e37] via-[#193c2c] to-[#102d23] text-white shadow-[0_8px_24px_#193c2c20]">
  <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[24px] border-[#cfe48a]/[.06]"/>
  <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pb-5 pt-5 sm:gap-8 sm:px-7 sm:py-7">
   <div className="min-w-0">
    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#e5ed9c] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-[#203d29] sm:text-[10px]"><Sparkles size={12} aria-hidden="true"/>Natura fırsatı</span>
    <h2 className="serif break-words text-xl leading-tight text-[#fffdf1] sm:text-3xl">{offer.item.name}</h2>
    {offer.variant&&<p className="mt-1 text-xs text-[#d5dfc4]">{offer.variant}</p>}
    <div className="mt-3 flex flex-col items-start">
     <del aria-label="Menü fiyatı" className="text-sm text-[#c1cdb5] decoration-2">{money(offer.regularPrice)}</del>
     <strong aria-label="Kampanya fiyatı" className="break-all text-4xl leading-tight tracking-tight text-[#eef4ac] sm:text-5xl">{money(offer.campaignPrice)}</strong>
    </div>
   </div>
   <div className="relative mr-1 w-24 sm:mr-3 sm:w-36">
    <div className="aspect-square overflow-hidden rounded-full bg-[#fffdf4] p-1.5 ring-4 ring-white/15 shadow-[0_8px_24px_#00000025] sm:p-2 sm:ring-8">
     <img src={thumbnail(offer.item.image_url)} width={480} height={480} alt={offer.item.name} fetchPriority="high" className="h-full w-full rounded-full object-contain"/>
    </div>
    <span className="absolute -right-2 -top-5 rotate-6 rounded-xl bg-[#f3ce67] px-2.5 py-2 text-center text-[#233b27] shadow-md sm:-right-4 sm:-top-5 sm:px-4"><strong className="block text-xl font-black leading-none sm:text-3xl">{discount>0?`%${discount}`:'Özel'}</strong><span className="mt-1 block text-[8px] font-extrabold uppercase tracking-wider sm:text-[10px]">{discount>0?'İndirim':'Fiyat'}</span></span>
    {offer.item.image_generated&&<span className="mt-3 block text-center text-[8px] text-[#d2ddc5]">Temsili görsel</span>}
   </div>
  </div>
 </section>;
}
