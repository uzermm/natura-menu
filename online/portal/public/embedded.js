window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.type==='online:navigate'&&['orders','reviews','settings'].includes(event.data.view)){
  document.body.dataset.view=event.data.view;
  document.dispatchEvent(new CustomEvent('online:navigate',{detail:event.data.view}));
 }
});
const report=()=>parent.postMessage({type:'online:status',printing:document.querySelector('#sidebarPrintState')?.textContent,accounts:document.querySelector('#sidebarConnectionCount')?.textContent},location.origin);
new MutationObserver(report).observe(document.querySelector('.sidebar-metrics'),{subtree:true,childList:true,characterData:true,attributes:true});
const ready=()=>parent.postMessage({type:'online:ready'},location.origin);
if(window.onlineAppReady)ready();else window.addEventListener('online:app-ready',ready,{once:true});
