// app.js - centraliza la lógica: carrito persistente, galería con lightbox, y mejoras de accesibilidad

// --- Persistencia del carrito en localStorage ---
let cart = [];

function loadCart() {
  try {
    const raw = localStorage.getItem('gamms_cart');
    if (raw) cart = JSON.parse(raw);
  } catch (e) {
    // error leyendo localStorage (silenciado en producción)
    cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('gamms_cart', JSON.stringify(cart));
  } catch (e) {
    // error guardando localStorage (silenciado)
  }
}

// Exponer una API de carrito global para que otras partes del sitio (p.ej. cart.js)
// puedan reutilizar la misma lógica y evitar duplicación.
window.GAMMS_CART = window.GAMMS_CART || (function(){
  const api = {
    get() {
      try {
        const raw = localStorage.getItem('gamms_cart');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },
    set(newCart) {
      cart = Array.isArray(newCart) ? newCart : [];
      try { localStorage.setItem('gamms_cart', JSON.stringify(cart)); } catch(e){}
      try { if (typeof renderCart === 'function') renderCart(); } catch(e){}
      return cart;
    },
    addItem(item) {
      try {
        const id = String(item.id);
        const existing = cart.find((it) => String(it.id) === id);
        if (existing) existing.quantity = (Number(existing.quantity) || 0) + (Number(item.quantity) || 1);
        else cart.push({ id: String(item.id), name: item.name, price: Number(item.price) || 0, quantity: Number(item.quantity) || 1, image: item.image || '' });
        this.set(cart);
      } catch (e) { /* ignore */ }
      return cart;
    },
    removeItem(id) {
      try { const idx = cart.findIndex((it) => String(it.id) === String(id)); if (idx >= 0) { cart.splice(idx,1); this.set(cart); } } catch(e){}
      return cart;
    },
    clear() { cart = []; try{ localStorage.removeItem('gamms_cart'); }catch(e){}; try { if (typeof renderCart === 'function') renderCart(); } catch(e){}; return cart; },
    getTotal() { return cart.reduce((s,it) => s + (Number(it.price)||0) * (Number(it.quantity)||1), 0); },
    count() { return cart.reduce((s,it) => s + (Number(it.quantity)||0), 0); }
  };
  return api;
})();

// --- Productos (cargar desde products.json con fallback) ---
let products = [];
// Placeholder SVG data URI para imágenes que no carguen
const MISSING_IMG_PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="Arial,Helvetica,sans-serif" font-size="16">Imagen no disponible</text></svg>';
const defaultProducts = [
  { id: 1, name: 'Muñequitos tejidos', price: 25.0, description: 'Muñequitos tejidos a mano, ideales para regalo.', category: 'Regalos', images: ['img/regalos_munequitos-tejidos_abeja.jpg'] },
  { id: 2, name: 'Chalinas tejidas', price: 35.0, description: 'Chalinas tejidas abrigadoras y suaves.', category: 'Ropa', images: ['img/ropa_chalina-tejida_gris.jpeg'] },
  { id: 3, name: 'Rosas eternas', price: 18.0, description: 'Rosas tejidas que no se marchitan.', category: 'Decoración', images: ['img/decoracion_rosas-eternas_blancasyrojas.jpg'] },
  { id: 4, name: 'Velas aromáticas', price: 15.0, description: 'Velas decorativas con agradables aromas.', category: 'Hogar', images: ['img/hogar__velas-aromaticas_rosa.jpg'] },
  { id: 5, name: 'Gorros tejidos', price: 28.0, description: 'Gorros tejidos a mano para el frío.', category: 'Ropa', images: ['img/ropa_gorros-tejidos_blancoyrosa.jpg'] },
  { id: 6, name: 'Calentadores tejidos', price: 22.0, description: 'Calentadores para manos o piernas.', category: 'Ropa', images: ['img/ropa_calentador_tejido.jpg'] },
  { id: 7, name: 'Accesorios para perros tejidos', price: 20.0, description: 'Collares, pañuelos y más para mascotas.', category: 'Mascotas', images: ['img/ropa_gorra_rosa.jpg'] },
  { id: 8, name: 'Flores de hilo', price: 18.0, description: 'Flores decorativas hechas con hilo.', category: 'Decoración', images: ['img/decoracion_flores-hilo_amarillas.jpg'] }
];

async function loadProducts() {
  // Primero, intentar leer datos inline (evita problemas con file:// y CORS)
  try {
    const el = document.getElementById('products-data');
    if (el) {
      const txt = el.textContent || el.innerText || el.innerHTML;
      products = JSON.parse(txt);
      return;
    }
  } catch (e) {
    // fallo al leer products-data inline (silenciado)
  }

  // Si no hay inline, intentar fetch normal
  try {
    const res = await fetch('products.json');
    if (res.ok) {
      products = await res.json();
      return;
    }
    // fetch products.json devolvió estado no OK
  } catch (e) {
    // no se pudo cargar products.json, usando fallback
  }

  products = defaultProducts;
}

// --- Configuración global: el endpoint de Formspree se define en `config.js` como
// `window.GAMMS_CONFIG.FORMSPREE_ENDPOINT`.

function renderProducts() {
  const container = document.getElementById('product-list');
  if (!container) return;
  container.innerHTML = '';

  // Agrupar productos por categoría
  const groups = {};
  products.forEach((p) => {
    const cat = p.category || 'Sin categoría';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  // Orden preferido de categorías: mostrar 'Ropa' primero si existe,
  // luego las demás en el orden en que aparezcan.
  const preferred = ['Ropa'];
  const allCats = Object.keys(groups);
  const orderedCats = [];
  // añadir preferidas si existen
  preferred.forEach((pc) => { if (allCats.includes(pc)) orderedCats.push(pc); });
  // añadir el resto que no estén en preferred, manteniendo orden original
  allCats.forEach((c) => { if (!orderedCats.includes(c)) orderedCats.push(c); });

  orderedCats.forEach((cat) => {
    const section = document.createElement('section');
    section.className = 'card category-section';
    section.innerHTML = `<h2>${cat}</h2><div class="product-list"></div>`;
    const list = section.querySelector('.product-list');

    groups[cat].forEach((p) => {
      const div = document.createElement('div');
      div.className = 'product';
      div.dataset.id = String(p.id);
      div.dataset.name = p.name;
      div.dataset.price = (p.price || 0).toFixed(2);

      // elegir la primera imagen como principal (compatibilidad con 'image' y 'images')
      const mainImg = (Array.isArray(p.images) && p.images.length) ? p.images[0] : (p.image || '');

      // Prefijo referencial (REF-{cat3}-{id})
      const catSlug = (p.category || 'GEN').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,3) || 'GEN';
      const ref = `REF-${catSlug}-${String(p.id).padStart(3,'0')}`;

      // calcular precio referencial si no hay precio establecido
      const defaultPrices = { 'Regalos':25, 'Ropa':35, 'Decoracion':18, 'Decoración':18, 'Hogar':15, 'Mascotas':20 };
      const refPrice = defaultPrices[p.category] || defaultPrices[cat] || 20;
      const displayPrice = (p.price && p.price > 0) ? p.price : refPrice;
      const priceLabel = (p.price && p.price > 0) ? `S/ ${p.price.toFixed(2)}` : `S/ ${displayPrice.toFixed(2)} (referencial)`;

      div.innerHTML = `
        <img class="product-img" src="${mainImg}" alt="${p.name}" loading="lazy" />
        <h3><small class="ref">${ref}</small> ${p.name}</h3>
        <p class="prod-desc">${p.description || ''}</p>
        <p class="price">Precio: <strong>${priceLabel}</strong></p>
        <button class="add-to-cart">Agregar al carrito</button>
      `;

      // Añadir manejador de error a la imagen principal para detectar rutas rotas
      const mainImgEl = div.querySelector('img.product-img');
      if (mainImgEl) {
        mainImgEl.addEventListener('error', () => {
          // fallo cargando imagen principal
          mainImgEl.src = MISSING_IMG_PLACEHOLDER;
        });
        // Al hacer click en la imagen principal, abrir lightbox con las imágenes del producto
        mainImgEl.style.cursor = 'pointer';
        mainImgEl.addEventListener('click', () => {
          if (Array.isArray(p.images) && p.images.length) {
            openLightboxWithImages(p.images, 0, { title: p.name, alt: p.description });
          } else if (mainImgEl.src) {
            // fallback: abrir en modal/galleria general
            openLightboxWithImages([mainImgEl.src], 0, { title: p.name, alt: p.description });
          }
        });
      }

      // Si hay múltiples imágenes, añadir miniaturas
      if (Array.isArray(p.images) && p.images.length > 1) {
        const thumbRow = document.createElement('div');
        thumbRow.className = 'thumb-row';
        p.images.forEach((src, i) => {
          const t = document.createElement('img');
          t.src = src;
          t.className = 'product-thumb';
          t.alt = p.name + ' foto ' + (i+1);
          t.loading = 'lazy';
          t.tabIndex = 0;
          t.addEventListener('click', () => openLightboxWithImages(p.images, i));
          t.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightboxWithImages(p.images, i); });
          // handler para detectar thumbs rotas
          t.addEventListener('error', () => {
            // fallo cargando miniatura
            t.src = MISSING_IMG_PLACEHOLDER;
          });
          thumbRow.appendChild(t);
        });
        div.appendChild(thumbRow);
      }

      list.appendChild(div);
    });

    container.appendChild(section);
  });
}

/* La función renderSidebarProducts fue removida porque el catálogo
   se debe mostrar en la sección principal; no queremos otra sección
   de "productos destacados" separada. */

// --- Render carrito ---
function renderCart() {
  const cartItems = document.getElementById('cart-items');
  const emptyText = document.getElementById('cart-empty');
  const totalSpan = document.getElementById('cart-total');
  const checkoutMessage = document.getElementById('checkout-message');

  // Si no existe el contenedor (p. ej. estamos en index.html sin aside), solo actualizar badge y salir
  if (!cartItems) {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const totalQty = (window.GAMMS_CART && typeof window.GAMMS_CART.count === 'function') ? window.GAMMS_CART.count() : cart.reduce((s, it) => s + (it.quantity || 0), 0);
      badge.textContent = totalQty;
    }
    return;
  }

  cartItems.innerHTML = '';
  if (checkoutMessage) checkoutMessage.style.display = 'none';

  if (cart.length === 0) {
    if (emptyText) emptyText.style.display = 'block';
    if (totalSpan) totalSpan.textContent = '0.00';
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = '0';
    return;
  }

  if (emptyText) emptyText.style.display = 'none';

  let total = 0;
  cart.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = `${item.name} (x${item.quantity}) - S/ ${(item.price * item.quantity).toFixed(2)}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Quitar';
    removeBtn.addEventListener('click', () => {
      if (window.GAMMS_CART && typeof window.GAMMS_CART.removeItem === 'function') {
        window.GAMMS_CART.removeItem(item.id);
      } else {
        cart.splice(index, 1);
        saveCart();
        renderCart();
      }
    });

    li.appendChild(removeBtn);
    cartItems.appendChild(li);

    total += item.price * item.quantity;
  });

  totalSpan.textContent = total.toFixed(2);
  // actualizar badge del header si existe
  const badge = document.getElementById('cart-count');
  if (badge) {
    const totalQty = (window.GAMMS_CART && typeof window.GAMMS_CART.count === 'function') ? window.GAMMS_CART.count() : cart.reduce((s, it) => s + (it.quantity || 0), 0);
    badge.textContent = totalQty;
  }
}

// --- Añadir productos (delegación) ---
function setupAddToCart() {
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.add-to-cart');
    if (!btn) return;

    const productEl = btn.closest('.product');
    if (!productEl) return;

    const id = productEl.dataset.id;
    const name = productEl.dataset.name;
    const price = parseFloat(productEl.dataset.price);
  const imgEl = productEl.querySelector('img.product-img');
  const imgSrc = imgEl ? imgEl.src : '';

    const existing = cart.find((it) => it.id === id);
    // usar la API global si está disponible para evitar duplicación
    if (window.GAMMS_CART && typeof window.GAMMS_CART.addItem === 'function') {
      window.GAMMS_CART.addItem({ id, name, price, quantity: 1, image: imgSrc });
    } else {
      if (existing) existing.quantity += 1;
      else cart.push({ id, name, price, quantity: 1, image: imgSrc });
      saveCart();
      renderCart();
    }

    // Buscar producto completo en products para mostrar descripción y categoría
    const prod = products.find((p) => String(p.id) === String(id));
    const itemForModal = Object.assign({}, prod || {}, { id, name, price, quantity: (existing ? existing.quantity : 1), image: imgSrc });
    showAddToCartModal(itemForModal);
  });
}

// --- Botones clear / checkout ---
function setupCartButtons() {
  const clearBtn = document.getElementById('clear-cart');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!confirm('¿Vaciar el carrito?')) return;
      if (window.GAMMS_CART && typeof window.GAMMS_CART.clear === 'function') window.GAMMS_CART.clear();
      else { cart = []; saveCart(); renderCart(); }
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      // Si estamos en index.html redirigimos a la página del carrito (usar pestaña/cart.html)
      const isIndex = !!document.getElementById('product-list');
      if (isIndex) {
        // Navegar a cart.html para que el usuario vea la pestaña/carrito completo
        window.location.href = 'cart.html';
        return;
      }

      // Si estamos en otra página (p. ej. cart.html), conservar comportamiento actual
      const currentCart = (window.GAMMS_CART && typeof window.GAMMS_CART.get === 'function') ? window.GAMMS_CART.get() : cart;
      if (!currentCart || currentCart.length === 0) { alert('Tu carrito está vacío.'); return; }

      let total = 0;
      const resumen = currentCart.map((item) => {
        const subtotal = item.price * item.quantity; total += subtotal;
        return `${item.name} (x${item.quantity}) - S/ ${subtotal.toFixed(2)}`;
      }).join('\n');

      alert(`Resumen de tu compra en GAMMS:\n\n${resumen}\n\nTotal: S/ ${total.toFixed(2)}\n\n(Compra simulada para proyecto escolar)`);

      document.getElementById('checkout-message').style.display = 'block';
    });
  }
}

// --- Mensajes (persistentes también) ---
function setupMessages() {
  const form = document.getElementById('message-form');
  if (!form) return; // no hay formulario en esta página

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('name');
    const messageInput = document.getElementById('message');

    const name = (nameInput && nameInput.value) ? nameInput.value.trim() : '';
    const message = (messageInput && messageInput.value) ? messageInput.value.trim() : '';
    if (!name || !message) { alert('Por favor completa tu nombre y tu mensaje.'); return; }

    const li = document.createElement('li');
    const date = new Date().toLocaleString();
    li.textContent = `[${date}] ${name}: ${message}`;

    const list = document.getElementById('messages-list');
    if (list) list.appendChild(li);

    if (nameInput) nameInput.value = '';
    if (messageInput) messageInput.value = '';
  });
}

// (showToast eliminado; usar mini-ventana de feedback)

// --- Mini-ventana de confirmación al agregar al carrito ---
function showAddToCartModal(item) {
  // item: { id, name, price, quantity, image }
  // Evitar crear múltiples overlays
  if (document.querySelector('.mini-cart-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'mini-cart-overlay';

  const box = document.createElement('div');
  box.className = 'mini-cart';

  const img = document.createElement('img');
  img.src = item.image || MISSING_IMG_PLACEHOLDER;
  img.alt = item.name || '';

  const content = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'mini-title';
  title.textContent = item.name;

  const desc = document.createElement('div');
  desc.className = 'mini-desc';
  desc.textContent = item.description || '';

  const priceLine = document.createElement('div');
  priceLine.className = 'mini-price';
  // calcular precio referencial (si el producto no trae precio)
  const defaultPrices = { 'Regalos':25, 'Ropa':35, 'Decoracion':18, 'Decoración':18, 'Hogar':15, 'Mascotas':20 };
  const cat = item.category || '';
  const refPrice = defaultPrices[cat] || 20;
  const displayPrice = (item.price && item.price > 0) ? item.price : refPrice;
  priceLine.textContent = `Precio referencia: S/ ${displayPrice.toFixed(2)}`;

  const qtyText = document.createElement('div');
  qtyText.textContent = `Cantidad: ${item.quantity || 1}`;

  const actions = document.createElement('div');
  actions.className = 'mini-actions';

  const btnContinue = document.createElement('button');
  btnContinue.className = 'btn-continue';
  btnContinue.textContent = 'Seguir comprando';
  btnContinue.addEventListener('click', () => { overlay.remove(); });

  const btnGoCart = document.createElement('button');
  btnGoCart.className = 'btn-go-cart';
  btnGoCart.textContent = 'Ir al carrito';
  btnGoCart.addEventListener('click', () => { window.location.href = 'cart.html'; });

  actions.appendChild(btnContinue);
  actions.appendChild(btnGoCart);

  content.appendChild(title);
  content.appendChild(desc);
  content.appendChild(priceLine);
  content.appendChild(qtyText);
  content.appendChild(actions);

  box.appendChild(img);
  box.appendChild(content);
  overlay.appendChild(box);

  // click fuera para cerrar
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.body.appendChild(overlay);
}

// --- Galería: construir catálogo desde las imágenes existentes en DOM ---
let galleryImages = []; // array de {src, alt, title}
let currentGalleryIndex = 0;

function buildGalleryFromProducts() {
  // Construir un carrusel horizontal a partir de las imágenes de productos
  const catalog = document.getElementById('catalog-grid');
  if (!catalog) return;

  // Recolectar todas las imágenes desde products
  const imgs = [];
  products.forEach((p) => {
    const imgsArr = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
    imgsArr.forEach((src) => imgs.push({ src, alt: p.name || '', title: p.name || '' }));
  });

  galleryImages = imgs;
  catalog.innerHTML = '';

  // Estructura del carrusel
  const carousel = document.createElement('div');
  carousel.className = 'carousel';

  const prev = document.createElement('button');
  prev.className = 'carousel-prev';
  prev.setAttribute('aria-label', 'Anterior');
  prev.textContent = '◀';

  const next = document.createElement('button');
  next.className = 'carousel-next';
  next.setAttribute('aria-label', 'Siguiente');
  next.textContent = '▶';

  const viewport = document.createElement('div');
  viewport.className = 'carousel-viewport';

  const track = document.createElement('div');
  track.className = 'carousel-track';

  // Añadir imágenes al track
  galleryImages.forEach((g, idx) => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    const imgEl = document.createElement('img');
    imgEl.src = g.src;
    imgEl.alt = g.alt || '';
    imgEl.loading = 'lazy';
    imgEl.tabIndex = 0;
    imgEl.addEventListener('click', () => openLightbox(idx));
    imgEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightbox(idx); });
    imgEl.addEventListener('error', () => { imgEl.src = MISSING_IMG_PLACEHOLDER; });
    item.appendChild(imgEl);
    track.appendChild(item);
  });

  viewport.appendChild(track);
  carousel.appendChild(prev);
  carousel.appendChild(viewport);
  carousel.appendChild(next);
  catalog.appendChild(carousel);

  // Lógica de desplazamiento por transform (sin barra nativa)
  let offset = 0; // px, negativo hacia la izquierda
  track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.23,1)';

  function recalc() {
    const firstItem = track.querySelector('.carousel-item');
    if (!firstItem) return { step: 0, maxNegative: 0 };
    const itemRect = firstItem.getBoundingClientRect();
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 16;
    const step = Math.round(itemRect.width + gap);
    const maxNegative = Math.min(0, Math.round(viewport.clientWidth - track.scrollWidth));
    return { step, maxNegative };
  }

  function updateButtons() {
    const { maxNegative } = recalc();
    prev.disabled = offset >= 0;
    next.disabled = offset <= maxNegative;
  }

  function moveBy(direction = 1) {
    const { step, maxNegative } = recalc();
    if (step === 0) return;
    offset = offset - step * direction;
    if (offset < maxNegative) offset = maxNegative;
    if (offset > 0) offset = 0;
    track.style.transform = `translateX(${offset}px)`;
    updateButtons();
  }

  prev.addEventListener('click', () => moveBy(-1));
  next.addEventListener('click', () => moveBy(1));

  // Soporte teclado
  prev.addEventListener('keydown', (e) => { if (e.key === 'Enter') moveBy(-1); });
  next.addEventListener('keydown', (e) => { if (e.key === 'Enter') moveBy(1); });

  // Recalcular en resize
  window.addEventListener('resize', () => {
    // recompute and clamp offset
    const { maxNegative } = recalc();
    if (offset < maxNegative) offset = maxNegative;
    track.style.transform = `translateX(${offset}px)`;
    updateButtons();
  });

  // Inicializar
  setTimeout(() => { updateButtons(); }, 120);
}

// --- Ofertas dinámicas ---
function renderOffers() {
  const container = document.getElementById('offers-list');
  if (!container || !Array.isArray(products) || products.length === 0) return;
  container.innerHTML = '';

  // Seleccionar hasta 4 productos para oferta (por ahora: los primeros no nulos)
  const toOffer = products.slice(0, 4);

  toOffer.forEach((p) => {
    const price = (p.price && p.price > 0) ? p.price : 20;
    // calcular descuento determinístico según id para mostrar variedad
    const pct = Math.max(10, (Number(p.id) * 7) % 31); // entre 10% y 40% aprox
    const newPrice = +(price * (1 - pct / 100)).toFixed(2);

    const card = document.createElement('div');
    card.className = 'offer-card';

    const img = document.createElement('img');
    img.className = 'offer-thumb';
    img.src = (Array.isArray(p.images) && p.images[0]) ? p.images[0] : (p.image || '');
    img.alt = p.name || '';
    img.addEventListener('error', () => { img.src = MISSING_IMG_PLACEHOLDER; });

    const info = document.createElement('div');
    info.className = 'offer-info';

    const title = document.createElement('div');
    title.className = 'offer-title';
    title.textContent = p.name;

    const prices = document.createElement('div');
    prices.className = 'offer-prices';
    const orig = document.createElement('div'); orig.className = 'offer-original'; orig.textContent = `S/ ${price.toFixed(2)}`;
    const neu = document.createElement('div'); neu.className = 'offer-new'; neu.textContent = `S/ ${newPrice.toFixed(2)}`;
    const badge = document.createElement('div'); badge.className = 'offer-badge'; badge.textContent = `-${pct}%`;

    prices.appendChild(orig);
    prices.appendChild(neu);
    prices.appendChild(badge);

    const btn = document.createElement('button');
    btn.className = 'offer-cta';
    btn.textContent = 'Agregar al carrito';
    btn.dataset.id = String(p.id);
    btn.addEventListener('click', () => {
      // Añadir al carrito (mantener precio nuevo)
      const existing = cart.find((it) => String(it.id) === String(p.id));
      if (existing) existing.quantity += 1;
      else cart.push({ id: String(p.id), name: p.name, price: newPrice, quantity: 1, image: img.src });
      saveCart(); renderCart();
      showAddToCartModal(Object.assign({}, p, { price: newPrice, quantity: 1, image: img.src }));
    });

    info.appendChild(title);
    info.appendChild(prices);
    info.appendChild(btn);

    card.appendChild(img);
    card.appendChild(info);

    container.appendChild(card);
  });
}

// --- Lightbox ---
function openLightbox(index) {
  currentGalleryIndex = index;
  const modal = document.getElementById('image-modal');
  // Si no existe modal, abrir en una nueva pestaña como fallback
  if (!modal) {
    const item = galleryImages[index];
    if (item && item.src) window.open(item.src, '_blank');
    return;
  }

  const modalImg = document.getElementById('modal-image');
  const modalCaption = document.getElementById('modal-caption');

  const item = galleryImages[index];
  if (modalImg && item) {
    modalImg.src = item.src;
    modalImg.alt = item.alt || '';
  }
  if (modalCaption && item) modalCaption.textContent = item.title || item.alt || '';
  modal.style.display = 'flex';
}

// Abrir lightbox con un array específico de imágenes (por producto)
function openLightboxWithImages(imagesArray, startIndex = 0) {
  if (!Array.isArray(imagesArray) || imagesArray.length === 0) return;
  // aceptar metadatos opcionales como tercer argumento
  const meta = (arguments.length > 2 && typeof arguments[2] === 'object') ? arguments[2] : {};
  const title = meta.title || '';
  const alt = meta.alt || '';
  // reemplazar temporalmente galleryImages por las imágenes del producto
  galleryImages = imagesArray.map((src) => ({ src, alt: alt, title: title }));

  // Si no existe el modal (p. ej. en pages sin lightbox), abrir en nueva pestaña
  const modal = document.getElementById('image-modal');
  if (!modal) {
    // abrir la imagen principal en nueva pestaña
    window.open(String(imagesArray[startIndex] || imagesArray[0]), '_blank');
    return;
  }

  openLightbox(startIndex);
}

function closeLightbox() {
  const modal = document.getElementById('image-modal');
  modal.style.display = 'none';
}

function nextImage() {
  if (galleryImages.length === 0) return;
  currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
  openLightbox(currentGalleryIndex);
}

function prevImage() {
  if (galleryImages.length === 0) return;
  currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
  openLightbox(currentGalleryIndex);
}

function setupLightboxControls() {
  const modal = document.getElementById('image-modal');
  if (!modal) return; // no hay lightbox en esta página

  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeLightbox);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeLightbox(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });

  const nextBtn = document.getElementById('lightbox-next');
  const prevBtn = document.getElementById('lightbox-prev');
  if (nextBtn) nextBtn.addEventListener('click', nextImage);
  if (prevBtn) prevBtn.addEventListener('click', prevImage);
}

// --- Botón "Subir arriba" (back-to-top) ---
function setupBackToTop() {
  try {
    // crear botón dinámicamente si no existe
    if (document.getElementById('back-to-top')) return;
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.setAttribute('aria-label', 'Subir arriba');
    btn.innerHTML = '↑';
    btn.className = 'hide';
    btn.tabIndex = 0;

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } });

    document.body.appendChild(btn);

    // mostrar/ocultar según scroll
    const showThreshold = 200;
    let lastVisible = false;
    function check() {
      const should = window.scrollY > showThreshold;
      if (should && !lastVisible) {
        btn.classList.remove('hide'); btn.classList.add('visible'); lastVisible = true;
      } else if (!should && lastVisible) {
        btn.classList.remove('visible'); btn.classList.add('hide'); lastVisible = false;
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    // comprobar inicialmente
    setTimeout(check, 120);
  } catch (e) { /* back-to-top init falló (silenciado) */ }
}

// --- Carrito modal (SPA) ---
// Carrito modal y checkout en modal eliminados: usamos la página `cart.html` para finalizar compra.

// --- Inicialización ---
async function init() {
  // Manejador global de errores para diagnóstico: mostrará un pequeño overlay
  // con el último error y lo registrará en consola. Activa sólo en desarrollo.
  (function setupGlobalErrorCapture(){
    try {
      const showErrorOverlay = (msg, url, line, col, error) => {
        // captured error (overlay will show details)
        // crear overlay si no existe
        if (document.getElementById('error-overlay')) return;
        const ov = document.createElement('div');
        ov.id = 'error-overlay';
        ov.style.position = 'fixed';
        ov.style.right = '12px';
        ov.style.bottom = '12px';
        ov.style.zIndex = '9999';
        ov.style.background = 'rgba(255,255,255,0.96)';
        ov.style.border = '1px solid rgba(220,38,93,0.12)';
        ov.style.padding = '10px';
        ov.style.borderRadius = '8px';
        ov.style.maxWidth = '360px';
        ov.style.boxShadow = '0 8px 28px rgba(16,24,40,0.12)';
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.margin = '0 0 8px 0';
        pre.style.fontSize = '12px';
        pre.textContent = `${msg}\n${url || ''}:${line || ''}:${col || ''}\n${(error && error.stack) ? error.stack : ''}`;
        const btn = document.createElement('button');
        btn.textContent = 'Copiar error';
        btn.style.padding = '6px 8px';
        btn.style.borderRadius = '6px';
        btn.style.border = 'none';
        btn.style.background = 'linear-gradient(90deg,#fb7185,#ef4444)';
        btn.style.color = '#fff';
        btn.addEventListener('click', () => {
          navigator.clipboard && navigator.clipboard.writeText(pre.textContent || '').then(()=>{
            btn.textContent = 'Copiado'; setTimeout(()=>btn.textContent='Copiar error',1200);
          });
        });
        const close = document.createElement('button');
        close.textContent = 'Cerrar';
        close.style.marginLeft = '8px';
        close.addEventListener('click', () => ov.remove());
        ov.appendChild(pre);
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.appendChild(btn);
        controls.appendChild(close);
        ov.appendChild(controls);
        document.body.appendChild(ov);
      };

      window.addEventListener('error', (ev) => {
        try { showErrorOverlay(ev.message || 'Error', ev.filename, ev.lineno, ev.colno, ev.error); } catch(e) { /* silenciado */ }
      });
      window.addEventListener('unhandledrejection', (ev) => {
        try { showErrorOverlay(ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason), '', '', '', ev.reason); } catch(e) { /* silenciado */ }
      });
    } catch (e) { /* no se pudo instalar global error capture (silenciado) */ }
  })();
  loadCart();
  renderCart();
  setupAddToCart();
  setupCartButtons();
  setupMessages();

  // Mobile menu toggle: busca el botón y añade comportamiento
  const menuToggle = document.getElementById('menu-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (menuToggle && siteNav) {
    const menuCbx = document.getElementById('menu-toggle-cbx');
    menuToggle.addEventListener('click', () => {
      const opening = !siteNav.classList.contains('open');
      siteNav.classList.toggle('open');
      // accesibilidad
      menuToggle.setAttribute('aria-expanded', String(opening));
      if (menuCbx) menuCbx.checked = opening;
    });
    // cerrar menú al hacer click en un enlace (mejor UX en mobile)
    siteNav.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a && siteNav.classList.contains('open')) siteNav.classList.remove('open');
    });
  }
  // sincronizar cierre con checkbox si existe
  if (siteNav) {
    const menuCbxClose = document.getElementById('menu-toggle-cbx');
    siteNav.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a && menuCbxClose) menuCbxClose.checked = false;
    });
  }
  // Asegurar sincronía con el checkbox nativo: cuando cambie, reflejar estado visual y accesible
  (function syncMenuWithCheckbox(){
    try {
      const cbx = document.getElementById('menu-toggle-cbx');
      if (!cbx) return;
      cbx.addEventListener('change', () => {
        const checked = !!cbx.checked;
        if (siteNav) siteNav.classList.toggle('open', checked);
        if (menuToggle) menuToggle.setAttribute('aria-expanded', String(checked));
      });
      // Si la página se redimensiona, cerrar el menú para evitar estados pegados
      window.addEventListener('resize', () => {
        if (cbx && cbx.checked) cbx.checked = false;
        if (siteNav) siteNav.classList.remove('open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      });
      // Cerrar cuando se hace click fuera del nav en captura (mejora UX móvil)
      document.addEventListener('click', (ev) => {
        try {
          const target = ev.target;
          const clickedInside = target.closest && (target.closest('#site-nav') || target.closest('#menu-toggle') || target === cbx);
          if (!clickedInside) {
            if (cbx && cbx.checked) cbx.checked = false;
            if (siteNav) siteNav.classList.remove('open');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
          }
        } catch(e){}
      }, true);
    } catch(e){}
  })();
  // Fallback: algunos móviles o navegadores ignoran ciertos eventos o el listener no se instaló
  (function ensureMenuToggle() {
    try {
      const mt = document.getElementById('menu-toggle');
      const sn = document.querySelector('.site-nav');
      if (!mt || !sn) return;
      if (mt.dataset.hasMenuListener) return; // ya enlazado
      const menuCbx = document.getElementById('menu-toggle-cbx');
      const handler = (e) => {
        // prevenir doble activación en touch devices
        if (e.type === 'touchstart') e.preventDefault();
        const opening = !sn.classList.contains('open');
        sn.classList.toggle('open');
        mt.setAttribute('aria-expanded', String(opening));
        if (menuCbx) menuCbx.checked = opening;
      };
      ['click', 'pointerdown', 'touchstart'].forEach((ev) => mt.addEventListener(ev, handler, { passive: false }));
      mt.dataset.hasMenuListener = '1';
    } catch (e) { /* ensureMenuToggle error silenciado */ }
  })();

  // Si la página no tiene nav pero sí el botón, ocultarlo para evitar ver un botón inactivo
  if (menuToggle && !siteNav) {
    menuToggle.style.display = 'none';
  }

  // Cargar productos y renderizar
  await loadProducts();
  renderProducts();
  // Renderizar ofertas dinámicas
  if (typeof renderOffers === 'function') renderOffers();

  // Construir galería a partir del DOM generado
  buildGalleryFromProducts();
  setupLightboxControls();
  // botón subir arriba
  if (typeof setupBackToTop === 'function') setupBackToTop();
  // Forzar navegación al carrito (fallback): siempre redirige a cart.html al hacer clic
  const cartLink = document.getElementById('cart-link');
  if (cartLink) {
    cartLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'cart.html';
    });
  }
  // El modal del carrito fue eliminado; usamos cart.html
}

// Esperar DOM
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
