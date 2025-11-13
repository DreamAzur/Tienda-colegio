// cart.js - lógica de la página de carrito (lee y modifica localStorage 'gamms_cart')

function loadCartLocal() {
  try {
    const raw = localStorage.getItem('gamms_cart');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo localStorage', e);
    return [];
  }
}

// Opcional: si tienes Formspree, coloca tu endpoint aquí
// Ejemplo: const FORMSPREE_ENDPOINT = 'https://formspree.io/f/abcd1234';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mldadbww';

function saveCartLocal(cart) {
  try {
    localStorage.setItem('gamms_cart', JSON.stringify(cart));
    // actualizar badge si existe
    updateCartBadge(cart);
  } catch (e) {
    console.error('Error guardando localStorage', e);
  }
}

function updateCartBadge(cart) {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const totalQty = cart.reduce((s, it) => s + (it.quantity || 0), 0);
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
    const cart = loadCartLocal();
    if (!cart || cart.length === 0) { alert('No hay items en el carrito.'); return; }
  const name = document.getElementById('cust-name').value.trim();
  const email = document.getElementById('cust-email') ? document.getElementById('cust-email').value.trim() : '';
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const commentEl = document.getElementById('cust-comment');
  const comment = commentEl ? commentEl.value.trim() : '';
    if (!name || !email) { alert('Por favor ingresa nombre y email.'); return; }

    const order = {
      customer: { name, email, phone, address, comment },
      items: cart.map((it) => ({ id: it.id, name: it.name, price: it.price, quantity: it.quantity }))
    };

    // Envío simplificado: usar POST nativo (formulario) a Formspree para evitar problemas de CORS/fetch.
      if (FORMSPREE_ENDPOINT) {
        // Usar fetch para evitar bloqueadores de pop-ups y problemas CORS.
        // submitOrderViaFormspree ahora devuelve una Promise<boolean>.
        submitOrderViaFormspree(order).then((ok) => {
          if (ok) {
            alert('Pedido enviado correctamente. Revisa tu correo (o la bandeja de entrada configurada en Formspree).');
            // limpiar carrito después del envío exitoso
            saveCartLocal([]);
            renderCartPage();
            const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
          } else {
            // fallback: abrir cliente de correo
            sendOrderViaMailto(order);
            // limpiar carrito (el usuario tendrá el mail abierto)
            saveCartLocal([]);
            renderCartPage();
            const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
          }
        }).catch((err) => {
          console.error('Error enviando a Formspree:', err);
          sendOrderViaMailto(order);
          saveCartLocal([]);
          renderCartPage();
          const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
        });
      } else {
        sendOrderViaMailto(order);
        saveCartLocal([]);
        renderCartPage();
        const formEl = document.getElementById('checkout-form'); if (formEl) formEl.reset();
      }
  });
});

function sendOrderViaMailto(order) {
  const subject = encodeURIComponent('Pedido GAMMS - ' + new Date().toLocaleString());
  const itemsText = order.items.map((it) => `${it.name} (x${it.quantity}) - S/ ${ (it.price * it.quantity).toFixed(2) }`).join('%0A');
  const body = encodeURIComponent(`Cliente: ${order.customer.name}\nEmail: ${order.customer.email}\nTel: ${order.customer.phone || ''}\nDirección: ${order.customer.address || ''}\nComentario: ${order.customer.comment || ''}\n\nPedido:\n${itemsText}`);
  const to = 'gammsgreisy@gmail.com';
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

// Fallback: enviar el pedido creando un formulario y enviándolo (abre nueva pestaña).
async function submitOrderViaFormspree(order) {
  if (!FORMSPREE_ENDPOINT) return false;
  try {
    const payload = {
      Nombre: order.customer.name,
      Correo: order.customer.email,
      Telefono: order.customer.phone || '',
      Direccion: order.customer.address || '',
      Comentario: order.customer.comment || '',
      Pedido: order.items.map((it) => `${it.name} (x${it.quantity}) - S/ ${(it.price * it.quantity).toFixed(2)}`).join('\n')
    };

    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Formspree responde con 200/201 en caso de éxito cuando se usa JSON
    if (res.ok) return true;
    // intentar leer mensaje de error para depuración
    try { const json = await res.json(); console.warn('Formspree response not ok:', json); } catch(e){}
    return false;
  } catch (e) {
    console.error('submitOrderViaFormspree error:', e);
    return false;
  }
}
