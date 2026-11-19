window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.type==='online:navigate'&&['orders','reviews','settings'].includes(event.data.view)){
  document.body.dataset.view=event.data.view;
  document.dispatchEvent(new CustomEvent('online:navigate',{detail:event.data.view}));
 }
});
let branches=[];
const report=()=>parent.postMessage({type:'online:status',printing:document.querySelector('#sidebarPrintState')?.textContent,accounts:document.querySelector('#sidebarConnectionCount')?.textContent,branches},location.origin);
document.addEventListener('online:accounts',event=>{branches=event.detail;report();});
new MutationObserver(report).observe(document.querySelector('.sidebar-metrics'),{subtree:true,childList:true,characterData:true,attributes:true});
const ready=()=>parent.postMessage({type:'online:ready'},location.origin);
if(window.onlineAppReady)ready();else window.addEventListener('online:app-ready',ready,{once:true});
new ResizeObserver(()=>{
 if(document.body.dataset.view==='settings')parent.postMessage({type:'online:height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+16},location.origin);
}).observe(document.querySelector('main'));
