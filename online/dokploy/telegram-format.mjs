export function telegramOrderText(order) {
  const lines = [
    '🤗 Yeni sipariş · ' + order.restaurant,
    'Sipariş kodu: ' + (order.orderCode || '—'),
    'Müşteri: ' + (String(order.customer || '').trim() || 'İsim belirtilmedi'),
    '━━━━━━━━━━━━━━━━',
    ''
  ];
  for (const item of order.items || []) {
    lines.push((item.quantity ?? '?') + '× ' + item.name);
    for (const option of item.options || []) lines.push('  ↳ ' + option);
    if (item.removed?.length) lines.push('  Çıkarılacak: ' + item.removed.join(', '));
  }
  if (order.note) lines.push('', '━━━━━━━━━━━━━━━━', '✍ ' + order.note);
  return lines.join('\n');
}

export function splitTelegramText(text) {
  const chunks = [];
  const characters = [...text];
  while (characters.length) chunks.push(characters.splice(0, 2000).join(''));
  return chunks;
}

export function telegramCourierText(order) {
  const customer = String(order.customer || '').trim();
  const lines = [
    '🛵 Kurye geliyor · ' + order.restaurant,
    customer ? customer + ' siparişi için kurye yaklaşıyor.' : 'Siparişiniz için kurye yaklaşıyor.',
    'Sipariş kodu: ' + (order.orderCode || '—'),
    '━━━━━━━━━━━━━━━━',
    ''
  ];
  for (const item of order.items || []) {
    lines.push((item.quantity ?? '?') + '× ' + item.name);
    for (const option of item.options || []) lines.push('  ↳ ' + option);
    if (item.removed?.length) lines.push('  Çıkarılacak: ' + item.removed.join(', '));
  }
  return lines.join('\n');
}
export function telegramMessageChunks(text) {
  const formatting = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    if (offset === 0 || /^(?:\d+|\?)× |^Sipariş kodu:/.test(line)) {
      formatting.push({type:'bold', offset, length:line.length});
    }
    offset += line.length + 1;
  }
  offset = 0;
  return splitTelegramText(text).map(chunk => {
    const start = offset;
    offset += chunk.length;
    const entities = formatting.filter(entity =>
      entity.offset < offset && entity.offset + entity.length > start
    ).map(entity => {
      const from = Math.max(start, entity.offset);
      const to = Math.min(offset, entity.offset + entity.length);
      return {type:entity.type, offset:from - start, length:to - from};
    });
    return {text:chunk, entities};
  });
}