'use client';
import {useId,useState} from 'react';
export function ProductDescription({text,name}:{text:string;name:string}) {
 const [expanded,setExpanded]=useState(false),id=useId(),long=text.length>160;
 return <div className="mt-2"><p id={id} className={'menu-description '+(long&&!expanded?'line-clamp-4':'')}>{text}</p>{long&&<button type="button" aria-expanded={expanded} aria-controls={id} aria-label={name+(expanded?' açıklamasını daralt':' açıklamasının tamamını göster')} className="menu-description-toggle" onClick={()=>setExpanded(value=>!value)}>{expanded?'Daha az göster':'Devamını oku'}</button>}</div>;
}
