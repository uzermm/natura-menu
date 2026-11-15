import { z } from 'zod';
const id=z.string().uuid(),version=z.number().int().positive(),note=z.string().trim().max(500),amount=z.number().int().positive().max(100000000),table=z.number().int().min(1).max(200);
export const addLineSchema=z.object({item_id:z.string().min(1).max(80),variant:z.string().max(120).default(''),quantity:z.number().int().min(1).max(999),note:note.default(''),expected_unit_price:z.number().int().min(0).max(100000000).optional()});
const base={ticket_id:id,version};
const quick=z.object({service_type:z.enum(['counter','takeaway']),account_name:z.string().trim().max(120)});
export const commandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('open'),table}),
 z.object({action:z.literal('open_order'),table,ticket_note:note.optional(),lines:z.array(addLineSchema).min(1).max(100)}),
 z.object({action:z.literal('open_quick'),...quick.shape,ticket_note:note.optional(),lines:z.array(addLineSchema).min(1).max(100).optional()}),
 z.object({action:z.literal('label'),...base,...quick.shape}),
 z.object({action:z.literal('add'),...base,ticket_note:note.optional(),lines:z.array(addLineSchema).min(1).max(100)}),
 z.object({action:z.literal('quantity'),...base,line_id:id,quantity:z.number().int().min(1).max(999)}),
 z.object({action:z.literal('void'),...base,line_id:id,reason:note.min(1)}),
 z.object({action:z.literal('discount'),...base,amount:z.number().int().min(0).max(100000000),note}),
 z.object({action:z.literal('note'),...base,note}),
 z.object({action:z.literal('move'),...base,table}),
 z.object({action:z.literal('pay'),...base,method:z.enum(['cash','card','meal_card','account']),amount,account_id:id.optional(),reference:note.default(''),close:z.boolean()}),
 z.object({action:z.literal('pay_items'),...base,method:z.enum(['cash','card','meal_card','account']),items:z.array(z.object({line_id:id,quantity:z.number().int().min(1).max(999)})).min(1).max(100),account_id:id.optional(),reference:note.default('')}),
 z.object({action:z.literal('close'),...base}),
]).and(z.object({quick:quick.optional(),ticket_note:note.optional()}));
export const posRequestSchema=z.object({request_id:id,command:commandSchema});
export const customerOrderSchema=z.object({request_id:id,table,lines:z.array(addLineSchema).min(1).max(50),note:note.default('')});
export const accountSchema=z.object({id:id.optional(),name:z.string().trim().min(1).max(120),phone:z.string().trim().max(40),note,is_active:z.boolean()});
export const collectSchema=z.object({id,amount,method:z.enum(['cash','card','meal_card']),note,request_id:id});
