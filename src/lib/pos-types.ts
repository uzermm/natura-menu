export type PaymentMethod='cash'|'card'|'meal_card'|'account';
export type OrderSource='cashier'|'waiter'|'customer';
export interface TicketLine {id:string;ticket_id:string;item_id:string;name:string;variant:string;unit_price:number;quantity:number;paid_quantity?:number;paid_amount?:number;note:string;source:OrderSource;actor:string;created_at:string;voided_at:string|null;void_reason:string;}
export interface SelectedItem {line_id:string;quantity:number;}
export interface TicketPayment {day_id?:string;net_amount?:number;id:string;ticket_id:string;method:PaymentMethod;amount:number;account_id:string|null;account_name:string;reference:string;actor:string;created_at:string;}
export type ServiceType='table'|'counter'|'takeaway';
export interface QuickMetadata {service_type:'counter'|'takeaway';account_name:string;}
export interface PaymentAdjustment {id:string;payment_id:string;kind:'refund'|'correction';amount:number;method:PaymentMethod;reason:string;actor:string;created_at:string;}
export interface Ticket {business_day_id?:string;refunded?:number;gross_total?:number;adjustments?:PaymentAdjustment[];merged_into?:string|null;id:string;number:number;table_number:number|null;service_type:ServiceType;account_name:string;status:'open'|'closed';version:number;opened_at:string;closed_at:string|null;lines:TicketLine[];payments:TicketPayment[];subtotal:number;discount:number;total:number;paid:number;remaining:number;note:string;}
export interface Account {id:string;name:string;phone:string;note:string;is_active:boolean;balance:number;}
export interface AccountEntry {id:string;account_id:string;ticket_id:string|null;amount:number;method:string;note:string;actor:string;created_at:string;}
export interface PendingOrder {id:string;number:number;table_number:number;lines:(AddOrderLine)[];status:'pending'|'accepted'|'rejected';created_at:string;note:string;ticket_id:string|null;}
export interface AddOrderLine {item_id:string;name:string;variant:string;quantity:number;unit_price:number;note:string;}
export interface Staff {id:string;username:string;name:string;is_active:boolean;}
export interface PosSummary {open:Ticket[];recent:Ticket[];accounts:Account[];pending:PendingOrder[];today:{day_id:string;opened_at:string;opening_cash:number|null;last_closed_at:string|null;expected_cash:number;cash_in:number;cash_out:number;refunds:number;date:string;closed_count:number;cash:number;card:number;meal_card:number;account:number;discount:number;};}
export const paymentLabels:Record<PaymentMethod,string>={cash:'Nakit',card:'Kredi kartı',meal_card:'Yemek kartı',account:'Cari hesap'};
export const serviceLabels:Record<ServiceType,string>={table:'Masa',counter:'Kasa satışı',takeaway:'Paket servis'};
export function ticketLabel(t:Pick<Ticket,'service_type'|'table_number'|'account_name'|'number'>){return t.service_type==='table'?`Masa ${t.table_number}`:t.account_name||`Hızlı sipariş #${t.number}`;}
