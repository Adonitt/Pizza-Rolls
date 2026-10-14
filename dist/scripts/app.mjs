import {
  formatPrice, normalizeCart, cartDetails, calculateTotals, canOrder, isWithinHours,
  validateCheckout, buildWhatsAppMessage, buildWhatsAppUrl
} from './order.mjs';

const $ = (selector) => document.querySelector(selector);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);
const money = formatPrice;
const dayNames = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];

let business = null;
let menu = null;
let cart = [];
let selectedCategory = 'pizza';
let activeProduct = null;
let productQuantity = 1;
let cartToastTimer;

function saveCart() {
  try { localStorage.setItem('rolls-cart-v1', JSON.stringify(cart)); } catch {}
}

function readCart() {
  try { return JSON.parse(localStorage.getItem('rolls-cart-v1') || '[]'); } catch { return []; }
}

function showDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

function showCartToast(productName) {
  const toast = $('#cartToast');
  toast.textContent = `${productName} u shtua në shportë. Vazhdo me menynë ose hape shportën kur të jesh gati.`;
  toast.hidden = false;
  clearTimeout(cartToastTimer);
  cartToastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function categoryName(id) {
  return menu?.categories?.find((category) => category.id === id)?.name || id;
}

function renderBusiness() {
  if (!business) return;
  const telephone = `tel:+${business.phoneInternational}`;
  $('#headerPhone').href = telephone;
  $('#emptyPhone').href = telephone;
  $('#phoneText').href = telephone;
  $('#phoneText').textContent = business.phoneDisplay;
  const latitude = business.location?.latitude;
  const longitude = business.location?.longitude;
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const mapQuery = hasCoordinates ? `${latitude},${longitude}` : business.address;
  $('#addressText').textContent = business.address || (hasCoordinates ? 'Pika e saktë në hartë' : 'Lokacioni po konfirmohet');
  $('#mapLink').hidden = !mapQuery;
  if (mapQuery) $('#mapLink').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  $('#contactWhatsapp').href = `https://wa.me/${business.phoneInternational}`;
  const slots = Array.isArray(business.hours) ? business.hours : [];
  $('#hoursList').innerHTML = slots.length
    ? dayNames.map((day, index) => {
      const ranges = slots.filter((slot) => slot.day === index).map((slot) => `${safe(slot.open)}–${safe(slot.close)}`);
      return `<div class="hours-day"><span>${day}</span><span>${ranges.join(', ') || 'Mbyllur'}</span></div>`;
    }).join('')
    : 'Orari po konfirmohet';
  $('#zone').innerHTML = '<option value="">Zgjedh zonën</option>' + (business.deliveryZones || [])
    .map((zone) => `<option value="${safe(zone.id)}">${safe(zone.name)} — ${zone.feeCents === 0 ? 'Falas' : money(zone.feeCents)}</option>`).join('');
  $('#zoneField').hidden = !(business.deliveryZones || []).length;
  renderStatus();
}

function renderStatus() {
  if (!business || !menu) return;
  const status = $('#storeStatus');
  const label = status.querySelector('span:last-child');
  const ready = business.orderingEnabled && menu.products?.length;
  const open = ready && isWithinHours(business);
  status.classList.toggle('open', Boolean(open));
  label.textContent = !ready ? 'Porositë online aktivizohen së shpejti'
    : open ? 'Hapur për porosi' : 'Mbyllur për porosi — shiko orarin më poshtë';
  const enabled = canOrder(business, menu);
  $('#sendOrder').disabled = !enabled || cart.length === 0;
  $('#sendOrder').innerHTML = enabled
    ? 'Dërgo porosinë në WhatsApp <span aria-hidden="true">↗</span>'
    : 'Porositë online nuk janë aktive';
}

function renderMenu() {
  const products = (menu?.products || []).filter((product) => product.available !== false);
  const counts = new Map(menu.categories.map((category) => [category.id, products.filter((product) => product.categoryId === category.id).length]));
  $('#categoryList').innerHTML = menu.categories.filter((category) => counts.get(category.id))
    .map((category) => `<button type="button" class="category-pill ${category.id === selectedCategory ? 'active' : ''}" data-category="${safe(category.id)}" aria-pressed="${category.id === selectedCategory}">${safe(category.name)} <span>${counts.get(category.id)}</span></button>`).join('');
  const visible = products.filter((product) => product.categoryId === selectedCategory);
  $('#menuGrid').innerHTML = visible.map((product) => {
    const prices = (product.variants || []).map((variant) => Number(variant.priceCents));
    const from = prices.length ? Math.min(...prices) : Number(product.priceCents || 0);
    const image = product.image?.startsWith('./assets/') ? `<div class="menu-card-image"><img src="${safe(product.image)}" alt="" loading="lazy"></div>` : '';
    const priceList = prices.length ? `<div class="card-prices" aria-label="Çmimet sipas madhësisë">${product.variants.map((variant) =>
      `<span><small>${safe(variant.name)}</small><strong>${money(variant.priceCents)}</strong></span>`).join('')}</div>` : '';
    return `<article class="menu-card">
      ${image}<div class="menu-card-content">
        <div class="menu-card-title"><div><p class="menu-card-category">${safe(categoryName(product.categoryId))}</p><h3>${safe(product.name)}</h3></div><span class="card-number">${String(visible.indexOf(product) + 1).padStart(2, '0')}</span></div>
        <p class="menu-card-description">${safe(product.description || '')}</p>
        ${priceList}
        <div class="menu-card-bottom"><strong>${prices.length ? 'Nga ' : ''}${money(from)}</strong>
          <button type="button" data-product="${safe(product.id)}" aria-label="Zgjedh ${safe(product.name)}"><span>Shto</span> +</button></div>
      </div></article>`;
  }).join('');
  $('#emptyMenu').hidden = products.length > 0;
}

function productChoicePrice() {
  if (!activeProduct) return 0;
  const variantId = $('#productForm input[name="variant"]:checked')?.value;
  const variant = (activeProduct.variants || []).find((item) => item.id === variantId);
  const extras = [...$('#productForm').querySelectorAll('input[name="extra"]:checked')]
    .map((input) => (activeProduct.extras || []).find((extra) => extra.id === input.value))
    .filter(Boolean);
  return (Number(variant?.priceCents ?? activeProduct.priceCents ?? 0)
    + extras.reduce((sum, extra) => sum + Number(extra.priceCents || 0), 0)) * productQuantity;
}

function updateProductPrice() {
  $('#productQuantity').textContent = productQuantity;
  $('#productPrice').textContent = money(productChoicePrice());
}

function openProduct(id) {
  activeProduct = menu.products.find((product) => product.id === id);
  if (!activeProduct) return;
  productQuantity = 1;
  $('#productTitle').textContent = activeProduct.name;
  $('#productDescription').textContent = activeProduct.description || '';
  let choices = '';
  if (activeProduct.variants?.length) {
    choices += `<fieldset class="choice-group"><legend>Madhësia</legend>${activeProduct.variants.map((variant, index) =>
      `<label class="choice-option"><span><input type="radio" name="variant" value="${safe(variant.id)}" ${index === 0 ? 'checked' : ''}> ${safe(variant.name)}</span><strong>${money(variant.priceCents)}</strong></label>`
    ).join('')}</fieldset>`;
  }
  if (activeProduct.extras?.length) {
    choices += `<fieldset class="choice-group"><legend>Shtesat</legend>${activeProduct.extras.map((extra) =>
      `<label class="choice-option"><span><input type="checkbox" name="extra" value="${safe(extra.id)}"> ${safe(extra.name)}</span><strong>+${money(extra.priceCents)}</strong></label>`
    ).join('')}</fieldset>`;
  }
  if (activeProduct.requiresInstructions) {
    choices += '<label class="custom-label" for="productInstructions">Përbërësit që dëshiron</label><textarea id="productInstructions" name="instructions" rows="3" maxlength="250" placeholder="Shkruaji përbërësit këtu" required></textarea>';
  }
  $('#productChoices').innerHTML = choices;
  updateProductPrice();
  showDialog($('#productDialog'));
}

function renderCart() {
  if (!menu || !business) return;
  cart = normalizeCart(cart, menu);
  const lines = cartDetails(cart, menu);
  $('#cartCount').textContent = lines.reduce((sum, line) => sum + line.quantity, 0);
  $('#mobileCartCount').textContent = $('#cartCount').textContent;
  $('#mobileCart').hidden = lines.length === 0;
  $('#mobileCartTotal').innerHTML = `${money(lines.reduce((sum, line) => sum + line.totalPriceCents, 0))} <span aria-hidden="true">↗</span>`;
  $('#cartItems').innerHTML = lines.length ? lines.map((line, index) => `
    <div class="cart-line"><div><h3>${safe(line.name)}</h3>
      <small>${safe([line.variantName, ...line.extraNames, line.instructions].filter(Boolean).join(' • '))}</small>
      <strong>${money(line.totalPriceCents)}</strong></div>
      <div class="cart-line-actions"><button type="button" data-cart-index="${index}" data-cart-action="minus" aria-label="Ule sasinë e ${safe(line.name)}">−</button><span>${line.quantity}</span><button type="button" data-cart-index="${index}" data-cart-action="plus" aria-label="Rrite sasinë e ${safe(line.name)}">+</button><button type="button" class="remove-line" data-cart-index="${index}" data-cart-action="remove">Hiqe</button></div>
    </div>`).join('') : '<p class="cart-empty">Shporta është bosh. Zgjedh një produkt nga menuja.</p>';
  $('#checkoutForm').hidden = lines.length === 0;
  saveCart();
  updateTotals();
  renderStatus();
}

function updateTotals() {
  if (!menu || !business) return;
  const method = $('#checkoutForm input[name="method"]:checked')?.value || 'delivery';
  const zoneId = $('#zone').value;
  const totals = calculateTotals(cart, menu, method, zoneId, business.deliveryZones);
  $('#deliveryFields').hidden = method !== 'delivery';
  $('#deliveryRow').hidden = method !== 'delivery';
  $('#zone').required = method === 'delivery' && (business.deliveryZones || []).length > 0;
  $('#address').required = method === 'delivery';
  $('#subtotal').textContent = money(totals.subtotalCents);
  $('#deliveryFee').textContent = totals.validZone ? (totals.deliveryCents === 0 ? 'Falas' : money(totals.deliveryCents)) : 'Zgjedh zonën';
  $('#grandTotal').textContent = totals.validZone ? money(totals.totalCents) : '—';
}

function setCartQuantity(index, action) {
  const item = cart[index];
  if (!item) return;
  if (action === 'remove' || (action === 'minus' && item.quantity === 1)) cart.splice(index, 1);
  else if (action === 'plus') item.quantity = Math.min(20, item.quantity + 1);
  else if (action === 'minus') item.quantity -= 1;
  renderCart();
}

function bindEvents() {
  $('#openCart').addEventListener('click', () => showDialog($('#cartDialog')));
  $('#mobileCart').addEventListener('click', () => showDialog($('#cartDialog')));
  $('#closeCart').addEventListener('click', () => $('#cartDialog').close());
  $('#closeProduct').addEventListener('click', () => $('#productDialog').close());
  $('#categoryList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    renderMenu();
  });
  $('#menuGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-product]');
    if (button) openProduct(button.dataset.product);
  });
  $('#productForm').addEventListener('change', updateProductPrice);
  $('#productMinus').addEventListener('click', () => { productQuantity = Math.max(1, productQuantity - 1); updateProductPrice(); });
  $('#productPlus').addEventListener('click', () => { productQuantity = Math.min(20, productQuantity + 1); updateProductPrice(); });
  $('#productForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeProduct) return;
    const instructions = $('#productInstructions')?.value.trim() || '';
    if (activeProduct.requiresInstructions && !instructions) {
      $('#productInstructions').reportValidity();
      return;
    }
    const variantId = $('#productForm input[name="variant"]:checked')?.value || null;
    const extraIds = [...$('#productForm').querySelectorAll('input[name="extra"]:checked')].map((input) => input.value);
    cart = normalizeCart([...cart, { productId: activeProduct.id, variantId, extraIds, instructions, quantity: productQuantity }], menu);
    $('#productDialog').close();
    renderCart();
    showCartToast(activeProduct.name);
  });
  $('#cartItems').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (button) setCartQuantity(Number(button.dataset.cartIndex), button.dataset.cartAction);
  });
  $('#checkoutForm').addEventListener('change', updateTotals);
  $('#checkoutForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const method = form.elements.method.value;
    const payload = {
      cart, menu, business, method, zoneId: $('#zone').value,
      name: $('#customerName').value, phone: $('#customerPhone').value,
      address: $('#address').value, notes: $('#notes').value
    };
    const errors = validateCheckout(payload);
    const errorBox = $('#checkoutError');
    if (Object.keys(errors).length) {
      errorBox.textContent = Object.values(errors)[0];
      errorBox.hidden = false;
      const target = { name: '#customerName', phone: '#customerPhone', zone: '#zone', address: '#address' }[Object.keys(errors)[0]];
      if (target) $(target).focus();
      return;
    }
    errorBox.hidden = true;
    const message = buildWhatsAppMessage(payload);
    window.location.assign(buildWhatsAppUrl(business.phoneInternational, message));
  });
  for (const dialog of [$('#cartDialog'), $('#productDialog')]) {
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  }
  setInterval(() => { renderStatus(); }, 60_000);
}

async function init() {
  bindEvents();
  try {
    const [menuResponse, businessResponse] = await Promise.all([
      fetch('./data/menu.json'), fetch('./data/business.json')
    ]);
    if (!menuResponse.ok || !businessResponse.ok) throw new Error('Data unavailable');
    [menu, business] = await Promise.all([menuResponse.json(), businessResponse.json()]);
    cart = normalizeCart(readCart(), menu);
    renderBusiness();
    renderMenu();
    renderCart();
  } catch {
    $('#emptyMenu').querySelector('h3').textContent = 'Menuja nuk u ngarkua.';
    $('#emptyMenu').querySelector('p:not(.section-kicker)').textContent = 'Provo përsëri më vonë ose na telefono.';
    $('#storeStatus').querySelector('span:last-child').textContent = 'Porositë online nuk janë aktive';
  }
}

init();
