'use client';
import {useRef,useState} from 'react';
import {Pencil,Wallet,Banknote,CreditCard,Utensils,Users,ArrowDownLeft,ArrowUpRight,RotateCcw,Percent,ReceiptText,Download,CheckCircle2,Clock3} from 'lucide-react';
import {api} from '@/lib/client';
import {clearDraft} from '@/lib/order-draft';
import {money} from '@/lib/types';
import {cashBreakdownSchema,cashTotal,DEFAULT_OPENING_BREAKDOWN,type CashBreakdown} from '@/lib/cash-breakdown';
import {type PosSummary} from '@/lib/pos-types';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Textarea} from './ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';

type Summary=PosSummary['today'];
type Tool='opening'|'in'|'out'|'close';
type Preset={breakdown:CashBreakdown;version:number};
type Preview={day:Summary;revision:string;open_count:number;pending_count:number;kept_count:number;delete_count:number;opening_preset:Preset};
const clone=(rows:CashBreakdown)=>rows.map(r=>({...r}));

export function PosDay({summary:s,onChange,canEditOpening=false}:{summary:Summary;canEditOpening?:boolean;onChange:()=>Promise<void>}){
 const [tool,setTool]=useState<Tool|null>(null),[preview,setPreview]=useState<Preview|null>(null);
 const [amount,setAmount]=useState(''),[note,setNote]=useState(''),[confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [breakdown,setBreakdown]=useState<CashBreakdown>(()=>clone(DEFAULT_OPENING_BREAKDOWN));
 const [preset,setPreset]=useState<Preset>({breakdown:clone(DEFAULT_OPENING_BREAKDOWN),version:1});
 const [contextDay,setContextDay]=useState(s.day_id),[openingVersion,setOpeningVersion]=useState(s.opening_version??0),[previousOpening,setPreviousOpening]=useState<number|null>(s.opening_cash);
 const attempt=useRef<{payload:Record<string,unknown>;id:string}|null>(null);
 const counted=tool==='opening',controlsDisabled=busy||locked;
 const cents=counted?cashTotal(breakdown):Math.round(Number(amount.replace(',','.'))*100);
 const validCounts=cashBreakdownSchema.safeParse(breakdown).success,difference=preview?cents-preview.day.expected_cash:0;

 const title=tool==='close'?'Gün kapat':tool==='opening'?(previousOpening===null?'Açılış kasası':'Açılış kasasını düzenle'):tool==='in'?'Kasa girişi':'Kasa çıkışı';

 async function start(kind:Tool){
  if(busy||kind==='opening'&&!canEditOpening)return;setError('');setNotice('');setNote('');setConfirm('');setAmount('');setTool(kind);setPreview(null);setLocked(false);attempt.current=null;setContextDay(s.day_id);setPreviousOpening(s.opening_cash);setOpeningVersion(s.opening_version??0);
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
    :tool==='opening'?{action:'opening',day_id:contextDay,amount:cents,note:note||'Açılış kasası kartından düzenlendi.',breakdown,opening_version:openingVersion,save_preset:true,preset_version:preset.version}
    :{action:tool,day_id:contextDay,amount:cents,note};
   const current=attempt.current??{payload,id:crypto.randomUUID()};attempt.current=current;setLocked(true);
   await api('/api/pos/day',{...current.payload,request_id:current.id});if(tool==='close')clearDraft();await onChange();attempt.current=null;setLocked(false);
   setNotice(tool==='close'?'Gün kapatıldı. Cari kayıtları ve sabit açılış kasası korundu.':'Kasa işlemi kaydedildi.');setTool(null);
  }catch(e){const error=e as Error&{status?:number};setError(error.message);if(error.status&&error.status>=400&&error.status<500){attempt.current=null;setLocked(false);}}finally{setBusy(false);}
 }

 return <section className="space-y-4">
  {error&&!tool&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm">{notice}</p>}
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Kasa açık</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>{new Date(s.opened_at).toLocaleString('tr-TR')}</span></div>
  <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,2fr)]">
   <div aria-label="Açılış kasası kartı" className="rounded-2xl bg-[#244b39] p-5 text-white shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-white/10 p-2.5 text-amber-200"><Wallet size={22}/></span><h2 className="text-lg font-bold tracking-tight sm:text-xl">Açılış kasası</h2></div>{canEditOpening&&<Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" aria-label="Açılış kasasını düzenle" onClick={()=>start('opening')}><Pencil size={17}/></Button>}</div>
    <div className="mt-5 space-y-2.5">{s.opening_breakdown?.map(row=><div key={row.value} className="flex items-center justify-between gap-3 text-sm"><span className="text-emerald-50/85"><span className="font-semibold text-white">{row.quantity} adet</span> × {money(row.value)}</span><span className="font-medium tabular-nums text-emerald-50/85">{money(row.quantity*row.value)}</span></div>)}</div>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-2 border-t border-white/20 pt-4"><div><p className="text-xs font-medium text-emerald-100/80">Toplam açılış nakdi</p><strong className="mt-1 block break-words text-3xl font-bold tracking-tight tabular-nums">{money(s.opening_cash??0)}</strong></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-emerald-50">Sabit döküm</span></div>
   </div>
   <div className="grid grid-cols-2 gap-3 sm:gap-4">{([
    {method:'cash',label:'Nakit',Icon:Banknote,tone:'border-emerald-200/70 bg-emerald-50/70',iconTone:'bg-emerald-100 text-emerald-700',text:'text-emerald-950'},
    {method:'card',label:'Kredi kartı',Icon:CreditCard,tone:'border-blue-200/70 bg-blue-50/70',iconTone:'bg-blue-100 text-blue-700',text:'text-blue-950'},
    {method:'meal_card',label:'Yemek kartı',Icon:Utensils,tone:'border-amber-200/70 bg-amber-50/70',iconTone:'bg-amber-100 text-amber-700',text:'text-amber-950'},
    {method:'account',label:'Net cariye aktarılan',Icon:Users,tone:'border-violet-200/70 bg-violet-50/70',iconTone:'bg-violet-100 text-violet-700',text:'text-violet-950'},
   ] as const).map(({method,label,Icon,tone,iconTone,text})=><div key={method} className={`flex min-w-0 flex-col justify-between rounded-2xl border p-4 sm:p-5 ${tone}`}><div className="flex flex-wrap items-center gap-2 sm:gap-3"><span className={`rounded-xl p-2 sm:p-2.5 ${iconTone}`}><Icon size={20}/></span><h3 className={`text-sm font-semibold ${text}`}>{label}</h3></div><strong className={`mt-4 block break-words text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${text}`}>{money(s[method])}</strong></div>)}</div>
  </div>
  <div className="overflow-hidden rounded-2xl border border-[#dbe5d6] bg-white shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-4 bg-[#edf3e7] p-5 sm:px-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/80 p-3 text-[#315c40]"><Banknote size={24}/></span><div><h2 className="text-base font-bold text-[#244b39] sm:text-lg">Kasada beklenen nakit</h2><p className="mt-0.5 text-xs text-[#59704e]">Açılış + nakit tahsilat + giriş − çıkış</p></div></div><strong className="max-w-full break-words text-3xl font-bold tracking-tight tabular-nums text-[#244b39]">{money(s.expected_cash)}</strong></div>
   <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4 sm:p-6">{[
    {label:'Kasa girişi',value:s.cash_in,Icon:ArrowDownLeft,color:'text-emerald-700 bg-emerald-50'},
    {label:'Kasa çıkışı',value:s.cash_out,Icon:ArrowUpRight,color:'text-orange-700 bg-orange-50'},
    {label:'İade toplamı',value:s.refunds,Icon:RotateCcw,color:'text-rose-700 bg-rose-50'},
    {label:'İndirim',value:s.discount,Icon:Percent,color:'text-violet-700 bg-violet-50'},
   ].map(({label,value,Icon,color})=><div key={label} className="min-w-0"><dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className={`rounded-lg p-1.5 ${color}`}><Icon size={15}/></span>{label}</dt><dd className="mt-2 break-words text-xl font-bold tabular-nums">{money(value)}</dd></div>)}</dl>
   <div className="flex items-center gap-2 border-t bg-[#fafbf8] px-5 py-3 text-xs text-muted-foreground sm:px-6"><ReceiptText size={16}/><span>Kapanan adisyon</span><strong className="ml-auto rounded-lg border bg-white px-3 py-1 text-sm text-foreground">{s.closed_count}</strong></div>
  </div>
  <div className="flex flex-wrap gap-2 sm:gap-3"><Button variant="outline" className="h-11 border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" onClick={()=>start('in')}><ArrowDownLeft size={17}/>Kasa girişi</Button><Button variant="outline" className="h-11 border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100" onClick={()=>start('out')}><ArrowUpRight size={17}/>Kasa çıkışı</Button><Button className="h-11" onClick={()=>start('close')}><CheckCircle2 size={17}/>Gün kapat</Button><Button variant="outline" className="h-11 bg-white" asChild><a href="/api/pos/day?export=cari" download><Download size={17}/>Cari Excel indir</a></Button></div>
  <p className="text-xs leading-relaxed text-muted-foreground">Gün kapatıldığında cari hesaplar, bağlı fişler ve sabit açılış kasası korunur. Diğer satış ve günlük kasa kayıtları silinir.</p>
  <Dialog open={!!tool} onOpenChange={v=>!busy&&!locked&&!v&&setTool(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader className={counted?"rounded-xl bg-[#edf3e7] p-4":""}><DialogTitle className="flex items-center gap-2 text-xl font-bold">{counted&&<Wallet size={22} className="text-[#315c40]"/>}{title}</DialogTitle><DialogDescription>{tool==='close'?'Silinecek kayıtları ve kasa sayımını kontrol edin.':counted?'Kupür adetlerini düzenleyin; toplam otomatik hesaplanır.':'Tutarı ve açıklamayı kaydedin.'}</DialogDescription></DialogHeader>
   {tool!=='in'&&tool!=='out'&&!preview?<p>{busy?'Kasa bilgileri yükleniyor…':'Bilgiler yüklenemedi.'}</p>:<form className="space-y-4" onSubmit={submit}>
    {tool==='close'&&preview&&<><div className="space-y-1 rounded-xl bg-red-50 p-3 text-xs text-red-900"><p>Silinecek adisyon: {preview.delete_count}</p><p>Korunacak cari bağlantılı adisyon: {preview.kept_count}</p><p>Açık hesap: {preview.open_count} · Bekleyen sipariş: {preview.pending_count}</p><p className="pt-2 font-bold">Menü, ayarlar, çalışanlar ve cari hareketleri korunur. Diğer satış/kasa kayıtları geri alınamaz biçimde silinir.</p></div><p className="text-sm">Beklenen nakit: <strong>{money(preview.day.expected_cash)}</strong></p></>}
    {counted?<fieldset disabled={controlsDisabled} className="min-w-0 space-y-2"><legend className="mb-2 text-sm font-bold">Para dökümü</legend><div className="grid grid-cols-[minmax(0,1fr)_104px_64px] gap-2 text-[11px] text-muted-foreground"><span>Kupür</span><span>Adet</span><span className="text-right">Tutar</span></div>{breakdown.map((row,index)=><div key={row.value} className="grid grid-cols-[minmax(0,1fr)_104px_64px] items-center gap-2 rounded-xl border p-2 text-sm"><Label htmlFor={`cash-count-${row.value}`}>{money(row.value)}</Label><div className="flex min-w-0 items-center rounded-lg border bg-white"><Button type="button" variant="ghost" size="icon" className="h-10 w-8 shrink-0 rounded-r-none" aria-label={`${money(row.value)} adedini azalt`} disabled={controlsDisabled||row.quantity<=0} onClick={()=>setBreakdown(rows=>rows.map((r,i)=>i===index?{...r,quantity:Math.max(0,r.quantity-1)}:r))}>−</Button><Input id={`cash-count-${row.value}`} aria-label={`${money(row.value)} adedi`} type="text" inputMode="numeric" pattern="[0-9]+" required value={row.quantity} onChange={e=>{if(/^\d*$/.test(e.target.value))setBreakdown(rows=>rows.map((r,i)=>i===index?{...r,quantity:Number(e.target.value)}:r));}} className="h-10 min-w-0 flex-1 rounded-none border-0 px-0 text-center shadow-none"/><Button type="button" variant="ghost" size="icon" className="h-10 w-8 shrink-0 rounded-l-none" aria-label={`${money(row.value)} adedini artır`} disabled={controlsDisabled||row.quantity>=100000} onClick={()=>setBreakdown(rows=>rows.map((r,i)=>i===index?{...r,quantity:Math.min(100000,r.quantity+1)}:r))}>+</Button></div><strong className="break-words text-right text-xs">{money(row.value*row.quantity)}</strong></div>)}<p aria-label="Açılış dökümü toplamı" className="flex justify-between rounded-xl bg-[#edf3e7] p-3 text-sm font-bold"><span>Toplam</span><span>{money(cents)}</span></p></fieldset>:<><Label htmlFor="cash-amount">{tool==='close'?'Sayılan nakit (₺)':'Tutar (₺)'}</Label><Input id="cash-amount" disabled={controlsDisabled} inputMode="decimal" required pattern="[0-9]+([.,][0-9]{1,2})?" value={amount} onChange={e=>setAmount(e.target.value)}/></>}
    {tool==='close'&&<p className="text-sm">Kasa farkı: <strong>{money(Number.isFinite(difference)?difference:0)}</strong></p>}
    {tool!=='opening'&&<><Label htmlFor="cash-note">{tool==='close'?'Fark nedeni / açıklama':'Açıklama'}</Label><Textarea id="cash-note" disabled={controlsDisabled} value={note} onChange={e=>setNote(e.target.value)} maxLength={500} required={tool==='close'?difference!==0:true}/></>}
    {tool==='close'&&<><Label htmlFor="close-day-confirm">Onay için GÜNÜ KAPAT yazın</Label><Input id="close-day-confirm" disabled={controlsDisabled} value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="submit" disabled={busy||!locked&&(!Number.isSafeInteger(cents)||cents<0||counted&&!validCounts||tool==='close'&&(confirm!=='GÜNÜ KAPAT'||!preview||preview.open_count>0||preview.pending_count>0))} className="w-full">{locked?'İşlemi tekrar kontrol et':tool==='close'?'Günü kapat ve kayıtları temizle':'Kaydet'}</Button>
   </form>}{error&&!preview&&tool!=='in'&&tool!=='out'&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </DialogContent></Dialog>
 </section>;
}
