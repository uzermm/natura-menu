'use client';
import {useEffect,useRef,useState} from 'react';
import type {Category,Item} from '@/lib/types';
import './print.css';
const price=(value:number)=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:value%100?2:0}).format(value/100)+' ₺';
const breakfastId='4b50fd9c-dc08-4eb6-ae2c-1f6ea5f56829';
function photo(categories:Category[],match:RegExp):Item|undefined{return categories.flatMap(c=>c.items).find(i=>i.image_url&&match.test(i.name.toLocaleLowerCase('tr-TR')));}
function CategoryBlock({category:c,food=false}:{category:Category;food?:boolean}){
 return <section className={`paper-category${food&&/tatlı/.test(c.name.toLocaleLowerCase('tr-TR'))?' paper-dessert':''}`}>
  <h2><span>{c.name}</span></h2>
  {c.items.map(item=><div className="paper-item" key={item.id}><div className="paper-item-line"><span>{item.name}</span><i/><strong>{price(item.price)}</strong></div>
   {item.menu_note&&<p className="paper-note">{item.menu_note}</p>}
   {item.variants.length>0&&<div className="paper-variants">{item.variants.map(v=><div key={v.name}><span>{v.name}</span><strong>{price(v.price)}</strong></div>)}</div>}
  </div>)}
 </section>;
}
// Keep categories intact and reserve the lower right corner for weekend breakfast.
// The existing fit check remains the final guard against unreadable overflow.
function foodColumnSplit(categories:Category[],breakfast?:Item){
 const weight=(c:Category)=>3+c.items.reduce((sum,i)=>sum+Math.ceil(i.name.length/32)+(i.menu_note?Math.ceil(i.menu_note.length/48)*.8:0)+i.variants.length,0);
 const weights=categories.map(weight),total=weights.reduce((a,b)=>a+b,0),feature=breakfast?7:0;let left=0,best=0,score=Infinity;
 for(let split=0;split<=categories.length;split++){const next=Math.max(left,total-left+feature);if(next<score){score=next;best=split;}left+=weights[split]||0;}return best;
}
export default function PrintedMenu({categories}:{categories:Category[]}){
 const root=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false),[overflow,setOverflow]=useState(false);
 const drinks=categories.filter(c=>/içecek/i.test(c.name.toLocaleLowerCase('tr-TR'))),food=categories.filter(c=>!/içecek/i.test(c.name.toLocaleLowerCase('tr-TR')));
 const foodItems=food.flatMap(c=>c.items),breakfast=foodItems.find(i=>i.id===breakfastId)||foodItems.find(i=>/^serpme kahvaltı/.test(i.name.toLocaleLowerCase('tr-TR')));
 const foodSections=food.map(c=>({...c,items:c.items.filter(i=>i.id!==breakfast?.id)})).filter(c=>c.items.length),split=foodColumnSplit(foodSections,breakfast);
 const pages=[{title:'İçecekler',subtitle:'Sohbetin en güzel eşlikçisi.',categories:drinks,kind:'drinks',photo:photo(drinks,/latte|kahve|cappuccino/)},{title:'Yemek & Tatlı',subtitle:'Taze hazırlanır. Keyifle paylaşılır.',categories:food,kind:'food',photo:photo(food,/kremalı tavuk|burger|kahvaltı/)}];
 useEffect(()=>{let active=true;async function fit(){await document.fonts.ready;await Promise.all(Array.from(root.current?.querySelectorAll('img')||[]).map(img=>img.decode().catch(()=>{})));if(!active)return;let failed=false;
 root.current?.querySelectorAll<HTMLElement>('.paper-content').forEach(box=>{box.classList.remove('paper-three-columns');const isDrinks=!!box.closest('.paper-drinks');let size=isDrinks?12:11.5;const measure=()=>box.scrollHeight>box.clientHeight+1||box.scrollWidth>box.clientWidth+1;box.style.setProperty('--menu-size',size+'pt');while(measure()&&size>9){size-=.25;box.style.setProperty('--menu-size',size+'pt');}if(measure()&&isDrinks){box.classList.add('paper-three-columns');size=11;box.style.setProperty('--menu-size',size+'pt');while(measure()&&size>9){size-=.25;box.style.setProperty('--menu-size',size+'pt');}}if(measure())failed=true;});setOverflow(failed);setReady(true);}void fit();return()=>{active=false;};},[categories]);
 return <main className={`print-menu-root ${overflow?'has-overflow':''}`} ref={root}>
  <nav className="paper-toolbar"><a href="/?section=menu">← Menü yönetimi</a><span>A4 · 2 sayfa · Renkli<br/><small>Güncel ürünler, fiyatlar ve menü notları</small></span><button disabled={!ready||overflow} onClick={()=>window.print()}>Yazdır / PDF kaydet</button></nav>
  {overflow&&<p className="paper-warning" role="alert">İçerik iki A4 sayfasına okunaklı sığmıyor. Baskı durduruldu. Menüdeki görünürlüğü veya ürün adlarını düzenleyin.</p>}
  {pages.map(page=><article className={`menu-paper paper-${page.kind}`} key={page.title}>
   <header className="paper-header">
    {page.kind==='food'&&page.photo&&<img className="paper-header-photo" src={page.photo.image_url} alt=""/>}
    <img className="paper-logo paper-logo--light" src="/printed-menu/logo-transparent.webp" alt="Natura Bistro"/>
    <div className="paper-heading"><h1>{page.title}</h1><p>{page.subtitle}</p></div>
   </header>
   <div className="paper-content">{page.kind==='drinks'?<div className="paper-columns">{page.categories.filter(c=>c.items.length).map(c=><CategoryBlock key={c.id} category={c}/>)}</div>:<div className="paper-food-grid">
    <div className="paper-food-column">{foodSections.slice(0,split).map(c=><CategoryBlock key={c.id} category={c} food/>)}</div>
    <div className="paper-food-column">{foodSections.slice(split).map(c=><CategoryBlock key={c.id} category={c} food/>)}
     {breakfast&&<section className="paper-breakfast" aria-label="Hafta sonu kahvaltısı"><h2><span>{breakfast.name.toLocaleUpperCase('tr-TR')}</span><strong>{price(breakfast.price)}</strong></h2><p className="paper-breakfast-weekend">Sadece hafta sonları</p>{(breakfast.menu_note||breakfast.description)&&<p className="paper-note">{breakfast.menu_note||breakfast.description}</p>}</section>}
    </div>
   </div>}</div>
   {page.kind==='drinks'&&<aside className="paper-feature"><div><span className="paper-eyebrow">KÜÇÜK BİR MOLA</span><p>Bir yudum.<br/><em>Güzel bir an.</em></p><span className="paper-feature-line"/></div>{page.photo&&<img src={page.photo.image_url} alt=""/>}</aside>}
   <footer className="paper-footer"><strong>Afiyetle, Natura.</strong><span>Fiyatlar TL cinsindedir. KDV dâhildir.</span></footer>
  </article>)}
 </main>;
}

