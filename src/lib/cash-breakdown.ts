import {z} from 'zod';

export const DEFAULT_OPENING_BREAKDOWN=[
 {value:10000,quantity:2},{value:5000,quantity:4},{value:2000,quantity:5},
 {value:1000,quantity:10},{value:500,quantity:10},
];
export const cashBreakdownSchema=z.array(z.object({value:z.number().int().min(1).max(1000000),quantity:z.number().int().min(0).max(100000)})).min(1).max(20)
 .refine(rows=>new Set(rows.map(r=>r.value)).size===rows.length,'Aynı kupür birden fazla yazılamaz.')
 .refine(rows=>rows.reduce((sum,r)=>sum+r.value*r.quantity,0)<=100000000,'Kasa tutarı sınırı aşıldı.');
export type CashBreakdown=z.infer<typeof cashBreakdownSchema>;
export const cashTotal=(rows:CashBreakdown)=>rows.reduce((sum,r)=>sum+r.value*r.quantity,0);
