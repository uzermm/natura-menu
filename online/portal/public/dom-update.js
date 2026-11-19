// Keep existing controls and unchanged cards alive during background updates.
export function patchHTML(container, html) {
 const template=document.createElement('template');template.innerHTML=html;
 const focused=document.activeElement;
 const key=node=>node.nodeType===1?(node.id||['order','drawer','store','edit','delete'].map(k=>node.hasAttribute('data-'+k)?k+':'+node.getAttribute('data-'+k):'').find(Boolean)||null):null;
 function patch(parent, desired) {
  const keyed=new Map([...parent.childNodes].map(node=>[key(node),node]).filter(([k])=>k));
  let cursor=parent.firstChild;
  for(const next of [...desired.childNodes]) {
   const k=key(next);let current=k?keyed.get(k):cursor;
   if(current&&(current.nodeType!==next.nodeType||current.nodeName!==next.nodeName||key(current)!==k))current=null;
   if(!current){current=next.cloneNode(true);parent.insertBefore(current,cursor);}
   else {
    if(current!==cursor)parent.insertBefore(current,cursor);
    if(current.nodeType===1){
     for(const attr of [...current.attributes])if(!next.hasAttribute(attr.name)&&!(current.tagName==='DETAILS'&&attr.name==='open'))current.removeAttribute(attr.name);
     for(const attr of next.attributes)if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
     patch(current,next);
    }else if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;
   }
   cursor=current.nextSibling;
  }
  while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
 }
 patch(container,template.content);
 if(focused?.isConnected&&document.activeElement!==focused)focused.focus({preventScroll:true});
}
