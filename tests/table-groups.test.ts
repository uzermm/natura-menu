import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tableGroups} from '../src/lib/table-groups.ts';

test('calls precede numbered open and empty tables without duplicates, then return to their current group',()=>{
 const calls=[
  {id:'new',table_number:2,created_at:'2026-11-19T10:01:00Z',resolved_at:null},
  {id:'old',table_number:4,created_at:'2026-11-19T10:00:00Z',resolved_at:null},
  {id:'duplicate',table_number:4,created_at:'2026-11-19T10:02:00Z',resolved_at:null},
 ];
 assert.deepEqual(tableGroups(5,[3,2],calls),{calling:[4,2],open:[3],empty:[1,5]});
 const resolved=calls.map(c=>({...c,resolved_at:'2026-11-19T10:03:00Z'}));
 assert.deepEqual(tableGroups(5,[3,2],resolved),{calling:[],open:[2,3],empty:[1,4,5]});
 assert.deepEqual(tableGroups(5,[3],resolved),{calling:[],open:[3],empty:[1,2,4,5]});
 assert.deepEqual(tableGroups(5,[3,1],resolved),{calling:[],open:[1,3],empty:[2,4,5]});
});

test('active tables beyond the configured count remain reachable and tied calls sort numerically',()=>{
 const calls=[7,6].map(n=>({id:String(n),table_number:n,created_at:'2026-11-19T10:00:00Z',resolved_at:null}));
 assert.deepEqual(tableGroups(2,[8],calls),{calling:[6,7],open:[8],empty:[1,2]});
});
