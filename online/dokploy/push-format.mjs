export function orderPushPayload(order) {
  const payload = {
    title:'Yeni sipariş · ' + String(order.restaurant).slice(0, 200),
    body:(order.items || []).map(item =>
      (item.quantity == null ? '' : item.quantity + '× ') + String(item.name)
    ).join(' · '),
    tag:order.id,
    accept:order.status === 'Created'
  };
  const encode = () => JSON.stringify(payload);
  if (Buffer.byteLength(encode(), 'utf8') <= 3800) return encode();

  // Reserve space for Web Push encryption while keeping Unicode characters intact.
  const characters = [...payload.body];
  let start = 0;
  let end = characters.length;
  while (start < end) {
    const middle = Math.ceil((start + end) / 2);
    payload.body = characters.slice(0, middle).join('') + '…';
    if (Buffer.byteLength(encode(), 'utf8') <= 3800) start = middle;
    else end = middle - 1;
  }
  payload.body = characters.slice(0, start).join('') + '…';
  return encode();
}
