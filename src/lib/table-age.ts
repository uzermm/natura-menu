// Shared by the full table grid and the open-account cards.
export function tableAgeTone(elapsed:number):'green'|'yellow'|'red'{
 return elapsed>45*60*1000?'red':elapsed>=20*60*1000?'yellow':'green';
}
