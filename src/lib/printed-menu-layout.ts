// The printed menu has a pinned dessert tail; operational and QR ordering stay independent.
export function isPrintedDessert(category:{id:string;name:string}){return category.id==='949fb7f3-c1a4-4a19-b585-4b05e2bd8ced'||/tatlı/.test(category.name.toLocaleLowerCase('tr-TR'));}
export function orderPrintedFood<T extends {id:string;name:string}>(categories:T[]){
 const main=categories.filter(c=>!isPrintedDessert(c)),desserts=categories.filter(isPrintedDessert);
 return {categories:[...main,...desserts],pinnedTail:desserts.length};
}
