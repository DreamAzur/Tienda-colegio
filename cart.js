// cart.js - lógica de la página de carrito (lee y modifica localStorage 'gamms_cart')

function loadCartLocal() {
  try {
    if (window.GAMMS_CART && typeof window.GAMMS_CART.get === 'function') return window.GAMMS_CART.get();
    const raw = localStorage.getItem('gamms_cart');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

// El endpoint de Formspree se obtiene desde `window.GAMMS_CONFIG.FORMSPREE_ENDPOINT`

function saveCartLocal(cart) {
  try {
    if (window.GAMMS_CART && typeof window.GAMMS_CART.set === 'function') return window.GAMMS_CART.set(cart);
    localStorage.setItem('gamms_cart', JSON.stringify(cart));
    updateCartBadge(cart);
  } catch (e) { /* silenciado */ }
}

function updateCartBadge(cart) {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  let totalQty = 0;
  if (window.GAMMS_CART && typeof window.GAMMS_CART.count === 'function') totalQty = window.GAMMS_CART.count();
  else totalQty = (cart || []).reduce((s, it) => s + (it.quantity || 0), 0);
  badge.textContent = totalQty;
}

function renderCartPage() {
  const cart = loadCartLocal();
  const cartItemsEl = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const totalSpan = document.getElementById('cart-total');

  cartItemsEl.innerHTML = '';
  if (!cart || cart.length === 0) {
    cartEmpty.style.display = 'block';
    totalSpan.textContent = '0.00';
    updateCartBadge([]);
    return;
  }
  cartEmpty.style.display = 'none';

  let total = 0;
  cart.forEach((item, idx) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.marginBottom = '8px';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.gap = '8px';
    left.style.alignItems = 'center';

    const img = document.createElement('img');
    img.src = item.image || item.src || '';
    img.alt = item.name || '';
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '6px';

    const info = document.createElement('div');
    info.innerHTML = `<strong>${item.name}</strong><br/><span>S/ ${item.price.toFixed(2)}</span>`;

    left.appendChild(img);
    left.appendChild(info);

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '6px';
    controls.style.alignItems = 'center';

    const qty = document.createElement('input');
    qty.type = 'number';
    qty.min = '1';
    qty.value = item.quantity || 1;
    qty.style.width = '60px';
    qty.addEventListener('change', (e) => {
      const v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < 1) { e.target.value = 1; return; }
      cart[idx].quantity = v;
      saveCartLocal(cart);
      renderCartPage();
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Quitar';
    removeBtn.addEventListener('click', () => {
      cart.splice(idx, 1);
      saveCartLocal(cart);
      renderCartPage();
    });

    controls.appendChild(qty);
    controls.appendChild(removeBtn);

    li.appendChild(left);
    li.appendChild(controls);

    cartItemsEl.appendChild(li);

    total += item.price * (item.quantity || 1);
  });

  totalSpan.textContent = total.toFixed(2);
  updateCartBadge(cart);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();

  document.getElementById('clear-cart').addEventListener('click', () => {
    if (!confirm('¿Vaciar el carrito?')) return;
    saveCartLocal([]);
    renderCartPage();
  });
  // Al hacer click en "Comprar ahora" en la página del carrito, desplazamos al formulario
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const cart = loadCartLocal();
      if (!cart || cart.length === 0) { alert('Tu carrito está vacío.'); return; }
      const form = document.getElementById('checkout-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const first = form.querySelector('input, textarea, button');
        if (first) first.focus();
      }
    });
  }

  document.getElementById('checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('checkout-status');
    const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
    if (statusEl) statusEl.textContent = '';
    if (submitBtn) submitBtn.disabled = true;
    const cart = loadCartLocal();
    if (!cart || cart.length === 0) { alert('No hay items en el carrito.'); return; }
  const name = document.getElementById('cust-name').value.trim();
  const emailEl = document.getElementById('cust-email');
  const rawEmail = emailEl ? emailEl.value : '';
  // Sanitizar email: quitar espacios y caracteres de control, normalizar a minúsculas
  const email = rawEmail ? String(rawEmail).replace(/\s+/g, '').toLowerCase() : '';
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const commentEl = document.getElementById('cust-comment');
  const comment = commentEl ? commentEl.value.trim() : '';
    // Validación básica de nombre y email antes de intentar el envío a Formspree
    if (!name || !email) {
      if (statusEl) statusEl.textContent = 'Por favor ingresa nombre y email.';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    // Validar formato de email: primero usar validación nativa, luego una comprobación regex más estricta
    const basicValid = !(emailEl && typeof emailEl.checkValidity === 'function') || emailEl.checkValidity();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const regexValid = emailRegex.test(email);
    if (!basicValid || !regexValid) {
      if (statusEl) statusEl.textContent = 'Por favor ingresa un email válido (ej: tu@ejemplo.com).';
      if (emailEl && emailEl.reportValidity) emailEl.reportValidity();
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    // calcular total del pedido
    const total = cart.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
    const order = {
      customer: { name, email, phone, address, comment },
      items: cart.map((it) => ({ id: it.id, name: it.name, price: it.price, quantity: it.quantity })),
      total: +total.toFixed(2)
    };

    // Envío simplificado: usar POST nativo (formulario) a Formspree para evitar problemas de CORS/fetch.
      const endpoint = (window.GAMMS_CONFIG && window.GAMMS_CONFIG.FORMSPREE_ENDPOINT) || '';
      if (endpoint) {
        // Usar fetch para evitar bloqueadores de pop-ups y problemas CORS.
        // submitOrderViaFormspree ahora devuelve una Promise<boolean>.
        if (statusEl) statusEl.textContent = 'Enviando pedido...';
        submitOrderViaFormspree(order, endpoint).then((result) => {
          // result: { ok: boolean, status: number, body: string }
          if (result && result.ok) {
            if (statusEl) statusEl.textContent = 'Pedido enviado correctamente. Revisa la bandeja configurada en Formspree.';
            // limpiar carrito después del envío exitoso
            saveCartLocal([]);
            renderCartPage();
            const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
          } else {
            if (statusEl) statusEl.textContent = `Formspree devolvió ${result && result.status ? result.status : 'error'}: ${result && result.body ? result.body : 'sin detalle'}`;
            // intentar fallback mailto
            sendOrderViaMailto(order);
            saveCartLocal([]);
            renderCartPage();
            const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
          }
        }).catch(() => {
          if (statusEl) statusEl.textContent = 'Error de red al intentar enviar a Formspree; abriendo cliente de correo.';
          sendOrderViaMailto(order);
          saveCartLocal([]);
          renderCartPage();
          const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
        }).finally(() => { if (submitBtn) submitBtn.disabled = false; });
      } else {
        if (statusEl) statusEl.textContent = 'Abriendo cliente de correo...';
        sendOrderViaMailto(order);
        saveCartLocal([]);
        renderCartPage();
        const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
        if (submitBtn) submitBtn.disabled = false;
      }
  });
});

function sendOrderViaMailto(order) {
  const subject = encodeURIComponent('Pedido GAMMS - ' + new Date().toLocaleString());
  const itemsText = order.items.map((it) => `${it.name} (x${it.quantity}) - S/ ${ (it.price * it.quantity).toFixed(2) }`).join('%0A');
  const totalText = order.total !== undefined ? `\n\nTotal: S/ ${Number(order.total).toFixed(2)}` : '';
  const body = encodeURIComponent(`Cliente: ${order.customer.name}\nEmail: ${order.customer.email}\nTel: ${order.customer.phone || ''}\nDirección: ${order.customer.address || ''}\nComentario: ${order.customer.comment || ''}\n\nPedido:\n${itemsText}${totalText}`);
  const to = 'gammsgreisy@gmail.com';
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

// Fallback: enviar el pedido creando un formulario y enviándolo (abre nueva pestaña).
async function submitOrderViaFormspree(order, endpoint) {
  if (!endpoint) return { ok: false, status: 0, body: 'no-endpoint' };
  try {
    const payload = {
      Nombre: order.customer.name,
      Correo: order.customer.email,
      email: order.customer.email,
      _replyto: order.customer.email,
      Telefono: order.customer.phone || '',
      Direccion: order.customer.address || '',
      Comentario: order.customer.comment || '',
      Pedido: order.items.map((it) => `${it.name} (x${it.quantity}) - S/ ${(it.price * it.quantity).toFixed(2)}`).join('\n'),
      Total: `S/ ${order.total.toFixed(2)}`,
      subject: `Pedido GAMMS - S/ ${order.total.toFixed(2)}`,
      page: (typeof window !== 'undefined' && window.location ? window.location.href : 'GAMMS')
    };

    // Intento 1: enviar JSON
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let body = '';
      try { const j = await res.json(); body = JSON.stringify(j); } catch (e) { try { body = await res.text(); } catch (ee) { body = ''; } }

      if (res.ok) return { ok: true, status: res.status, body };
      // si no ok, continuar a intento 2
      // Intento 2: enviar como form-urlencoded (fallback)
    } catch (e) {
      // si falla la petición JSON, intentaremos el form-encoded abajo
    }

    // Intento 2: enviar como application/x-www-form-urlencoded
    try {
      const params = new URLSearchParams();
      Object.keys(payload).forEach((k) => { params.append(k, payload[k]); });
      const res2 = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      let body2 = '';
      try { const j2 = await res2.json(); body2 = JSON.stringify(j2); } catch (e) { try { body2 = await res2.text(); } catch (ee) { body2 = ''; } }
      if (res2.ok) return { ok: true, status: res2.status, body: body2 };
      return { ok: false, status: res2.status, body: body2 };
    } catch (e) {
      return { ok: false, status: 0, body: 'network-error' };
    }
  } catch (e) {
    return { ok: false, status: 0, body: 'exception' };
  }
}
