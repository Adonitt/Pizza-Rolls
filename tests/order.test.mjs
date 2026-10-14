import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeCart, calculateTotals, isWithinHours, canOrder, validateCheckout,
  buildWhatsAppMessage, buildWhatsAppUrl
} from '../src/lib/order.js';

const menu = JSON.parse(readFileSync(new URL('../src/data/menu.json', import.meta.url), 'utf8'));
const business = {
  name: 'Rolls Pizza & Coffee',
  phoneInternational: '38349378379',
  timezone: 'Europe/Belgrade',
  orderingEnabled: true,
  hours: Array.from({ length: 7 }, (_, day) => ({ day, open: '10:00', close: '02:00' })),
  deliveryZones: [{ id: 'test-zone', name: 'Zona provë', feeCents: 0 }],
  specialClosures: []
};
const openTime = new Date('2026-10-14T12:00:00Z');

test('menu includes every item from the supplied image and pizza size prices', () => {
  assert.deepEqual(
    menu.categories.map((category) => menu.products.filter((product) => product.categoryId === category.id).length),
    [16, 6, 14, 5]
  );
  assert.deepEqual(menu.products.find((product) => product.id === 'margarita').variants.map((variant) => variant.priceCents), [250, 500, 750, 1700]);
  assert.deepEqual(menu.products.find((product) => product.id === 'mexican-pizza').variants.map((variant) => variant.priceCents), [300, 600, 950, 2000]);
});

test('cart calculates sizes, separate sauces, and free covered delivery', () => {
  const cart = normalizeCart([
    { productId: 'margarita', variantId: '40', quantity: 2 },
    { productId: 'red-bull', quantity: 1 },
    { productId: 'salce-bbq', quantity: 1 }
  ], menu);
  const totals = calculateTotals(cart, menu, 'delivery', 'test-zone', business.deliveryZones);
  assert.equal(totals.subtotalCents, 1800);
  assert.equal(totals.deliveryCents, 0);
  assert.equal(totals.totalCents, 1800);
  assert.equal(totals.validZone, true);
  assert.equal(totals.lines[0].name, 'Pizza Margarita');
  assert.equal(calculateTotals(cart, menu, 'delivery', 'other', business.deliveryZones).validZone, false);
  assert.equal(calculateTotals(cart, menu, 'pickup', '', business.deliveryZones).deliveryCents, 0);
});

test('Pizza Juaj requires requested ingredients and keeps distinct custom orders', () => {
  const cart = normalizeCart([
    { productId: 'pizza-juaj', variantId: '30', quantity: 1, instructions: '' },
    { productId: 'pizza-juaj', variantId: '30', quantity: 1, instructions: 'misër' },
    { productId: 'pizza-juaj', variantId: '30', quantity: 1, instructions: 'kërpudha' }
  ], menu);
  assert.equal(cart.length, 2);
  assert.equal(cart[0].instructions, 'misër');
  assert.equal(cart[1].instructions, 'kërpudha');
});

test('10:00–02:00 includes after midnight and closes after 02:00', () => {
  assert.equal(isWithinHours(business, new Date('2026-10-14T08:00:00Z')), true);
  assert.equal(isWithinHours(business, new Date('2026-10-14T23:00:00Z')), true);
  assert.equal(isWithinHours(business, new Date('2026-10-15T00:30:00Z')), false);
  assert.equal(canOrder({ ...business, orderingEnabled: false }, menu, openTime), false);
});

test('checkout validates customer and zone then builds a readable WhatsApp draft', () => {
  const cart = normalizeCart([{ productId: 'pizza-juaj', variantId: '30', quantity: 1, instructions: 'misër dhe kërpudha' }], menu);
  const payload = {
    cart, menu, business, method: 'delivery', zoneId: 'test-zone', name: 'Arta',
    phone: '049 123 456', address: 'Rruga Test 12', notes: 'Hyrja B', date: openTime
  };
  assert.deepEqual(validateCheckout(payload), {});
  assert.equal(validateCheckout({ ...payload, zoneId: '' }).zone, 'Zgjedh zonën e dërgesës.');
  assert.equal(validateCheckout({ ...payload, address: '' }).address, 'Shkruaj adresën e plotë.');
  const message = buildWhatsAppMessage(payload);
  assert.match(message, /Pizza Juaj \(30 cm, misër dhe kërpudha\)/);
  assert.match(message, /Dërgesa \(Zona provë\):/);
  assert.match(message, /Adresa: Rruga Test 12/);
  const url = buildWhatsAppUrl(business.phoneInternational, message);
  assert.equal(new URL(url).hostname, 'wa.me');
  assert.equal(new URL(url).pathname, '/38349378379');
  assert.equal(new URL(url).searchParams.get('text'), message);
});

test('cart and WhatsApp label products clearly by category', () => {
  const cart = normalizeCart([
    { productId: 'tuna-pizza', variantId: '30', quantity: 1 },
    { productId: 'rolls', variantId: 'mini', quantity: 1 },
    { productId: 'sandwich-tuna', quantity: 1 }
  ], menu);
  const lines = calculateTotals(cart, menu, 'pickup', '', []).lines;
  assert.deepEqual(lines.map((line) => [line.name, line.variantName]), [
    ['Pizza Tuna', '30 cm'],
    ['Pizza Rolls', 'Mini'],
    ['Sanduiç Tuna', '']
  ]);
  const message = buildWhatsAppMessage({ cart, menu, business, method: 'pickup', zoneId: '', name: 'Arta', phone: '049 123 456', address: '', notes: '' });
  assert.match(message, /Pizza Tuna \(30 cm\)/);
  assert.match(message, /Pizza Rolls \(Mini\)/);
  assert.match(message, /Sanduiç Tuna/);
});

test('delivery without configured zones stays free and is confirmed by staff', () => {
  const cart = normalizeCart([{ productId: 'margarita', variantId: '30', quantity: 1 }], menu);
  const noZonesBusiness = { ...business, deliveryZones: [] };
  const payload = {
    cart, menu, business: noZonesBusiness, method: 'delivery', zoneId: '', name: 'Arta',
    phone: '049 123 456', address: 'Podujevë, afër qendrës', notes: '', date: openTime
  };
  assert.deepEqual(validateCheckout(payload), {});
  const totals = calculateTotals(cart, menu, 'delivery', '', []);
  assert.equal(totals.validZone, true);
  assert.equal(totals.deliveryCents, 0);
  assert.match(buildWhatsAppMessage(payload), /Dërgesa \(adresa konfirmohet nga stafi\): Falas/);
});
