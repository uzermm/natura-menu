export async function mapConcurrent(values,limit,work){
 let next=0;const results=new Array(values.length);
 await Promise.all(Array.from({length:Math.min(Math.max(1,limit),values.length)},async()=>{while(next<values.length){const index=next++;results[index]=await work(values[index],index);}}));return results;
}
