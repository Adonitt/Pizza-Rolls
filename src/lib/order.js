const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatPrice(cents) {
  return `${((Number(cents) || 0) / 100).toFixed(2).replace('.', ',')} €`;
}

export function getProduct(menu, id) {
  return menu?.products?.find((product) => product.id === id && product.available !== false);
}

function orderProductName(product) {
  const name = String(product?.name || '').trim();
  const normalizedName = name.toLocaleLowerCase('sq');
  if (product?.categoryId === 'pizza' && !normalizedName.startsWith('pizza ')) return `Pizza ${name}`;
  if (product?.categoryId === 'sandwich' && !normalizedName.startsWith('sanduiç ')) return `Sanduiç ${name}`;
  return name;
}

export function normalizeCart(value, menu) {
  if (!Array.isArray(value)) return [];
  const merged = new Map();
  for (const raw of value) {
    const product = getProduct(menu, raw?.productId);
    if (!product) continue;
    const variants = product.variants || [];
    const variantId = variants.length ? raw.variantId : null;
    if (variants.length && !variants.some((variant) => variant.id === variantId)) continue;
    const allowedExtras = new Set((product.extras || []).map((extra) => extra.id));
    const extraIds = [...new Set(Array.isArray(raw.extraIds) ? raw.extraIds : [])]
      .filter((id) => allowedExtras.has(id)).sort();
    const instructions = product.requiresInstructions ? String(raw.instructions || '').trim().slice(0, 250) : '';
    if (product.requiresInstructions && !instructions) continue;
    const quantity = Math.min(20, Math.max(1, Number.parseInt(raw.quantity, 10) || 1));
    const key = JSON.stringify([product.id, variantId, extraIds, instructions]);
    const current = merged.get(key);
    merged.set(key, {
      productId: product.id,
      variantId,
      extraIds,
      instructions,
      quantity: Math.min(20, (current?.quantity || 0) + quantity)
    });
  }
  return [...merged.values()];
}

export function cartDetails(cart, menu) {
  return normalizeCart(cart, menu).map((item) => {
    const product = getProduct(menu, item.productId);
    const variant = (product.variants || []).find((choice) => choice.id === item.variantId);
    const extras = (product.extras || []).filter((choice) => item.extraIds.includes(choice.id));
    const unitPriceCents = Number(variant?.priceCents ?? product.priceCents ?? 0)
      + extras.reduce((sum, extra) => sum + Number(extra.priceCents || 0), 0);
    return {
      ...item,
      name: orderProductName(product),
      variantName: variant?.name || '',
      extraNames: extras.map((extra) => extra.name),
      unitPriceCents,
      totalPriceCents: unitPriceCents * item.quantity
    };
  });
}

export function calculateTotals(cart, menu, method, zoneId, deliveryZones = []) {
  const lines = cartDetails(cart, menu);
  const subtotalCents = lines.reduce((sum, line) => sum + line.totalPriceCents, 0);
  const zone = method === 'delivery' ? deliveryZones.find((entry) => entry.id === zoneId) : null;
  const zonesConfigured = deliveryZones.length > 0;
  const deliveryCents = zone ? Number(zone.feeCents || 0) : 0;
  return {
    lines,
    subtotalCents,
    deliveryCents,
    totalCents: subtotalCents + deliveryCents,
    validZone: method === 'pickup' || !zonesConfigured || Boolean(zone),
    zoneName: zone?.name || (!zonesConfigured && method === 'delivery' ? 'adresa konfirmohet nga stafi' : '')
  };
}

function localParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

function minutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function isWithinHours(business, date = new Date()) {
  if (!Array.isArray(business?.hours) || business.hours.length === 0) return false;
  let parts;
  try { parts = localParts(date, business.timezone || 'Europe/Belgrade'); }
  catch { return false; }
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  if ((business.specialClosures || []).includes(dateKey)) return false;
  const day = weekdays.indexOf(parts.weekday);
  const now = Number(parts.hour) * 60 + Number(parts.minute);
  const slots = business.hours.filter((slot) => slot.day === day);
  if (slots.some((slot) => {
    const from = minutes(slot.open), to = minutes(slot.close);
    return from !== null && to !== null && from < to && now >= from && now < to;
  })) return true;
  if (slots.some((slot) => {
    const from = minutes(slot.open), to = minutes(slot.close);
    return from !== null && to !== null && to < from && now >= from;
  })) return true;
  const previousDay = (day + 6) % 7;
  return business.hours.some((slot) => {
    if (slot.day !== previousDay) return false;
    const from = minutes(slot.open), to = minutes(slot.close);
    return from !== null && to !== null && to < from && now < to;
  });
}

export function canOrder(business, menu, date = new Date()) {
  return business?.orderingEnabled === true
    && menu?.products?.some((product) => product.available !== false)
    && isWithinHours(business, date);
}

export function validateCheckout({ cart, menu, business, method, zoneId, name, phone, address, contactPreference = 'whatsapp', date = new Date() }) {
  const errors = {};
  if (!canOrder(business, menu, date)) errors.order = 'Porositë nuk pranohen për momentin.';
  if (!cartDetails(cart, menu).length) errors.cart = 'Shto të paktën një produkt në shportë.';
  if (!String(name || '').trim()) errors.name = 'Shkruaj emrin.';
  if (!/^\+?[0-9\s()-]{7,20}$/.test(String(phone || '').trim())) errors.phone = 'Shkruaj një numër telefoni të vlefshëm.';
  if (!['delivery', 'pickup'].includes(method)) errors.method = 'Zgjedh mënyrën e marrjes.';
  if (!['whatsapp', 'call'].includes(contactPreference)) errors.contactPreference = 'Zgjedh mënyrën e kontaktit.';
  if (method === 'delivery') {
    if (business.deliveryZones?.length && !business.deliveryZones.some((zone) => zone.id === zoneId)) errors.zone = 'Zgjedh zonën e dërgesës.';
    if (!String(address || '').trim()) errors.address = 'Shkruaj adresën e plotë.';
  }
  return errors;
}

export function buildWhatsAppMessage({ cart, menu, business, method, zoneId, name, phone, address, notes, contactPreference = 'whatsapp' }) {
  const totals = calculateTotals(cart, menu, method, zoneId, business.deliveryZones);
  const rows = [
    `Përshëndetje ${business.name}, dua të porosis:`,
    '',
    ...totals.lines.map((line) => {
      const choices = [line.variantName, ...line.extraNames, line.instructions].filter(Boolean).join(', ');
      return `• ${line.quantity} × ${line.name}${choices ? ` (${choices})` : ''} — ${formatPrice(line.totalPriceCents)}`;
    }),
    '',
    `Nëntotali: ${formatPrice(totals.subtotalCents)}`,
    method === 'delivery' ? `Dërgesa (${totals.zoneName}): ${totals.deliveryCents === 0 ? 'Falas' : formatPrice(totals.deliveryCents)}` : 'Marrje në lokal',
    `Totali: ${formatPrice(totals.totalCents)}`,
    '',
    `Emri: ${String(name).trim()}`,
    `Telefoni: ${String(phone).trim()}`,
    `Preferenca e kontaktit: ${contactPreference === 'call' ? 'Telefonatë — ju lutem më telefononi për konfirmim' : 'WhatsApp'}`
  ];
  if (method === 'delivery') rows.push(`Adresa: ${String(address).trim()}`);
  if (String(notes || '').trim()) rows.push(`Shënime: ${String(notes).trim()}`);
  rows.push('', 'Ju lutem, ma konfirmoni porosinë dhe kohën e përgatitjes. Pagesa bëhet në dorëzim/marrje.');
  return rows.join('\n');
}

export function buildWhatsAppUrl(number, message) {
  return `https://wa.me/${String(number).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
