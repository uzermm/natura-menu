import type {Operator,OperatorRole} from './employee-session.ts';

const operations=['onlineOrders','onlineReviews','pos','quick','accounts','history','summary'];
export function panelSections(role:OperatorRole):string[]{
 if(role==='admin')return [...operations,'menu','settings'];
 if(role==='cashier')return operations;
 if(role==='waiter')return ['pos'];
 return role==='online_admin'?['onlineOrders','onlineReviews','settings']:['onlineOrders','onlineReviews'];
}
export function panelOperator(operator:Operator|null):Operator|null{
 if(!operator||!['cashier','waiter'].includes(operator.role))return operator;
 return {...operator,onlineAdmin:false};
}
