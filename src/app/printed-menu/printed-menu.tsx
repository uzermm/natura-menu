'use client';
import {useEffect,useRef,useState} from 'react';
import type {Category,Item} from '@/lib/types';
import './print.css';
const price=(value:number)=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:value%100?2:0}).format(value/100)+' ₺';
function photo(categories:Category[],match:RegExp):Item|undefined{return categories.flatMap(c=>c.items).find(i=>i.image_url&&match.test(i.name.toLocaleLowerCase('tr-TR')));}
export default function PrintedMenu({categories}:{categories:Category[]}){
 const root=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false),[overflow,setOverflow]=useState(false);
 const drinks=categories.filter(c=>/içecek/i.test(c.name.toLocaleLowerCase('tr-TR'))),food=categories.filter(c=>!/içecek/i.test(c.name.toLocaleLowerCase('tr-TR')));
 const pages=[{title:'İçecekler',subtitle:'Sohbetin en güzel eşlikçisi.',categories:drinks,kind:'drinks',photo:photo(drinks,/latte|kahve|cappuccino/)},{title:'Yemek & Tatlı',subtitle:'Taze hazırlanır. Keyifle paylaşılır.',categories:food,kind:'food',photo:photo(food,/kremalı tavuk|burger|kahvaltı/)}];
 useEffect(()=>{let active=true;async function fit(){await document.fonts.ready;await Promise.all(Array.from(root.current?.querySelectorAll('img')||[]).map(img=>img.decode().catch(()=>{})));if(!active)return;let failed=false;
 root.current?.querySelectorAll<HTMLElement>('.paper-content').forEach(box=>{box.classList.remove('paper-three-columns');let size=box.closest('.paper-drinks')?12:11.5;const measure=()=>box.scrollHeight>box.clientHeight+1||box.scrollWidth>box.clientWidth+1;box.style.setProperty('--menu-size',size+'pt');while(measure()&&size>9){size-=.25;box.style.setProperty('--menu-size',size+'pt');}if(measure()){box.classList.add('paper-three-columns');size=11;box.style.setProperty('--menu-size',size+'pt');while(measure()&&size>9){size-=.25;box.style.setProperty('--menu-size',size+'pt');}}if(measure())failed=true;});setOverflow(failed);setReady(true);}void fit();return()=>{active=false;};},[categories]);
 return <main className={`print-menu-root ${overflow?'has-overflow':''}`} ref={root}>
  <nav className="paper-toolbar"><a href="/?section=menu">← Menü yönetimi</a><span>A4 · 2 sayfa · Renkli<br/><small>Güncel ürünler, fiyatlar ve menü notları</small></span><button disabled={!ready||overflow} onClick={()=>window.print()}>Yazdır / PDF kaydet</button></nav>
  {overflow&&<p className="paper-warning" role="alert">İçerik iki A4 sayfasına okunaklı sığmıyor. Baskı durduruldu. Menüdeki görünürlüğü veya ürün adlarını düzenleyin.</p>}
  {pages.map(page=><article className={`menu-paper paper-${page.kind}`} key={page.title}>
   <header className="paper-header">
    {page.kind==='food'&&page.photo&&<img className="paper-header-photo" src={page.photo.image_url} alt=""/>}
    <img className="paper-logo paper-logo--light" src="/printed-menu/logo-transparent.webp" alt="Natura Bistro"/>
    <div className="paper-heading"><h1>{page.title}</h1><p>{page.subtitle}</p></div>
    
   </header>
   <div className="paper-content"><div className="paper-columns">
    {page.categories.filter(c=>c.items.length).map(c=><section className="paper-category" key={c.id}>
     <h2><span>{c.name}</span></h2>
     {c.items.map(item=><div className="paper-item" key={item.id}><div className="paper-item-line"><span>{item.name}</span><i/><strong>{price(item.price)}</strong></div>
      {item.menu_note&&<p className="paper-note">{item.menu_note}</p>}
      {item.variants.length>0&&<div className="paper-variants">{item.variants.map(v=><div key={v.name}><span>{v.name}</span><strong>{price(v.price)}</strong></div>)}</div>}
     </div>)}
    </section>)}
   </div></div>
   {page.kind==='drinks'&&<aside className="paper-feature"><div><span className="paper-eyebrow">KÜÇÜK BİR MOLA</span><p>Bir yudum.<br/><em>Güzel bir an.</em></p><span className="paper-feature-line"/></div>{page.photo&&<img src={page.photo.image_url} alt=""/>}<span className="paper-feature-word">NATURA</span></aside>}
   <footer className="paper-footer"><strong>Afiyetle, Natura.</strong><span>Fiyatlar TL cinsindedir. KDV dâhildir.</span></footer>
  </article>)}
 </main>;
}




