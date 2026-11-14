'use client';
import { Button } from './ui/button';
export function ReceiptControls(){return <div className="no-print mx-auto mb-6 flex max-w-sm gap-3"><Button variant="outline" className="flex-1" onClick={()=>window.close()}>Kapat</Button><Button className="flex-1" onClick={()=>window.print()}>Yazdır</Button></div>;}
