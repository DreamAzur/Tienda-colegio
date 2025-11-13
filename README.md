GAMMS - Tienda de Tejidos (mejorada)

Cambios realizados:

- Separé los estilos a `styles.css`.
- Moví la lógica JavaScript a `app.js`.
- Añadí una sección "Catálogo de fotos" con miniaturas que se generan desde las imágenes de los productos.
- Implementé un lightbox con navegación (anterior/siguiente) y soporte para teclado (Esc, flechas).
- Añadí persistencia del carrito en `localStorage`.
- Pequeño `toast` al agregar productos al carrito.

- Se agregó una página dedicada `cart.html` con `cart.js` para editar cantidades, eliminar items y finalizar compra.
- El encabezado ahora muestra un contador de items del carrito que se actualiza en tiempo real.

Envío de pedidos por correo:

- Por defecto el sitio abrirá el cliente de correo del usuario (mailto:) con el resumen del pedido y los datos del cliente. Esto funciona sin backend, pero requiere que el usuario tenga cliente de correo configurado.
- Si quieres recibir los pedidos directamente en tu email sin que el comprador use su cliente, puedes usar Formspree (https://formspree.io): crea una cuenta y copia tu endpoint (p.ej. `https://formspree.io/f/tu-id`).
  - Para habilitar Formspree en la versión cliente, copia ese endpoint y pégalo en `config.js` dentro de `window.GAMMS_CONFIG.FORMSPREE_ENDPOINT` (ya se incluye `config.js` en las páginas y es la fuente única de configuración).
  - Cuando esté configurado, el formulario enviará los datos al endpoint de Formspree y recibirás los mensajes en el correo que tengas asociado a Formspree.

En este proyecto ya configuré el endpoint que me diste: `https://formspree.io/f/mldadbww`. Si quieres que use otro endpoint o que ponga un email distinto en el mailto por defecto, dímelo y lo cambio.

Nota: reemplaza `tu-email@example.com` en `app.js` y `cart.js` por el correo donde quieras que se abra el cliente (si usas mailto). Si prefieres que quite el mailto y solo use Formspree, puedo eliminar la alternativa mailto.

Cómo probarlo localmente:

1. Abre `index.html` en tu navegador (doble clic o arrastrar al navegador).
2. Haz clic en las miniaturas para abrir el lightbox y usa las flechas para navegar.
3. Agrega productos al carrito. El carrito se guardará en `localStorage`.

Notas y próximos pasos sugeridos:

- Reemplazar las imágenes por versiones optimizadas (thumbnails y tamaño grande).
- Extraer los productos a un archivo JSON y renderizarlos dinámicamente.
- Añadir formulario real (por ejemplo con Formspree o un backend simple) para recibir mensajes.
- Mejorar estilos y animaciones si deseas una presentación más pulida.

Si quieres, puedo:
- Implementar la optimización de imágenes (crear thumbnails y versiones grandes).
- Convertir los productos a un JSON y renderizarlos desde `app.js`.
- Añadir pruebas básicas o integrar un pequeño servidor local.
