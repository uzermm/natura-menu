import type {DatabaseSync} from 'node:sqlite';
import {initAudit} from '../../online/portal/operation-audit.mjs';
export {audit,initAudit} from '../../online/portal/operation-audit.mjs';
export function auditRows(d:DatabaseSync,query=''){initAudit(d);const search='%'+query.slice(0,100).replace(/[\%_]/g,'')+'%';return d.prepare('SELECT * FROM operation_audit WHERE actor LIKE ? OR kind LIKE ? OR target LIKE ? ORDER BY id DESC LIMIT 50').all(search,search,search);}
