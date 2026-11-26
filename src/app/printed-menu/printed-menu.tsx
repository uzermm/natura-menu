'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Category,Item} from '@/lib/types';
import {printedHeaderDishes,type PrintedSnapshot} from '@/lib/printed-menu-types';
import './print.css';
const price=(value:number)=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:value%100?2:0}).format(value/100)+' ₺';
const breakfastId='4b50fd9c-dc08-4eb6-ae2c-1f6ea5f56829';
function commonNotes(c:Category){const counts=new Map<string,number>();for(const i of c.items)if(i.menu_note?.trim())counts.set(i.menu_note.trim(),(counts.get(i.menu_note.trim())||0)+1);return [...counts].filter(([,count])=>count>=3).map(([note])=>note);}
function CategoryBlock({category:c,food=false}:{category:Category;food?:boolean}){
 const notes=commonNotes(c),marker=(n:number)=>['¹','²','³','⁴'][n]||'*';
 return <section className={`paper-category${food&&/tatlı/.test(c.name.toLocaleLowerCase('tr-TR'))?' paper-dessert':''}`}>
  <h2><span>{c.name}</span></h2>
  {c.items.map(item=>{const noteIndex=notes.indexOf(item.menu_note?.trim()||'');return <div className="paper-item" key={item.id}><div className="paper-item-line"><span>{item.name}{noteIndex>=0&&<sup aria-label="Servis notu" aria-describedby={`print-note-${c.id}-${noteIndex}`}>{marker(noteIndex)}</sup>}</span><i/>{!item.variants.length&&<strong>{price(item.price)}</strong>}</div>
   {item.service_note&&<p className="paper-service-note">{item.service_note}</p>}
   {item.menu_note&&noteIndex<0&&<p className="paper-note">{item.menu_note}</p>}
   {item.variants.length>0&&<div className="paper-variants">{item.variants.map(v=><div key={v.name}><span>{v.name}</span><strong>{price(v.price)}</strong></div>)}</div>}
  </div>;})}
  {notes.map((note,n)=><p className="paper-common-note paper-note" id={`print-note-${c.id}-${n}`} key={note}><sup>{marker(n)}</sup> {note}</p>)}
 </section>;
}
function foodColumnSplit(categories:Category[],breakfast?:Item){
 const weight=(c:Category)=>{const shared=commonNotes(c);return 3+c.items.reduce((sum,i)=>sum+Math.ceil(i.name.length/32)+(i.menu_note&&!shared.includes(i.menu_note.trim())?Math.ceil(i.menu_note.length/48)*.8:0)+(i.service_note?1:0)+i.variants.length,0)+shared.length*1.5;};
 const weights=categories.map(weight),total=weights.reduce((a,b)=>a+b,0),feature=breakfast?7:0;let left=0,best=0,score=Infinity;
 for(let split=0;split<=categories.length;split++){const next=Math.max(left,total-left+feature);if(next<score){score=next;best=split;}left+=weights[split]||0;}return best;
}
export default function PrintedMenu({initial}:{initial:PrintedSnapshot}){
 const [snapshot,setSnapshot]=useState(initial),latest=useRef(initial),root=useRef<HTMLDivElement>(null),preview=useRef<HTMLDivElement>(null),mounted=useRef(true),fetching=useRef<Promise<PrintedSnapshot>|null>(null),controller=useRef<AbortController|null>(null);
 const [ready,setReady]=useState(false),[overflow,setOverflow]=useState(false),[missing,setMissing]=useState<string[]>([]),[checking,setChecking]=useState(false),[error,setError]=useState(''),[lastChecked,setLastChecked]=useState(initial.checkedAt);
 const [fitView,setFitView]=useState(true),[scale,setScale]=useState(1),[edge,setEdge]=useState<'borderless'|'safe'>('borderless'),[authorized,setAuthorized]=useState(false),[printRequest,setPrintRequest]=useState(0),pendingPrint=useRef(false);
 const categories=snapshot.categories,drinks=categories.filter(c=>c.print_page==='drinks'),food=categories.filter(c=>c.print_page!=='drinks');
 const foodItems=food.flatMap(c=>c.items),breakfast=foodItems.find(i=>i.id===breakfastId)||foodItems.find(i=>/^serpme kahvaltı/.test(i.name.toLocaleLowerCase('tr-TR')));
 const breakfastService=breakfast?.service_note?.trim()||'',breakfastDays=/^(sadece )?hafta sonları$/.test(breakfastService.toLocaleLowerCase('tr-TR'))?'Cumartesi, Pazar':breakfastService;
 const foodSections=food.map(c=>({...c,items:c.items.filter(i=>i.id!==breakfast?.id)})).filter(c=>c.items.length),split=foodColumnSplit(foodSections,breakfast);
 const pages=[{title:'İçecekler',subtitle:'Sohbetin en güzel eşlikçisi.',categories:drinks,kind:'drinks'},{title:'Yemek & Tatlı',subtitle:'Taze hazırlanır. Keyifle paylaşılır.',categories:food,kind:'food'}];
 const refresh=useCallback(async()=>{
  if(fetching.current)return fetching.current;
  const abort=new AbortController();controller.current=abort;const timer=setTimeout(()=>abort.abort(),8000);
  const work=(async()=>{const response=await fetch('/api/printed-menu',{cache:'no-store',signal:abort.signal});if(!response.ok)throw Error('Güncel menü alınamadı. Bağlantınızı kontrol edip tekrar deneyin.');const next:PrintedSnapshot=await response.json();if(!Array.isArray(next.categories)||!Number.isInteger(next.revision)||!next.headerImages)throw Error('Menü bilgisi doğrulanamadı.');if(mounted.current){setLastChecked(next.checkedAt);setError('');if(next.revision!==latest.current.revision){setAuthorized(false);setReady(false);latest.current=next;setSnapshot(next);}}return next;})();
  fetching.current=work;try{return await work;}finally{clearTimeout(timer);fetching.current=null;controller.current=null;}
 },[]);
 const preparePrint=useCallback(async()=>{if(checking)return;setChecking(true);setError('');setAuthorized(false);try{await refresh();pendingPrint.current=true;setPrintRequest(v=>v+1);}catch{pendingPrint.current=false;setError('Güncel fiyatlar doğrulanamadığı için yazdırma başlatılmadı. Bağlantınızı kontrol edip tekrar deneyin.');setChecking(false);}},[checking,refresh]);
 const prepareRef=useRef(preparePrint);prepareRef.current=preparePrint;
 useEffect(()=>{mounted.current=true;const renew=()=>{if(!document.hidden)void refresh().catch(()=>{if(mounted.current)setError('Menü güncelliği kontrol edilemedi. Yazdırmadan önce bağlantıyı kontrol edin.');});};const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();void prepareRef.current();}};const after=()=>setAuthorized(false);const timer=setInterval(renew,30000);document.addEventListener('visibilitychange',renew);window.addEventListener('focus',renew);window.addEventListener('online',renew);window.addEventListener('keydown',key);window.addEventListener('afterprint',after);return()=>{mounted.current=false;controller.current?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',renew);window.removeEventListener('focus',renew);window.removeEventListener('online',renew);window.removeEventListener('keydown',key);window.removeEventListener('afterprint',after);};},[refresh]);
 useEffect(()=>{const element=preview.current;if(!element)return;const measure=()=>setScale(fitView?Math.min(1,element.clientWidth/(210*96/25.4)):1);measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[fitView]);
 useEffect(()=>{let active=true;setReady(false);setAuthorized(false);async function fit(){await document.fonts.ready;const images=Array.from(root.current?.querySelectorAll('img')||[]);await Promise.all(images.map(img=>new Promise<void>(resolve=>{const timer=setTimeout(resolve,8000);img.decode().catch(()=>{}).finally(()=>{clearTimeout(timer);resolve();});})));if(!active)return;
  setMissing(images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt||'Menü görseli'));let failed=false;
  root.current?.querySelectorAll<HTMLElement>('.paper-content').forEach(box=>{box.classList.remove('paper-three-columns');const isDrinks=!!box.closest('.paper-drinks');let size=isDrinks?12:11.5,min=isDrinks?11:10.5;const measure=()=>box.scrollHeight>box.clientHeight+1||box.scrollWidth>box.clientWidth+1;box.style.setProperty('--menu-size',size+'pt');while(measure()&&size>min){size-=.25;box.style.setProperty('--menu-size',size+'pt');}if(measure())failed=true;});setOverflow(failed);setReady(true);
 }void fit();return()=>{active=false;};},[snapshot,edge]);
 useEffect(()=>{if(!pendingPrint.current||!ready)return;pendingPrint.current=false;setChecking(false);if(overflow||missing.length){setAuthorized(false);return;}setAuthorized(true);const frame=requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));return()=>cancelAnimationFrame(frame);},[ready,overflow,missing,printRequest]);
 const canPrint=ready&&!overflow&&!missing.length&&!checking;
 return <main className={`print-menu-root ${authorized?'print-authorized':''}`} ref={root}>
  <nav className="paper-toolbar" aria-label="Basılı menü araçları"><a href="/?section=menu">← Menü yönetimi</a><div><strong>A4 · 2 sayfa · Renkli</strong><small>Yazdırmadan önce güncel fiyatlar doğrulanır.</small><small role="status" suppressHydrationWarning>Son kontrol: {new Date(lastChecked).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})}</small></div><div className="paper-toolbar-actions"><button className="paper-secondary" aria-pressed={fitView} onClick={()=>setFitView(v=>!v)}>{fitView?'%100 görünüm':'Ekrana sığdır'}</button><button disabled={!canPrint} aria-busy={checking} onClick={()=>void preparePrint()}>{checking?'Kontrol ediliyor…':'Yazdır / PDF kaydet'}</button></div></nav>
  <details className="paper-proof-tools"><summary>Baskı provası ve yazıcı ayarları</summary><div className="paper-edge-choice"><label htmlFor="print-edge">Baskı kenarı</label><select id="print-edge" value={edge} onChange={e=>setEdge(e.target.value as 'borderless'|'safe')}><option value="borderless">Kenarlıksız tasarım</option><option value="safe">Kenarlı yazıcı · 5 mm beyaz pay</option></select></div><p>A4 · Renkli · %100 ölçek · Arka plan grafikleri açık · Tarayıcı üst/alt bilgileri kapalı. Çift yüz baskıda uzun kenardan çevirin.</p><p>Önce tek bir renkli prova alın; koyu yeşili, fotoğraf netliğini ve küçük açıklamaları kâğıtta kontrol edin. Yazıcınız kenarlıksız basmıyorsa 5 mm payı seçin.</p></details>
  {error&&<p className="paper-warning" role="alert">{error}<button onClick={()=>void preparePrint()}>Tekrar kontrol et</button></p>}
  {missing.length>0&&<p className="paper-warning" role="alert">{missing.length} görsel yüklenemedi. Eksik görselle baskıyı önlemek için yazdırma durduruldu. <button onClick={()=>location.reload()}>Görselleri yeniden yükle</button></p>}
  {overflow&&<p className="paper-warning" role="alert">İçerik iki A4 sayfasına okunaklı sığmıyor. Baskı durduruldu. Menüdeki görünürlüğü veya ürün adlarını düzenleyin.</p>}
  <p className="paper-print-warning">Baskı henüz doğrulanmadı. Menüye dönüp “Yazdır / PDF kaydet” düğmesini kullanın; güncel fiyatlar, görseller ve A4 yerleşimi kontrol edilecektir.</p>
  <div className="paper-preview" ref={preview}><div className="paper-sheet-stage" style={{width:210*96/25.4*scale,height:(297*96/25.4*2+24)*scale}}><div className={`paper-sheets ${edge==='safe'?'paper-safe-edge':''}`} style={{transform:`scale(${scale})`}}>
  {pages.map(page=><article className={`menu-paper paper-${page.kind}`} key={page.title}>
   <header className="paper-header">
    {page.kind==='food'&&<div className="paper-header-gallery" aria-hidden="true">{printedHeaderDishes.map((dish,index)=><img key={dish.id} className={index===0?'paper-header-main-dish':undefined} src={snapshot.headerImages[dish.id]||dish.src} alt=""/>)}</div>}
    <img className="paper-logo paper-logo--light" src="/printed-menu/logo-transparent.webp" alt="Natura Bistro"/>
    <div className="paper-heading"><h1>{page.title}</h1><p>{page.subtitle}</p></div>
   </header>
   <div className="paper-content">{page.kind==='drinks'?<div className="paper-columns">{page.categories.filter(c=>c.items.length).map(c=><CategoryBlock key={c.id} category={c}/>)}</div>:<div className="paper-food-grid">
    <div className="paper-food-column">{foodSections.slice(0,split).map(c=><CategoryBlock key={c.id} category={c} food/>)}</div>
    <div className="paper-food-column">{foodSections.slice(split).map(c=><CategoryBlock key={c.id} category={c} food/>)}
     {breakfast&&<section className="paper-breakfast" aria-label="Hafta sonu kahvaltısı"><h2><span className="paper-breakfast-title"><span>{breakfast.name.toLocaleUpperCase('tr-TR')}</span>{breakfastDays&&<em> ({breakfastDays})</em>}</span><strong>{price(breakfast.price)}</strong></h2>{(breakfast.menu_note||breakfast.description)&&<p className="paper-note">{breakfast.menu_note||breakfast.description}</p>}</section>}
    </div>
   </div>}</div>
   {page.kind==='drinks'&&<aside className="paper-feature"><div><span className="paper-eyebrow">KÜÇÜK BİR MOLA</span><p>Bir yudum.<br/><em>Güzel bir an.</em></p><span className="paper-feature-line"/></div><img src="/printed-menu/coffee-print.webp" alt="Türk kahvesi"/></aside>}
   <footer className="paper-footer"><strong>Afiyetle, Natura.</strong><span>Fiyatlar TL cinsindedir. KDV dâhildir.</span></footer>
  </article>)}
  </div></div></div>
 </main>;
}


