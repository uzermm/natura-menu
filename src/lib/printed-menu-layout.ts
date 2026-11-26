// The printed menu has a pinned dessert tail; operational and QR ordering stay independent.
export function isPrintedDessert(category:{id:string;name:string}){return category.id==='949fb7f3-c1a4-4a19-b585-4b05e2bd8ced'||/tatlı/.test(category.name.toLocaleLowerCase('tr-TR'));}
export function orderPrintedFood<T extends {id:string;name:string}>(categories:T[]){
 const main=categories.filter(c=>!isPrintedDessert(c)),desserts=categories.filter(isPrintedDessert);
 return {categories:[...main,...desserts],pinnedTail:desserts.length};
}
// Heights include each category's actual wrapped text and margins.
export function measuredPrintedSplit(heights:number[],featureHeight:number,pinnedTail=0){
 const total=heights.reduce((a,b)=>a+b,0);let left=0,best=0,height=Infinity;
 for(let split=0;split<=Math.max(0,heights.length-pinnedTail);split++){
  const candidate=Math.max(left,total-left+featureHeight);
  if(candidate<height-.25){height=candidate;best=split;}
  left+=heights[split]||0;
 }
 return {split:best,height};
}
