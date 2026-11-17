'use client';
import {useRef,useState} from 'react';
import {api} from '@/lib/client';
import {clearDraft} from '@/lib/order-draft';
import {money} from '@/lib/types';
import {cashBreakdownSchema,cashTotal,DEFAULT_OPENING_BREAKDOWN,type CashBreakdown} from '@/lib/cash-breakdown';
import {paymentLabels,type PosSummary} from '@/lib/pos-types';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Textarea} from './ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';

type Summary=PosSummary['today'];
type Tool='opening'|'opening_preset'|'in'|'out'|'close';
type Preset={breakdown:CashBreakdown;version:number};
type Preview={day:Summary;revision:string;open_count:number;pending_count:number;kept_count:number;delete_count:number;opening_preset:Preset};
const clone=(rows:CashBreakdown)=>rows.map(r=>({...r}));

export function PosDay({summary:s,onChange}:{summary:Summary;onChange:()=>Promise<void>}){
 const [tool,setTool]=useState<Tool|null>(null),[preview,setPreview]=useState<Preview|null>(null);
 const [amount,setAmount]=useState(''),[note,setNote]=useState(''),[confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [breakdown,setBreakdown]=useState<CashBreakdown>(()=>clone(DEFAULT_OPENING_BREAKDOWN));
 const [preset,setPreset]=useState<Preset>({breakdown:clone(DEFAULT_OPENING_BREAKDOWN),version:1}),[savePreset,setSavePreset]=useState(false);
 const [contextDay,setContextDay]=useState(s.day_id),[openingVersion,setOpeningVersion]=useState(s.opening_version??0),[previousOpening,setPreviousOpening]=useState<number|null>(s.opening_cash);
 const attempt=useRef<{payload:Record<string,unknown>;id:string}|null>(null);
 const counted=tool==='opening'||tool==='opening_preset',controlsDisabled=busy||locked;
 const cents=counted?cashTotal(breakdown):Math.round(Number(amount.replace(',','.'))*100);
 const validCounts=cashBreakdownSchema.safeParse(breakdown).success,difference=preview?cents-preview.day.expected_cash:0;
 const correction=tool==='opening'&&previousOpening!==null&&cents!==previousOpening;
 const title=tool==='close'?'Gün kapat':tool==='opening_preset'?'Açılış dökümünü düzenle':tool==='opening'?(previousOpening===null?'Açılış kasası':'Açılış kasasını düzenle'):tool==='in'?'Kasa girişi':'Kasa çıkışı';

 async function start(kind:Tool){
  if(busy)return;setError('');setNotice('');setNote('');setConfirm('');setAmount('');setTool(kind);setPreview(null);setLocked(false);attempt.current=null;setSavePreset(false);setContextDay(s.day_id);setPreviousOpening(s.opening_cash);setOpeningVersion(s.opening_version??0);
  if(kind==='in'||kind==='out')return;
  setBusy(true);try{
   const p=await api<Preview>('/api/pos/day',undefined,'GET');setPreview(p);setContextDay(p.day.day_id);setPreviousOpening(p.day.opening_cash);setOpeningVersion(p.day.opening_version??0);setPreset(p.opening_preset);
   if(kind==='close')setAmount(String(p.day.expected_cash/100));
   else setBreakdown(clone(kind==='opening'&&p.day.opening_breakdown?p.day.opening_breakdown:p.opening_preset.breakdown));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');try{
   const payload:Record<string,unknown>=tool==='close'?{action:'close',day_id:preview!.day.day_id,revision:preview!.revision,counted_cash:cents,note,confirm}
    :tool==='opening_preset'?{action:'opening_preset',day_id:contextDay,breakdown,preset_version:preset.version}
    :tool==='opening'?{action:'opening',day_id:contextDay,amount:cents,note,breakdown,opening_version:openingVersion,save_preset:savePreset,...(savePreset?{preset_version:preset.version}:{})}
    :{action:tool,day_id:contextDay,amount:cents,note};
   const current=attempt.current??{payload,id:crypto.randomUUID()};attempt.current=current;setLocked(true);
   await api('/api/pos/day',{...current.payload,request_id:current.id});if(tool==='close')clearDraft();await onChange();attempt.current=null;setLocked(false);
   setNotice(tool==='close'?'Gün kapatıldı. Cari kayıtları korundu; yeni günün kasası sıfırlandı.':tool==='opening_preset'?'Açılış dökümü kaydedildi. Sonraki günlerde bu dağılım hazır gelecek.':'Kasa işlemi kaydedildi.');setTool(null);
  }catch(e){const error=e as Error&{status?:number};setError(error.message);if(error.status&&error.status>=400&&error.status<500){attempt.current=null;setLocked(false);}}finally{setBusy(false);}
 }

 return <section className="space-y-4">
  {error&&!tool&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm">{notice}</p>}
  <p className="text-xs text-muted-foreground">Açık gün: {new Date(s.opened_at).toLocaleString('tr-TR')} · Gün kapatılana kadar tahsilatlar bu dönemde birikir.</p>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(['cash','card','meal_card','account'] as const).map(method=><div key={method} className="rounded-xl border bg-white p-4"><p className="text-xs text-muted-foreground">{method==='account'?'Net cariye aktarılan':paymentLabels[method]}</p><strong className="mt-2 block text-xl">{money(s[method])}</strong></div>)}</div>
  <dl className="space-y-2 rounded-xl border bg-white p-4 text-sm">{[['Açılış nakdi',s.opening_cash||0],['Kasa girişi',s.cash_in],['Kasa çıkışı',s.cash_out],['İade toplamı',s.refunds],['İndirim',s.discount],['Kasada beklenen nakit',s.expected_cash]].map(([label,value])=><div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-bold">{money(Number(value))}</dd></div>)}<div className="flex justify-between"><dt>Kapanan adisyon</dt><dd>{s.closed_count}</dd></div></dl>
  {!!s.opening_breakdown?.length&&<div aria-label="Kaydedilen açılış dökümü" className="flex flex-wrap gap-2">{s.opening_breakdown.filter(r=>r.quantity>0).map(r=><span key={r.value} className="rounded-lg border bg-white px-3 py-2 text-xs">{r.quantity} adet × {money(r.value)}</span>)}</div>}
  <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>start('opening')}>{s.opening_cash===null?'Açılış kasası':'Açılış kasasını düzenle'}</Button><Button variant="outline" onClick={()=>start('opening_preset')}>Açılış dökümünü düzenle</Button><Button variant="outline" onClick={()=>start('in')}>Kasa girişi</Button><Button variant="outline" onClick={()=>start('out')}>Kasa çıkışı</Button><Button onClick={()=>start('close')}>Gün kapat</Button><Button variant="outline" asChild><a href="/api/pos/day?export=cari" download>Cari verilerini indir</a></Button></div>
  <p className="text-xs text-muted-foreground">Gün kapatmada cari hesaplar ve onlara bağlı fişler korunur. Diğer satış ve günlük kasa kayıtları kalıcı silinir. Otomatik tam sistem yedeği veya zamanlanmış görev çalışmaz.</p>
  <Dialog open={!!tool} onOpenChange={v=>!busy&&!locked&&!v&&setTool(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{tool==='close'?'Silinecek kayıtları ve kasa sayımını kontrol edin.':counted?'Kupür adetlerini düzenleyin; toplam otomatik hesaplanır.':'Tutarı ve açıklamayı kaydedin.'}</DialogDescription></DialogHeader>
   {tool!=='in'&&tool!=='out'&&!preview?<p>{busy?'Kasa bilgileri yükleniyor…':'Bilgiler yüklenemedi.'}</p>:<form className="space-y-4" onSubmit={submit}>
    {tool==='close'&&preview&&<><div className="space-y-1 rounded-xl bg-red-50 p-3 text-xs text-red-900"><p>Silinecek adisyon: {preview.delete_count}</p><p>Korunacak cari bağlantılı adisyon: {preview.kept_count}</p><p>Açık hesap: {preview.open_count} · Bekleyen sipariş: {preview.pending_count}</p><p className="pt-2 font-bold">Menü, ayarlar, çalışanlar ve cari hareketleri korunur. Diğer satış/kasa kayıtları geri alınamaz biçimde silinir.</p></div><p className="text-sm">Beklenen nakit: <strong>{money(preview.day.expected_cash)}</strong></p></>}
    {counted?<fieldset disabled={controlsDisabled} className="min-w-0 space-y-2"><legend className="mb-2 text-sm font-bold">Para dökümü</legend><div className="grid grid-cols-[minmax(0,1fr)_72px_80px] gap-2 text-[11px] text-muted-foreground"><span>Kupür</span><span>Adet</span><span className="text-right">Tutar</span></div>{breakdown.map((row,index)=><div key={row.value} className="grid grid-cols-[minmax(0,1fr)_72px_80px] items-center gap-2 rounded-xl border p-2 text-sm"><Label htmlFor={`cash-count-${row.value}`}>{money(row.value)}</Label><Input id={`cash-count-${row.value}`} aria-label={`${money(row.value)} adedi`} type="number" inputMode="numeric" min={0} max={100000} step={1} value={row.quantity} onChange={e=>setBreakdown(rows=>rows.map((r,i)=>i===index?{...r,quantity:Number(e.target.value)}:r))} className="h-10 px-1 text-center"/><strong className="break-words text-right text-xs">{money(row.value*row.quantity)}</strong></div>)}<p aria-label="Açılış dökümü toplamı" className="flex justify-between rounded-xl bg-[#edf3e7] p-3 text-sm font-bold"><span>Toplam</span><span>{money(cents)}</span></p></fieldset>:<><Label htmlFor="cash-amount">{tool==='close'?'Sayılan nakit (₺)':'Tutar (₺)'}</Label><Input id="cash-amount" disabled={controlsDisabled} inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" value={amount} onChange={e=>setAmount(e.target.value)}/></>}
    {tool==='opening'&&<><label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={savePreset} disabled={controlsDisabled} onChange={e=>setSavePreset(e.target.checked)}/>Bu dökümü sonraki açılışlar için de kaydet</label><Button type="button" variant="ghost" disabled={controlsDisabled} className="text-xs" onClick={()=>setBreakdown(clone(preset.breakdown))}>Kaydedilmiş açılış dökümünü kullan</Button>{previousOpening!==null&&<p className="text-xs text-muted-foreground">Önceki açılış: {money(previousOpening)}. Tutar değişirse açıklama gereklidir.</p>}</>}
    {tool==='opening_preset'&&<p className="text-xs text-muted-foreground">Bu ayar sonraki açılışlarda hazır gelir. Bugünün kaydedilmiş açılış tutarı değişmez.</p>}
    {tool==='close'&&<p className="text-sm">Kasa farkı: <strong>{money(Number.isFinite(difference)?difference:0)}</strong></p>}
    {tool!=='opening_preset'&&<><Label htmlFor="cash-note">{tool==='close'?'Fark nedeni / açıklama':correction?'Açılış düzeltme nedeni':'Açıklama'}</Label><Textarea id="cash-note" disabled={controlsDisabled} value={note} onChange={e=>setNote(e.target.value)} maxLength={500} required={tool==='close'?difference!==0:tool==='opening'?correction:true}/></>}
    {tool==='close'&&<><Label htmlFor="close-day-confirm">Onay için GÜNÜ KAPAT yazın</Label><Input id="close-day-confirm" disabled={controlsDisabled} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={busy||!locked&&(!Number.isSafeInteger(cents)||cents<0||counted&&!validCounts||tool==='close'&&(confirm!=='GÜNÜ KAPAT'||!preview||preview.open_count>0||preview.pending_count>0))} className="w-full">{locked?'İşlemi tekrar kontrol et':tool==='close'?'Günü kapat ve kayıtları temizle':tool==='opening_preset'?'Açılış dökümünü kaydet':'Kaydet'}</Button>
   </form>}{error&&!preview&&tool!=='in'&&tool!=='out'&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </DialogContent></Dialog>
 </section>;
}
