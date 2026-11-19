const result = document.querySelector('#telegramResult');
const button = document.querySelector('#telegramTest');
async function request(path, method = 'GET') {
 const response = await fetch(path, {method, headers:{'X-Panel-Request':'1'}});
 const data = await response.json();
 if (!response.ok) throw Error(data.error + (data.code ? ' (Kod ' + data.code + ')' : '') + (data.operation ? ' İşlem: ' + data.operation : '') + (data.network ? ' Bağlantı: ' + data.network : ''));
 return data;
}
request('/api/telegram/check').then(data => {
 if (!data.enabled) {
  result.textContent = 'Telegram bağlantısı kapalı. Bot anahtarı ' + (data.tokenConfigured ? 'kayıtlı' : 'eksik') +
   ', grup kimliği ' + (data.groupConfigured ? 'kayıtlı.' : 'eksik.');
  return;
 }
 result.textContent = '@' + data.bot + ' · ' + data.group + ' (' + data.chatId + ') · ' +
  (data.canSend ? 'Bot gruba bağlı.' : 'Botun mesaj iznini kontrol edin.') +
  ' Gönderim kayıtları: ' + (data.jobs.map(row => row.status + ' ' + row.count).join(', ') || 'Henüz yok.');
 button.hidden = !data.canSend;
}).catch(error => {result.textContent = error.message;});
button.onclick = async () => {
 button.disabled = true;
 const status = document.querySelector('#telegramTestResult');
 try {
  const data = await request('/api/telegram/test', 'POST');
  status.textContent = 'Telegram gruba gönderimi doğruladı. Mesaj numarası: ' + data.messageId;
 } catch (error) {
  status.textContent = error.message;
 } finally {
  button.disabled = false;
 }
};
