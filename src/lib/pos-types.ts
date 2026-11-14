export type PaymentMethod='cash'|'card'|'meal_card'|'account';
export type OrderSource='cashier'|'waiter'|'customer';
export interface TicketLine {id:string;ticket_id:string;item_id:string;name:string;variant:string;unit_price:number;quantity:number;note:string;source:OrderSource;actor:string;created_at:string;voided_at:string|null;void_reason:string;}
export interface TicketPayment {id:string;ticket_id:string;method:PaymentMethod;amount:number;account_id:string|null;account_name:string;reference:string;actor:string;created_at:string;}
export interface Ticket {id:string;number:number;table_number:number;status:'open'|'closed';version:number;opened_at:string;closed_at:string|null;lines:TicketLine[];payments:TicketPayment[];subtotal:number;discount:number;total:number;paid:number;remaining:number;note:string;}
export interface Account {id:string;name:string;phone:string;note:string;is_active:boolean;balance:number;}
export interface AccountEntry {id:string;account_id:string;ticket_id:string|null;amount:number;method:string;note:string;actor:string;created_at:string;}
export interface PendingOrder {id:string;number:number;table_number:number;lines:(AddOrderLine)[];status:'pending'|'accepted'|'rejected';created_at:string;note:string;ticket_id:string|null;}
export interface AddOrderLine {item_id:string;name:string;variant:string;quantity:number;unit_price:number;note:string;}
export interface Staff {id:string;username:string;name:string;is_active:boolean;}
export interface PosSummary {open:Ticket[];recent:Ticket[];accounts:Account[];pending:PendingOrder[];today:{date:string;closed_count:number;cash:number;card:number;meal_card:number;account:number;discount:number;};}
export const paymentLabels:Record<PaymentMethod,string>={cash:'Nakit',card:'Kredi kartı',meal_card:'Yemek kartı',account:'Cari hesap'};
