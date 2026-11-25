'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { CampaignBanner } from './campaign-banner';
import { resolveCampaign } from '@/lib/campaign';
import { money,type Category,type Settings } from '@/lib/types';

export default function SettingsForm({settings,categories,onSave,onReload}:{settings:Settings;categories:Category[];onSave:(s:Settings)=>Promise<void>;onReload:()=>Promise<void>}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [enabled,setEnabled]=useState(!!settings.campaign);
 const [itemId,setItemId]=useState(settings.campaign?.item_id||'');
 const [variant,setVariant]=useState(settings.campaign?.variant||'');
 const [campaignTitle,setCampaignTitle]=useState(settings.campaign?.title||'Natura fırsatı');
 const [campaignPrice,setCampaignPrice]=useState(settings.campaign?String(settings.campaign.price/100):'');
 const selected=categories.flatMap(c=>c.items).find(i=>i.id===itemId);
 const regularPrice=selected?.variants.find(v=>v.name===variant)?.price??selected?.price;
 const price=Math.round(Number(campaignPrice.replace(',','.'))*100);
 const offer=enabled?resolveCampaign(categories,{item_id:itemId,variant,price,title:campaignTitle}):null;
 return <form className="max-w-2xl space-y-6" onSubmit={async e=>{
  e.preventDefault();const fd=new FormData(e.currentTarget);setBusy(true);setError('');
  try{await onSave({version:settings.version,table_count:Number(fd.get('table_count')),address:String(fd.get('address')),hours:String(fd.get('hours')),campaign:enabled?{item_id:itemId,variant,price,title:campaignTitle}:null});}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }}>
  <section className="space-y-4 rounded-xl border bg-white p-4" aria-labelledby="campaign-settings-title">
   <div><h2 id="campaign-settings-title" className="text-[17px] font-bold">Kampanya banner’ı</h2></div>
   <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-3 text-sm"><span>Banner menüde görünsün</span><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Banner menüde görünsün"/></label>
   {enabled&&<>
    <div className="space-y-2"><Label htmlFor="campaign-title">Banner başlığı</Label><Input id="campaign-title" required maxLength={60} value={campaignTitle} onChange={e=>setCampaignTitle(e.target.value)} placeholder="Örn. Ayın fırsatı, Haftanın fırsatı"/></div>
    <div className="space-y-2"><Label htmlFor="campaign-item">Kampanyalı ürün</Label><select id="campaign-item" required value={itemId} onChange={e=>{setItemId(e.target.value);const item=categories.flatMap(c=>c.items).find(i=>i.id===e.target.value);setVariant(item?.variants[0]?.name||'');setCampaignPrice('');}} className="min-h-11 w-full max-w-full rounded-xl border bg-white px-3 text-sm"><option value="">Menüden bir ürün seçin</option>{categories.filter(c=>c.is_active).map(c=><optgroup key={c.id} label={c.name}>{c.items.filter(i=>i.is_active).map(i=><option key={i.id} value={i.id} disabled={i.sold_out||!i.image_url}>{i.name}{i.sold_out?' — Tükendi':!i.image_url?' — Görsel gerekli':''}</option>)}</optgroup>)}</select></div>
    {!!selected?.variants.length&&<div className="space-y-2"><Label htmlFor="campaign-variant">Porsiyon / boy</Label><select id="campaign-variant" required value={variant} onChange={e=>setVariant(e.target.value)} className="min-h-11 w-full rounded-xl border bg-white px-3 text-sm"><option value="" disabled>Porsiyon seçin</option>{selected.variants.map(v=><option key={v.name} value={v.name}>{v.name} — {money(v.price)}</option>)}</select></div>}
    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="campaign-regular">Menü fiyatı</Label><Input id="campaign-regular" value={regularPrice===undefined?'':money(regularPrice)} readOnly className="h-11 bg-muted" placeholder="Otomatik alınır"/></div><div className="space-y-2"><Label htmlFor="campaign-price">Kampanya fiyatı (₺)</Label><Input id="campaign-price" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={campaignPrice} onChange={e=>setCampaignPrice(e.target.value)} placeholder="Örn. 90" className="h-11"/></div></div>

    {offer?<div><p className="mb-3 text-xs font-semibold text-muted-foreground">Menüdeki görünüm</p><CampaignBanner offer={offer}/></div>:itemId&&campaignPrice&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Önizleme hazır değil.</p>}
   </>}
  </section>
  <section className="space-y-4 rounded-xl border bg-white p-4" aria-label="İşletme bilgileri">
   <div className="space-y-2"><Label htmlFor="table-count">Masa sayısı</Label><Input id="table-count" name="table_count" type="number" min={1} max={200} defaultValue={settings.table_count} required/></div>
   <div className="space-y-2"><Label htmlFor="address">Adres</Label><Textarea id="address" name="address" defaultValue={settings.address} maxLength={300}/></div>
   <div className="space-y-2"><Label htmlFor="hours">Çalışma saatleri</Label><Input id="hours" name="hours" defaultValue={settings.hours} maxLength={160} placeholder="Örn. Her gün 09.00–23.00"/></div>
  </section>
  {error&&<Button type="button" variant="outline" onClick={()=>void onReload()}>Güncel ayarları yükle</Button>}{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <Button disabled={busy} className="h-12 w-full rounded-xl">{busy?'Kaydediliyor…':'Ayarları kaydet'}</Button>
 </form>;
}
