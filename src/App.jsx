import React, { useEffect, useMemo, useRef, useState } from 'react';
import menu from './data/menu.json';
import business from './data/business.json';
import {
  buildWhatsAppMessage, buildWhatsAppUrl, calculateTotals, canOrder,
  cartDetails, formatPrice, normalizeCart, validateCheckout
} from './lib/order.js';

const dayNames = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];
const sizeDescriptions = { mini: 'E vogël', '30': 'E mesme · 1 person', '40': 'Për 2 persona', '60': 'Familjare' };
const pizzaImageFiles = {
  'pershuto-pizza': 'pershuto.webp',
  'tuna-pizza': 'tuna.webp',
  'loca-pizza': 'loca.webp',
  'fungi-heaven': 'fungi.jpg',
  oriental: 'oriental.jpg',
  'vegetarian-pizza': 'vegetariane.jpg',
  macho: 'macho.jpg',
  'pizza-juaj': 'pizza-juaj.webp',
  'mexican-pizza': 'mexican.webp',
  chike: 'chike.webp',
  'kater-djathrat': '4-djathrat.webp',
  peperoni: 'peperoni.webp',
};
const pizzaImagesWithBlackBackground = new Set(['fungi-heaven', 'oriental', 'vegetarian-pizza', 'macho']);
const pizzaImagePath = (productId) => `/assets/pizzas/${pizzaImageFiles[productId] || `${productId}.webp`}`;
const sandwichImageFiles = {
  'sandwich-proshuto': 'sandwich pershuto.webp',
  'sandwich-suxhuk': 'sandwich suxhuk.webp',
  'sandwich-pule': 'sandwich pule.webp',
  'sandwich-mix': 'sandwich mix.webp',
  'sandwich-tuna': 'sandwich tuna.webp',
};
const sandwichImagePath = (productId) => `/assets/sandwiches/${encodeURIComponent(sandwichImageFiles[productId])}`;
const sauceImageFiles = {
  'salce-bbq': 'salce-bbq.webp',
  'salce-macho': 'salce-macho.webp',
  'salce-classic': 'salce-classic.webp',
  'salce-mexican': 'salce-mexican.webp',
  'salce-loca': 'salce-loca.webp',
};
const sauceImagePath = (productId) => `/assets/sauces/${sauceImageFiles[productId]}`;
const drinkImageFiles = {
  molle: 'molle.webp',
  boronic: 'boronice.webp',
  'coca-cola': 'coca-cola.webp',
  'coca-cola-zero': 'coca-cola-zero.webp',
  'fanta-exotic': 'fanta-exotic.webp',
  'fanta-orange': 'fanta-orange.webp',
  'ice-tea': 'ice-tea.webp',
  dredhez: 'dredhez.webp',
  pjeshke: 'pjeshke.webp',
  portokall: 'portokall.webp',
  'red-bull': 'red-bull.webp',
  'schweppes-tonic': 'schweppes-tonic.webp',
  schweppes: 'schweppes.webp',
  sprite: 'sprite.webp',
};
const drinkImagePath = (productId) => `/assets/pije/${drinkImageFiles[productId]}`;

function ArrowIcon() {
  return <svg className="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

function loadCart() {
  try { return normalizeCart(JSON.parse(localStorage.getItem('rolls-cart-v1') || '[]'), menu); }
  catch { return []; }
}

function Header({ count, onOpenCart }) {
  return <header className="site-header"><div className="shell header-inner">
    <a className="brand" href="#krye" aria-label="Rolls Pizza & Coffee, kthehu në fillim"><img className="brand-stamp" src="/assets/rolls-logo.jpg" alt="" width="44" height="44" /><span className="brand-copy"><strong>ROLLS</strong><small>PIZZA & COFFEE</small></span></a>
    <nav className="desktop-nav" aria-label="Navigimi kryesor"><a href="#menu">Menuja</a><a href="#si-funksionon">Si funksionon</a><a href="#na-gjej">Na gjej</a></nav>
    <div className="header-actions"><a className="phone-link" href={`tel:+${business.phoneInternational}`}>Na thirr</a><button className="header-cart" type="button" aria-label="Hap shportën" onClick={onOpenCart}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.3a2 2 0 0 0 2 1.7H19a2 2 0 0 0 2-1.6L22 8H6M10 20h.01M18 20h.01" /></svg><span>Shporta</span><b>{count}</b></button></div>
  </div></header>;
}

function Hero() {
  const open = canOrder(business, menu);
  const ready = business.orderingEnabled && menu.products.some((product) => product.available !== false);
  return <section className="hero" id="krye">
    <div className="hero-noise" aria-hidden="true" />
    <div className="shell hero-layout">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> PODUJEVË • PIZZA & COFFEE</p><h1>Një kafshatë,<br /><em>edhe një.</em></h1><p className="hero-intro">Hape menynë, zgjidh çka të pëlqen dhe përgatite porosinë për dërgesë ose marrje në lokal. Dërgesa është falas në zonat që i mbulojmë.</p><div className="hero-cta"><a className="button button-red" href="#menu">Shiko menynë <ArrowIcon /></a><a className="text-link" href="#na-gjej">Ku na gjen <ArrowIcon /></a></div><div className={`hero-status ${open ? 'open' : ''}`} role="status" aria-live="polite"><span className="status-dot" /><span>{!ready ? 'Porositë online aktivizohen së shpejti' : open ? 'Hapur për porosi' : 'Lokali është i mbyllur. Hapet çdo ditë nga 10:00 deri në 02:00 të natës.'}</span></div></div>
      <div className="hero-visual"><div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" /><span className="hero-side-note" aria-hidden="true">ROLLS / PODUJEVË / PIZZA & COFFEE</span><div className="logo-plate"><img src="/assets/rolls-logo.jpg" alt="Logoja zyrtare e Pizza Rolls Coffee" width="960" height="960" /></div><div className="hero-seal" aria-hidden="true"><span>01</span><small>Shije<br />për çdo ditë</small></div></div>
    </div>
    <div className="ticker" aria-hidden="true"><div className="ticker-track">PIZZA <span>✦</span> COFFEE <span>✦</span> PODUJEVË <span>✦</span> ROLLS <span>✦</span> PIZZA <span>✦</span> COFFEE <span>✦</span> PODUJEVË <span>✦</span> ROLLS <span>✦</span></div></div>
  </section>;
}

function MenuSection({ onChoose }) {
  const firstCategory = menu.categories.find((category) => menu.products.some((product) => product.categoryId === category.id))?.id;
  const [selectedCategory, setSelectedCategory] = useState(firstCategory || 'pizza');
  const menuGridRef = useRef(null);
  const previousCategoryRef = useRef(selectedCategory);
  const products = menu.products.filter((product) => product.available !== false);
  const visible = products.filter((product) => product.categoryId === selectedCategory);
  const categoryName = (id) => menu.categories.find((category) => category.id === id)?.name || id;
  useEffect(() => {
    if (previousCategoryRef.current === selectedCategory) return;
    previousCategoryRef.current = selectedCategory;
    menuGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedCategory]);
  return <section className="menu-section section-pad" id="menu"><div className="shell">
    <div className="section-heading"><div><p className="section-kicker">01 / MENYJA</p><h2>Çka të hahet <em>sot?</em></h2></div><p>Çdo produkt veçmas, me përbërës dhe çmime të qarta. Zgjedh madhësinë e pizzës, pastaj dërgo porosinë në WhatsApp.</p></div>
    <a className="source-menu-link" href="/assets/menu-original.png" target="_blank" rel="noreferrer">Shiko menynë origjinale <ArrowIcon /></a>
    <div className="menu-controls" aria-label="Kategoritë e menysë">{menu.categories.map((category) => { const count = products.filter((product) => product.categoryId === category.id).length; return count > 0 && <button key={category.id} type="button" className={`category-pill ${category.id === selectedCategory ? 'active' : ''}`} aria-pressed={category.id === selectedCategory} onClick={() => setSelectedCategory(category.id)}>{category.name} <span>{count}</span></button>; })}</div>
    <div className="menu-grid" ref={menuGridRef} aria-live="polite">{visible.map((product, index) => {
      const prices = (product.variants || []).map((variant) => Number(variant.priceCents));
      const from = prices.length ? Math.min(...prices) : Number(product.priceCents || 0);
      const isPizza = product.categoryId === 'pizza';
      const isSandwich = product.categoryId === 'sandwich';
      const hasDrinkImage = product.categoryId === 'drinks' && drinkImageFiles[product.id];
      const hasSauceImage = product.categoryId === 'sauces' && sauceImageFiles[product.id];
      const hasSandwichImage = isSandwich && sandwichImageFiles[product.id];
      return <article className={`menu-card ${isPizza ? 'menu-card-pizza' : ''} ${hasDrinkImage ? `menu-card-drink menu-card-drink-${product.id}` : ''} ${hasSauceImage ? 'menu-card-sauce' : ''} ${isSandwich ? 'menu-card-sandwich' : ''}`} key={product.id}>
        {isPizza && <div className={`menu-card-image ${pizzaImagesWithBlackBackground.has(product.id) ? 'menu-card-image-black-background' : ''}`}><div className="pizza-image-placeholder" aria-hidden="true"><span className="pizza-placeholder-plate" /><span>FOTO E PICËS</span></div><span className="pizza-image-badge">{product.highlight || 'ROLLS / PIZZA'}</span><img src={pizzaImagePath(product.id)} alt={`Pizza ${product.name}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>}
        {hasDrinkImage && <div className="menu-card-image"><span className="drink-image-placeholder" aria-hidden="true">ROLLS / PIJE</span><span className="pizza-image-badge">ROLLS / PIJE</span><img src={drinkImagePath(product.id)} alt={`Pije ${product.name}`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>}
        {hasSauceImage && <div className="menu-card-image menu-card-image-sauce"><span className="pizza-image-badge">ROLLS / SALCË</span><img src={sauceImagePath(product.id)} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>}
        {isSandwich && <div className="menu-card-image menu-card-image-sandwich menu-card-image-black-background"><span className="pizza-image-badge">ROLLS / SANDUIÇ</span>{hasSandwichImage ? <img src={sandwichImagePath(product.id)} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span className="sandwich-image-placeholder">FOTO E SANDUIÇIT</span>}</div>}
        <div className="menu-card-content">
          <div className="menu-card-title"><div><p className="menu-card-category">{categoryName(product.categoryId)}</p><h3>{product.name}</h3></div><span className="card-number">{String(index + 1).padStart(2, '0')}</span></div>
          <p className="menu-card-description">{product.description || ''}</p>
          {isPizza && product.variants?.length > 0 && <div className="card-prices" aria-label="Çmimet sipas madhësisë">{product.variants.map((variant) => <span key={variant.id}><small>{variant.name}</small><strong>{formatPrice(variant.priceCents)}</strong></span>)}</div>}
          <div className="menu-card-bottom"><strong>{prices.length ? 'Nga ' : ''}{formatPrice(from)}</strong><button type="button" onClick={() => onChoose(product)} aria-label={`Zgjedh ${product.name}`}><span>Shto</span> +</button></div>
        </div>
      </article>;
    })}</div>
  </div></section>;
}

function ProductDialog({ product, onClose, onAdd }) {
  const ref = useRef(null);
  const [variantId, setVariantId] = useState('');
  const [extraIds, setExtraIds] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    if (!product) return;
    setVariantId(product.variants?.[0]?.id || ''); setExtraIds([]); setInstructions(''); setQuantity(1);
    if (!ref.current.open) ref.current.showModal();
  }, [product]);
  if (!product) return null;
  const variant = product.variants?.find((item) => item.id === variantId);
  const extrasPrice = (product.extras || []).filter((item) => extraIds.includes(item.id)).reduce((sum, item) => sum + Number(item.priceCents || 0), 0);
  const price = (Number(variant?.priceCents ?? product.priceCents ?? 0) + extrasPrice) * quantity;
  const isPizza = product.categoryId === 'pizza';
  const hasSandwichImage = product.categoryId === 'sandwich' && Boolean(sandwichImageFiles[product.id]);
  const hasDrinkImage = product.categoryId === 'drinks' && Boolean(drinkImageFiles[product.id]);
  const hasSauceImage = product.categoryId === 'sauces' && Boolean(sauceImageFiles[product.id]);
  const hasProductImage = isPizza || hasSandwichImage || hasDrinkImage || hasSauceImage;
  const productImageSrc = isPizza ? pizzaImagePath(product.id) : hasSandwichImage ? sandwichImagePath(product.id) : hasDrinkImage ? drinkImagePath(product.id) : sauceImagePath(product.id);
  const productImageCategory = isPizza ? 'PIZZA' : hasSandwichImage ? 'SANDUIÇ' : hasDrinkImage ? 'PIJE' : 'SALCË';
  const productImageFallback = isPizza ? '🍕' : hasSandwichImage ? '🥪' : hasDrinkImage ? '🥤' : '🥣';
  const submit = (event) => {
    event.preventDefault();
    if (product.requiresInstructions && !instructions.trim()) return;
    onAdd({ productId: product.id, variantId: product.variants?.length ? variantId : null, extraIds, instructions: instructions.trim(), quantity });
    ref.current.close(); onClose();
  };
  return <dialog className="product-dialog" ref={ref} onClose={onClose}><form onSubmit={submit}>
    {hasProductImage && <div className={`product-dialog-image product-dialog-image-${product.categoryId}`}><img src={productImageSrc} alt={`${productImageCategory} ${product.name}`} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling.hidden = false; }} /><div className="product-image-fallback" hidden aria-hidden="true">{productImageFallback}<small>ROLLS / {productImageCategory}</small></div><span className="pizza-image-badge">ROLLS / {productImageCategory}</span><button type="button" className="icon-close" aria-label="Mbyll" onClick={() => ref.current.close()}>×</button></div>}
    <div className="dialog-head"><p className="section-kicker">SHTO NË SHPORTË</p>{!hasProductImage && <button type="button" className="icon-close" aria-label="Mbyll" onClick={() => ref.current.close()}>×</button>}</div><h2>{product.name}</h2><p>{product.description || ''}</p>
    {product.variants?.length > 0 && <fieldset className="choice-group"><legend>Madhësia e pizzës</legend>{product.variants.map((item) => <label className={`choice-option ${variantId === item.id ? 'selected' : ''}`} key={item.id}><span><input type="radio" name="variant" value={item.id} checked={variantId === item.id} onChange={() => setVariantId(item.id)} /> <span><b>{item.name}</b><small>{sizeDescriptions[item.id]}</small></span></span><strong>{formatPrice(item.priceCents)}</strong></label>)}</fieldset>}
    {product.extras?.length > 0 && <fieldset className="choice-group"><legend>Shtesat</legend>{product.extras.map((item) => <label className={`choice-option ${extraIds.includes(item.id) ? 'selected' : ''}`} key={item.id}><span><input type="checkbox" checked={extraIds.includes(item.id)} onChange={() => setExtraIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} /> <b>{item.name}</b></span><strong>+{formatPrice(item.priceCents)}</strong></label>)}</fieldset>}
    {product.requiresInstructions && <><label className="custom-label" htmlFor="productInstructions">Përbërësit që dëshiron</label><textarea id="productInstructions" rows="3" value={instructions} onChange={(event) => setInstructions(event.target.value)} required placeholder="Shkruaj përbërësit e preferuar" /></>}
    <div className="quantity-control"><span>Sasia</span><div><button type="button" aria-label="Ule sasinë" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><output>{quantity}</output><button type="button" aria-label="Rrite sasinë" onClick={() => setQuantity((value) => Math.min(20, value + 1))}>+</button></div></div><button className="button button-red dialog-add" type="submit"><span className="dialog-add-label">Shto në shportë</span><strong className="dialog-add-price">{formatPrice(price)}</strong><span className="dialog-add-arrow"><ArrowIcon /></span></button>
  </form></dialog>;
}

function CartDialog({ open, cart, onClose, onChangeCart }) {
  const ref = useRef(null);
  const [method, setMethod] = useState('delivery');
  const [form, setForm] = useState({ zoneId: '', name: '', phone: '', address: '', notes: '' });
  const [error, setError] = useState('');
  const lines = useMemo(() => cartDetails(cart, menu), [cart]);
  const totals = useMemo(() => calculateTotals(cart, menu, method, form.zoneId, business.deliveryZones), [cart, method, form.zoneId]);
  useEffect(() => { if (open && !ref.current.open) ref.current.showModal(); if (!open && ref.current?.open) ref.current.close(); }, [open]);
  const update = (index, quantity) => {
    const next = cart.map((item, itemIndex) => itemIndex === index ? { ...item, quantity } : item);
    onChangeCart(normalizeCart(quantity <= 0 ? next.filter((_, itemIndex) => itemIndex !== index) : next, menu));
  };
  const submit = (event) => {
    event.preventDefault();
    const payload = { cart, menu, business, method, zoneId: form.zoneId, name: form.name, phone: form.phone, address: form.address, notes: form.notes };
    const errors = validateCheckout(payload);
    if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return; }
    setError(''); window.location.assign(buildWhatsAppUrl(business.phoneInternational, buildWhatsAppMessage(payload)));
  };
  const orderOpen = canOrder(business, menu);
  return <dialog className="cart-dialog" ref={ref} onClose={onClose}><div className="cart-panel">
    <div className="dialog-head"><div><p className="section-kicker">POROSIA JOTE</p><h2>Shporta</h2></div><button type="button" className="icon-close" aria-label="Mbyll shportën" onClick={() => ref.current.close()}>×</button></div>
    <div className="cart-scroll">{!lines.length ? <div className="cart-empty">Shporta është e zbrazët. Zgjedh produktet nga menuja dhe kthehu këtu kur të jesh gati.</div> : lines.map((line, index) => { const product = menu.products.find((item) => item.id === line.productId); const isPizza = product?.categoryId === 'pizza'; const hasDrinkImage = product?.categoryId === 'drinks' && Boolean(drinkImageFiles[product.id]); const hasSauceImage = product?.categoryId === 'sauces' && Boolean(sauceImageFiles[product.id]); const hasSandwichImage = product?.categoryId === 'sandwich' && Boolean(sandwichImageFiles[product.id]); const hasImage = isPizza || hasDrinkImage || hasSauceImage || hasSandwichImage; const imageSrc = isPizza ? pizzaImagePath(line.productId) : hasDrinkImage ? drinkImagePath(line.productId) : hasSauceImage ? sauceImagePath(line.productId) : sandwichImagePath(line.productId); const imageAlt = isPizza ? `Pizza ${product.name}` : hasDrinkImage ? `Pije ${product.name}` : hasSandwichImage ? `Sanduiç ${product.name}` : product.name; return <div className="cart-line" key={`${line.productId}-${line.variantId}-${line.instructions}-${index}`}>
        <div className="cart-line-product">{hasImage && <span className={`cart-line-image-wrap ${hasDrinkImage ? 'cart-line-image-wrap-drink' : ''} ${hasSauceImage ? 'cart-line-image-wrap-sauce' : ''} ${hasSandwichImage ? 'cart-line-image-wrap-sandwich' : ''}`}><img className="cart-line-image" src={imageSrc} alt={imageAlt} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling.hidden = false; }} /><span className="cart-line-image-fallback" hidden aria-hidden="true">{isPizza ? '🍕' : hasDrinkImage ? '🥤' : hasSandwichImage ? '🥪' : '🥣'}</span></span>}<div><h3>{line.name}</h3><small>{[line.variantName, ...line.extraNames, line.instructions].filter(Boolean).join(', ')}</small><strong>{formatPrice(line.totalPriceCents)}</strong></div></div>
        <div className="cart-line-actions"><button type="button" aria-label="Ule sasinë" onClick={() => update(index, line.quantity - 1)}>−</button><span>{line.quantity}</span><button type="button" aria-label="Rrite sasinë" onClick={() => update(index, Math.min(20, line.quantity + 1))}>+</button><button type="button" className="remove-line" onClick={() => update(index, 0)}>Hiqe</button></div>
      </div>; })}
      <form id="checkoutForm" noValidate onSubmit={submit}><fieldset className="method-fieldset"><legend>Si dëshiron ta marrësh?</legend><label><input type="radio" name="method" value="delivery" checked={method === 'delivery'} onChange={() => setMethod('delivery')} /><span>Dërgesë</span></label><label><input type="radio" name="method" value="pickup" checked={method === 'pickup'} onChange={() => setMethod('pickup')} /><span>Marrje në lokal</span></label></fieldset>
        {method === 'delivery' && <div>{business.deliveryZones.length > 0 && <div><label htmlFor="zone">Zona e dërgesës</label><select id="zone" value={form.zoneId} onChange={(event) => setForm({ ...form, zoneId: event.target.value })}><option value="">Zgjedh zonën</option>{business.deliveryZones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name} — {zone.feeCents === 0 ? 'Falas' : formatPrice(zone.feeCents)}</option>)}</select></div>}<label htmlFor="address">Adresa e plotë</label><input id="address" autoComplete="street-address" placeholder="Rruga, numri, pika orientuese" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /><p className="delivery-coverage">Dërgesa është falas. Stafi e konfirmon mbulimin e adresës në WhatsApp.</p></div>}
        <div className="field-pair"><div><label htmlFor="customerName">Emri dhe mbiemri</label><input id="customerName" autoComplete="name" placeholder="Shkruaj emrin dhe mbiemrin" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div><div><label htmlFor="customerPhone">Telefoni</label><input id="customerPhone" autoComplete="tel" inputMode="tel" placeholder="+383 4X XXX XXX" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></div></div>
        <p className="checkout-accuracy-note" role="note"><span aria-hidden="true">!</span><span><strong>Të dhënat duhet të jenë të sakta.</strong> Shëno emrin dhe mbiemrin, numrin e telefonit{method === 'delivery' ? ' dhe adresën e plotë të dërgesës' : ''}. Pa këto të dhëna, stafi nuk mund ta konfirmojë porosinë.</span></p>
        <label htmlFor="notes">Shënime për porosinë <span className="optional">(opsionale)</span></label><textarea id="notes" rows="2" placeholder="P.sh. 1/4 Macho, ose gjysma e Shtëpisë e gjysma Peshk" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        <div className="totals"><div><span>Nëntotali</span><strong>{formatPrice(totals.subtotalCents)}</strong></div>{method === 'delivery' && <div><span>Dërgesa</span><strong>{totals.validZone ? (totals.deliveryCents === 0 ? 'Falas' : formatPrice(totals.deliveryCents)) : 'Zgjedh zonën'}</strong></div>}<div className="grand-total"><span>Totali</span><strong>{formatPrice(totals.totalCents)}</strong></div></div>
        <p className="payment-note">Pagesa bëhet në dorëzim ose marrje. Dërgimi në WhatsApp nuk e konfirmon automatikisht porosinë.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-red send-order" type="submit" disabled={!orderOpen || !lines.length}>{orderOpen ? 'Dërgo porosinë në WhatsApp' : 'Mbyllur — hapet në 10:00'} <ArrowIcon /></button><p className="send-hint">Në WhatsApp shtyp “Dërgo” dhe prit konfirmimin nga stafi.</p>
      </form>
    </div>
  </div></dialog>;
}

function ProcessSection() {
  const steps = [['Zgjedh', 'Shto në shportë produktet që dëshiron dhe kontrollo shumën.'], ['Vendos', 'Zgjedh dërgesë falas në zonat e mbuluara ose marrje në lokal.'], ['Konfirmo', 'Dërgo mesazhin në WhatsApp dhe prit përgjigjen e stafit me kohën e përgatitjes.']];
  return <section className="process-section section-pad" id="si-funksionon"><div className="shell process-layout"><div className="process-lead"><p className="section-kicker">02 / POROSIA</p><h2>E thjeshtë,<br /><em>si duhet.</em></h2><p>Porosia përgatitet në faqe dhe konfirmohet nga stafi ynë në WhatsApp.</p></div><div className="steps">{steps.map(([title, text], index) => <article className="step" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div><b aria-hidden="true"><ArrowIcon /></b></article>)}</div></div></section>;
}

function VisitSection() {
  const { latitude, longitude } = business.location;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
  return <section className="visit-section section-pad" id="na-gjej"><div className="shell visit-layout">
    <div className="visit-copy"><p className="section-kicker">03 / NA GJEJ</p><h2>Na gjen në <em>Podujevë.</em></h2><p>Na vizito në lokacionin tonë në Podujevë, ose na telefono për udhëzime.</p><div className="map-embed"><iframe src={embedUrl} title="Lokacioni i Rolls Pizza në Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></div>
    <div className="visit-card"><div className="card-top"><span>ROLLS / PIZZA & COFFEE</span><svg className="visit-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 14.8 9.2 23 12l-8.2 2.8L12 23l-2.8-8.2L1 12l8.2-2.8L12 1Z" /></svg></div><div className="info-row location-row"><small>LOKACIONI</small><a className="location-map-button" href={mapUrl} target="_blank" rel="noreferrer">Hape hartën <ArrowIcon /></a></div><div className="info-row"><small>TELEFONI</small><a href={`tel:+${business.phoneInternational}`}>{business.phoneDisplay}</a></div><div className="info-row"><small>ORARI</small><div>{dayNames.map((day, index) => { const slots = business.hours.filter((slot) => slot.day === index); return <div className="hours-day" key={day}><span>{day}</span><span>{slots.map((slot) => `${slot.open}–${slot.close}`).join(', ') || 'Mbyllur'}</span></div>; })}</div></div><div className="visit-card-bottom"><a href={`https://wa.me/${business.phoneInternational}`} target="_blank" rel="noreferrer">Na shkruaj në WhatsApp <ArrowIcon /></a></div></div>
  </div></section>;
}

function Footer() {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${business.location.latitude},${business.location.longitude}`)}`;
  return <footer className="site-footer">
    <img className="footer-watermark" src="/assets/rolls-logo.jpg" alt="" aria-hidden="true" />
    <div className="shell footer-layout">
      <div className="footer-brand-block"><a className="footer-brand" href="#krye" aria-label="Rolls Pizza & Coffee, kthehu në fillim"><img src="/assets/rolls-logo.jpg" alt="Logoja e Rolls Pizza & Coffee" width="72" height="72" /><span><strong>ROLLS</strong><small>PIZZA & COFFEE</small></span></a><p>Pica të përgatitura me kujdes dhe kafe për çdo moment. Na vizito në Podujevë ose porosit për dërgesë falas në zonat që mbulojmë.</p></div>
      <div className="footer-column"><h2>Shfleto</h2><a href="#menu">Menuja</a><a href="#si-funksionon">Si bëhet porosia</a><a href="#na-gjej">Na gjej</a><a href="#krye">Kthehu në fillim ↑</a></div>
      <div className="footer-column footer-contact"><h2>Na kontakto</h2><a href={`tel:+${business.phoneInternational}`}>{business.phoneDisplay}</a><a href={`https://wa.me/${business.phoneInternational}`} target="_blank" rel="noreferrer">Na shkruaj në WhatsApp <ArrowIcon /></a><a href={mapUrl} target="_blank" rel="noreferrer">Hape lokacionin në Google Maps <ArrowIcon /></a><p>Çdo ditë · 10:00–02:00</p></div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Rolls Pizza & Coffee</span><span>Podujevë, Kosovë</span></div>
  </footer>;
}

export default function App() {
  const [cart, setCart] = useState(loadCart);
  const [activeProduct, setActiveProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = calculateTotals(cart, menu, 'pickup', '', business.deliveryZones).totalCents;
  useEffect(() => { try { localStorage.setItem('rolls-cart-v1', JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);
  const add = (item) => { const product = menu.products.find((entry) => entry.id === item.productId); setCart((current) => normalizeCart([...current, item], menu)); setToast(`${product.name} u shtua në shportë. Vazhdo me menynë ose hape shportën kur të jesh gati.`); };
  return <><a className="skip-link" href="#menu">Kalo te menuja</a><Header count={count} onOpenCart={() => setCartOpen(true)} /><main><Hero /><MenuSection onChoose={setActiveProduct} /><ProcessSection /><VisitSection /></main><Footer />{toast && <div className="cart-toast" role="status" aria-live="polite">{toast}</div>}<button className="mobile-cart" type="button" onClick={() => setCartOpen(true)}><span>Shporta <b>{count}</b></span><span>{formatPrice(total)} <ArrowIcon /></span></button><ProductDialog product={activeProduct} onClose={() => setActiveProduct(null)} onAdd={add} /><CartDialog open={cartOpen} cart={cart} onClose={() => setCartOpen(false)} onChangeCart={setCart} /></>;
}
