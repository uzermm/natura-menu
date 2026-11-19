import {test} from 'node:test';
import assert from 'node:assert/strict';
import {namespaceOnlinePaths} from '../scripts/online-paths.mjs';

test('order actions and review replies keep dynamic suffixes while API roots and assets are namespaced once',()=>{
 const assets=new Set(['app.js','style.css','logos/card.svg']);
 const source="api('/api/orders/'+encodeURIComponent(id)+'/actions');api('/api/reviews/'+encodeURIComponent(key)+'/answer');fetch('/api/state');load('/app.js');image('/logos/card.svg');join('/');existing('/online/api/state');icon('../icons/naturapp-192.png');";
 const result=namespaceOnlinePaths(source,assets);
 assert.match(result,/api\('\/online\/api\/orders\/'.*\+'\/actions'\)/);
 assert.match(result,/api\('\/online\/api\/reviews\/'.*\+'\/answer'\)/);
 assert.ok(result.includes("fetch('/online/api/state')"));
 assert.ok(result.includes("load('/online/app.js')"));
 assert.ok(result.includes("image('/online/logos/card.svg')"));
 assert.ok(result.includes("join('/')"));
 assert.ok(result.includes("icon('../icons/naturapp-192.png')"));
 assert.equal(namespaceOnlinePaths(result,assets),result);
 assert.equal(namespaceOnlinePaths('image("/logos/"+brand+".svg")',assets),'image("/online/logos/"+brand+".svg")');
 assert.equal(namespaceOnlinePaths('src="/logos/${brand}.svg"',assets),'src="/online/logos/${brand}.svg"');
});
