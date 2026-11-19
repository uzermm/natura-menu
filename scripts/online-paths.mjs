export function namespaceOnlinePaths(source,publicPaths){
 return source.replace(/(["'`])\/([^"'`\s<>]*)/g,(literal,quote,path)=>{
  if(path.startsWith('online/'))return literal;
  const asset=path.split(/[?#]/,1)[0];
  const directory=asset.includes('/')?asset.split('/')[0]+'/':null;
  const knownDirectory=directory&&[...publicPaths].some(file=>file.startsWith(directory));
  return path.startsWith('api/')||publicPaths.has(asset)||knownDirectory?quote+'/online/'+path:literal;
 });
}
