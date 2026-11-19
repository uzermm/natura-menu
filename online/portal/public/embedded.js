let requestedView='orders';
function applyView(){document.body.dataset.view=requestedView;if(window.onlineAppReady)document.dispatchEvent(new CustomEvent('online:navigate',{detail:requestedView}));}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='online:navigate'&&['orders','reviews','settings'].includes(event.data.view)){requestedView=event.data.view;applyView();}});
let branches=[],lastStatus='';
const report=()=>{const message={type:'online:status',printing:document.querySelector('#sidebarPrintState')?.textContent,accounts:document.querySelector('#sidebarConnectionCount')?.textContent,branches};const signature=JSON.stringify(message);if(signature===lastStatus)return;lastStatus=signature;parent.postMessage(message,location.origin);};
document.addEventListener('online:accounts',event=>{branches=event.detail;report();});
new MutationObserver(report).observe(document.querySelector('.sidebar-metrics'),{subtree:true,childList:true,characterData:true,attributes:true});
const ready=()=>{applyView();parent.postMessage({type:'online:ready'},location.origin);};
if(window.onlineAppReady)ready();else window.addEventListener('online:app-ready',ready,{once:true});
// The parent page owns vertical scrolling; measure content, never the iframe viewport.
let heightFrame=0,lastHeight='',active=true;
function reportHeight(){heightFrame=0;if(matchMedia('print').matches)return;const view=document.body.dataset.view||'orders',height=Math.ceil(document.querySelector('main').getBoundingClientRect().height)+2,key=view+':'+height;if(key===lastHeight)return;lastHeight=key;parent.postMessage({type:'online:height',view,height},location.origin);}
function scheduleHeight(){if(!heightFrame)heightFrame=requestAnimationFrame(reportHeight);}
new ResizeObserver(scheduleHeight).observe(document.querySelector('main'));
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='online:visibility'){active=!!event.data.active;document.dispatchEvent(new CustomEvent('online:visibility',{detail:active}));}if(['online:visibility','online:navigate'].includes(event.data?.type)){lastHeight='';scheduleHeight();}});
window.addEventListener('resize',scheduleHeight,{passive:true});window.addEventListener('afterprint',scheduleHeight);

// Position a native order dialog in the visible parent viewport, not at the centre of a tall iframe.
const orderDialog=document.querySelector('#detail');
function positionDialog(){if(parent===window||!frameElement)return;const rect=frameElement.getBoundingClientRect(),header=parent.document.querySelector('.kitchen-header')?.getBoundingClientRect().bottom||0,dock=parent.document.querySelector('.connection-dock')?.getBoundingClientRect().top||parent.innerHeight,viewport=parent.visualViewport,top=Math.max(rect.top,header,viewport?.offsetTop||0)+12,bottom=Math.min(rect.bottom,dock,(viewport?.offsetTop||0)+(viewport?.height||parent.innerHeight))-12;orderDialog.style.top=Math.max(0,top-rect.top)+'px';orderDialog.style.maxHeight=Math.max(120,bottom-top)+'px';}
document.addEventListener('online:dialog-opening',positionDialog);
if(parent!==window){let dialogFrame=0;const update=()=>{if(!orderDialog.open||dialogFrame)return;dialogFrame=requestAnimationFrame(()=>{dialogFrame=0;positionDialog();});};parent.addEventListener('scroll',update,{passive:true});parent.addEventListener('resize',update,{passive:true});parent.visualViewport?.addEventListener('resize',update,{passive:true});}
