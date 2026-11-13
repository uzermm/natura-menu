import { money,thumbnail } from '@/lib/types';
import type { resolveCampaign } from '@/lib/campaign';

export function CampaignBanner({offer}:{offer:NonNullable<ReturnType<typeof resolveCampaign>>}) {
 return <section aria-label="Kampanya" className="relative grid min-h-44 grid-cols-[1.1fr_1fr] overflow-hidden rounded-3xl border border-[#e5ddc8] bg-[#f1ead8] sm:min-h-56 sm:grid-cols-2">
  <div className="relative z-10 flex min-w-0 flex-col items-start justify-center p-4 sm:p-7">
   <span className="mb-2 rounded-full bg-[#305c3e] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-white sm:text-[10px]">Kampanya</span>
   <h2 className="serif break-words text-xl leading-tight text-[#294531] sm:text-3xl">{offer.item.name}</h2>
   {offer.variant&&<p className="mt-1 text-xs text-[#6d775e]">{offer.variant}</p>}
   <div className="mt-3 flex flex-col items-start gap-0.5">
    <del aria-label="Menü fiyatı" className="text-xs text-[#7e806f] sm:text-sm">{money(offer.regularPrice)}</del>
    <strong aria-label="Kampanya fiyatı" className="text-3xl leading-tight tracking-tight text-[#305c3e] sm:text-5xl">{money(offer.campaignPrice)}</strong>
   </div>
  </div>
  <div className="relative min-h-full overflow-hidden bg-[#e6dfcf]">
   <img src={thumbnail(offer.item.image_url)} srcSet={`${thumbnail(offer.item.image_url)} 480w, ${offer.item.image_url} 1000w`} sizes="(max-width:639px) 45vw, 550px" width={1000} height={1000} alt={offer.item.name} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover"/>
   {offer.item.image_generated&&<span className="absolute bottom-2 right-2 rounded bg-black/45 px-1.5 py-1 text-[8px] text-white">Temsili görsel</span>}
  </div>
 </section>;
}
