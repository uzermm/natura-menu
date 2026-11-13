'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function PasswordForm(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 return <form className="max-w-2xl space-y-5 rounded-2xl border bg-white p-5 md:p-7" aria-labelledby="password-title" onSubmit={async event=>{
  event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
  const values={currentPassword:String(fields.get('currentPassword')),newPassword:String(fields.get('newPassword')),confirmPassword:String(fields.get('confirmPassword'))};
  setError('');setSuccess(false);
  if(values.newPassword!==values.confirmPassword){setError('Yeni şifreler eşleşmiyor.');return;}
  setBusy(true);
  try{await api('/api/admin/password',values);form.reset();setSuccess(true);}catch(error){setError((error as Error).message);}finally{setBusy(false);}
 }}>
  <div><h2 id="password-title" className="serif text-2xl">Yönetici şifresi</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Şifrenizi buradan değiştirebilirsiniz. Diğer cihazlardaki açık oturumlar kapatılır.</p></div>
  <div className="space-y-2"><Label htmlFor="current-password">Mevcut şifre</Label><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={256}/></div>
  <div className="space-y-2"><Label htmlFor="new-password">Yeni şifre</Label><Input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={256}/><p className="text-xs text-muted-foreground">En az 8 karakter kullanın.</p></div>
  <div className="space-y-2"><Label htmlFor="confirm-password">Yeni şifre tekrar</Label><Input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={256}/></div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {success&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">Şifreniz değiştirildi.</p>}
  <Button disabled={busy} className="h-12 w-full rounded-xl">{busy?'Değiştiriliyor…':'Şifreyi değiştir'}</Button>
 </form>;
}
