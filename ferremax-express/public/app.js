import { ic, emo, header, footer, hero, slides, benefits, infoStrip } from '/ui.js'
const $ = s => document.querySelector(s), app = $('#app')
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const mxn = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
const pic = p => /^(https?:\/\/|\/)/.test(p.image || '') ? `<img src="${esc(p.image)}" alt="" loading="lazy" class="h-full w-full object-contain">` : emo(p.name)
const loadGsi = () => new Promise((ok, no) => { if (window.google?.accounts) return ok(); const t = document.createElement('script'); t.src = 'https://accounts.google.com/gsi/client'; t.onload = ok; t.onerror = () => no(new Error('No se pudo cargar Google')); document.head.append(t) })
const initGoogle = async id => { try { await loadGsi(); google.accounts.id.initialize({ client_id: id, callback: async r => { try { user = await api('/auth/google', { method: 'POST', body: { credential: r.credential } }); render() } catch (e) { const el = $('#ae'); if (el) el.textContent = e.message } } })
  google.accounts.id.renderButton($('#gbtn'), { theme: 'outline', size: 'large', text: 'continue_with', locale: 'es' }) } catch (e) { $('#ae').textContent = e.message } }
const api = async (p, o = {}) => { const r = await fetch('/api' + p, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && JSON.stringify(o.body) }); if (r.status === 204) return null; const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || `Error ${r.status}`), { fields: d.fields }); return d }
let cart = JSON.parse(localStorage.getItem('ferremax_cart') || '[]'), user = null
const refreshTotal = async () => { try { const t = cart.length ? await api('/pricing', { method: 'POST', body: { lines: cart } }) : null; $('#ct').textContent = mxn(t ? t.subtotal : 0) } catch { /* el total del encabezado es informativo */ } }
const saveCart = () => { localStorage.setItem('ferremax_cart', JSON.stringify(cart)); $('#cc').textContent = cart.reduce((s, l) => s + l.quantity, 0); refreshTotal() }
const setQty = (p, q) => { q = Math.max(0, Math.min(q, p.stock)); cart = cart.filter(l => l.productId !== p.id); if (q) cart.push({ productId: p.id, quantity: q }); saveCart() }
const qtyOf = id => cart.find(l => l.productId === id)?.quantity || 0
const card = (p, cls = '') => `<article class="pcard w-full ${cls}"><a href="#/producto/${esc(p.id)}"><div class="pcard-img" role="img" aria-label="${esc(p.name)}">${pic(p)}</div><h3>${esc(p.name)}</h3></a><small class="mt-0.5 text-xs text-gray-500">${esc(p.brand)}${p.brand ? ' · ' : ''}${esc(p.sku)}</small><strong class="mb-2 mt-1 text-[13px]">${mxn(p.price)}</strong>${p.stock ? `<button class="btn mt-auto w-full" data-add="${esc(p.id)}">Agregar al carrito</button>` : '<em class="mt-auto rounded-[3px] bg-gray-100 py-2 text-center text-xs text-gray-600">Sin existencias</em>'}</article>`
const grid = l => `<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">${l.map(p => card(p)).join('')}</div>`
const head = (t, href = '#/catalogo', txt = 'Ver todas') => `<div class="mb-4 flex items-end justify-between"><h2 class="titulo-seccion">${t}</h2>${href ? `<a class="ver-todas" href="${href}">${txt}${ic('arrowR', 'h-4 w-4')}</a>` : ''}</div>`
const carousel = (items, w = 'w-[170px]') => `<div data-carousel class="flex items-center gap-1"><button class="flecha" data-scroll="-1" aria-label="Anterior">${ic('arrowL', 'h-6 w-6')}</button><div data-track class="carrusel min-w-0 flex-1 px-0.5 py-1">${items.map(h => `<div class="${w} flex shrink-0 snap-start">${h}</div>`).join('')}</div><button class="flecha" data-scroll="1" aria-label="Siguiente">${ic('arrowR', 'h-6 w-6')}</button></div>`
const catTile = (c, ps) => { const im = ps.find(p => p.categoryId === c.id && /^(https?:\/\/|\/)/.test(p.image || '')); return `<a href="#/catalogo?categoryId=${esc(c.id)}" class="pcard group overflow-hidden !p-0"><div class="grid h-28 place-items-center bg-gray-50 text-5xl">${im ? `<img src="${esc(im.image)}" alt="" loading="lazy" class="h-full w-full object-cover">` : emo(c.name)}</div><div class="p-3"><h3 class="text-[13px] font-bold">${esc(c.name)}</h3><span class="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">Ver productos${ic('arrowR', 'h-3.5 w-3.5')}</span></div></a>` }
const loading = () => app.innerHTML = '<p role="status">Cargando…</p>'
const fail = e => app.innerHTML = `<p role="alert" class="text-red-700">No se pudo cargar: ${esc(e.message)}</p>`
const empty = (t, a = '#/catalogo', b = 'Volver al catálogo') => `<div class="py-12 text-center"><h1 class="mb-3 text-2xl font-bold">${t}</h1><a class="btn" href="${a}">${b}</a></div>`
const toast = m => { const t = document.createElement('div'); t.setAttribute('role', 'status'); t.className = 'fixed bottom-4 right-4 rounded-md bg-gray-900 px-4 py-2 text-white'; t.textContent = m; document.body.append(t); setTimeout(() => t.remove(), 1500) }

const routes = {
  async home() { const [c, p, br] = await Promise.all([api('/categories'), api('/products'), api('/brands')])
    const W = 'mx-auto max-w-[1180px] px-4'
    app.innerHTML = `<section id="hero" aria-label="Destacados">${hero(0)}</section>${benefits()}
    <section class="${W} pt-8"><div class="flex flex-col gap-0">${head('Categorías principales')}${c.length ? `<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">${c.slice(0, 6).map(x => catTile(x, p)).join('')}</div>` : '<p>Aún no hay categorías en la base de datos.</p>'}</div></section>
    <section class="${W} pt-10">${head('Productos recientes')}${p.length ? carousel(p.slice(0, 12).map(x => card(x))) : '<p>Aún no hay productos en la base de datos.</p>'}</section>
    <section class="${W} pt-10 pb-10">${head('Marcas que manejamos', '#/marcas', 'Ver todas')}${br.length ? `<div class="border-t border-gray-200 pt-3">${carousel(br.map(b => `<a href="#/catalogo?brand=${encodeURIComponent(b.name)}" class="grid h-16 place-items-center rounded-[3px] px-3 text-center text-lg font-extrabold uppercase tracking-wide text-gray-500 hover:text-brand">${esc(b.name)}</a>`), 'w-[150px]')}</div>` : '<p>Aún no hay marcas en la base de datos.</p>'}</section>
    ${infoStrip()}` },
  async marcas() { const br = await api('/brands')
    app.innerHTML = `${head('Marcas que manejamos', '#/catalogo', 'Ir a la tienda')}${br.length ? `<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">${br.map(b => `<a class="pcard grid h-20 place-items-center text-center text-sm font-extrabold uppercase tracking-wide text-gray-600 hover:text-brand" href="#/catalogo?brand=${encodeURIComponent(b.name)}">${esc(b.name)}</a>`).join('')}</div>` : '<p>Aún no hay marcas en la base de datos.</p>'}` },
  async catalogo(_, qs) { const g = k => qs.get(k) || ''; const [c, p, br] = await Promise.all([api('/categories'), api('/products?' + qs), api('/brands')])
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(v) === cur ? 'selected' : ''}>${esc(l)}</option>`
    app.innerHTML = `<div class="grid gap-5 md:grid-cols-[240px_1fr]"><form id="ff" class="flex flex-col gap-3" aria-label="Filtros"><h2 class="font-bold">Filtros</h2>
    <label>Buscar<input name="q" class="field" value="${esc(g('q'))}"></label>
    <label>Categoría<select name="categoryId" class="field"><option value="">Todas</option>${c.map(x => opt(x.id, x.name, g('categoryId'))).join('')}</select></label>
    <label>Marca<select name="brand" class="field"><option value="">Todas</option>${br.map(b => opt(b.name, b.name, g('brand'))).join('')}</select></label>
    <label>Precio máx. (MXN)<input name="maxPrice" type="number" min="0" class="field" value="${esc(g('maxPrice'))}"></label>
    <label>Ordenar<select name="sort" class="field">${[['', 'Relevancia'], ['precio-asc', 'Precio ↑'], ['precio-desc', 'Precio ↓'], ['nombre', 'Nombre']].map(([v, l]) => opt(v, l, g('sort'))).join('')}</select></label>
    <button class="btn">Aplicar</button><a href="#/catalogo" class="text-center underline">Limpiar filtros</a></form>
    <section><p class="mb-2">${p.length} resultado(s)</p>${p.length ? grid(p) : '<p>Sin resultados. Prueba limpiar los filtros.</p>'}</section></div>` },
  async producto([id]) { const p = await api('/products/' + encodeURIComponent(id)).catch(() => null); if (!p) return app.innerHTML = empty('Producto no encontrado', '#/', 'Inicio')
    const max = Math.max(0, p.stock - qtyOf(p.id))
    app.innerHTML = `<div class="grid gap-6 md:grid-cols-2"><div class="grid h-72 place-items-center rounded-xl bg-gray-100 text-8xl" role="img" aria-label="${esc(p.name)}">${pic(p)}</div><div><h1 class="text-2xl font-bold">${esc(p.name)}</h1><p>${esc(p.brand)} · SKU ${esc(p.sku)}</p><p class="my-2">${esc(p.description)}</p><p class="text-2xl font-bold">${mxn(p.price)}</p>
    <p>${p.stock ? `Disponible (${p.stock} en existencia demo)` : 'Sin existencias'}</p>${max ? `<label class="my-2 block">Cantidad <input id="qn" type="number" min="1" max="${max}" value="1" class="field w-24"></label><button class="btn" data-addn="${esc(p.id)}">Agregar al carrito</button>` : ''}</div></div>` },
  async carrito() { if (!cart.length) return app.innerHTML = empty('Tu carrito está vacío'); const t = await api('/pricing', { method: 'POST', body: { lines: cart } })
    if (!t.items.length) { cart = []; saveCart(); return app.innerHTML = empty('Tu carrito está vacío') }
    app.innerHTML = `<h1 class="mb-3 text-2xl font-bold">Carrito</h1>${t.items.map(i => `<div class="flex flex-wrap items-center justify-between gap-2 border-b py-2"><span class="min-w-40 flex-1">${esc(i.name)}</span><span>${mxn(i.unitPrice)}</span>
    <span><button class="btn" aria-label="Disminuir" data-dec="${esc(i.productId)}">−</button> ${i.quantity} <button class="btn" aria-label="Aumentar" data-inc="${esc(i.productId)}">+</button></span><strong>${mxn(i.subtotal)}</strong><button class="btn" data-rm="${esc(i.productId)}">Eliminar</button></div>`).join('')}
    <p class="mt-3">Subtotal: ${mxn(t.subtotal)}</p><p>Envío (estimado): ${mxn(t.shipping)}</p><h2 class="text-xl font-bold">Total: ${mxn(t.total)}</h2><div class="mt-3 flex gap-3"><button class="btn" data-clear>Vaciar</button><a class="btn" href="#/catalogo">Continuar comprando</a><a class="btn" href="#/checkout">Ir al checkout</a></div>` },
  async checkout() { if (!cart.length) return app.innerHTML = empty('No hay productos para comprar'); if (!user) return app.innerHTML = empty('Para crear un pedido de demostración entra con el usuario de prueba', '#/cuenta', 'Ir a mi cuenta'); const t = await api('/pricing', { method: 'POST', body: { lines: cart } })
    const L = (n, l, ex = '') => `<label>${l} *<input name="${n}" class="field" ${ex}><span class="text-red-700" data-err="${n}"></span></label>`
    app.innerHTML = `<form id="co" class="mx-auto flex max-w-lg flex-col gap-3"><h1 class="text-2xl font-bold">Checkout (demostración)</h1>
    <h2 class="font-bold">1. Revisión</h2><p>${t.items.map(i => `${i.quantity} × ${esc(i.name)}`).join(', ')} — Total ${mxn(t.total)}</p>
    <h2 class="font-bold">2–3. Datos y dirección</h2>${L('name', 'Nombre')}${L('email', 'Correo', 'type="email"')}${L('calle', 'Calle')}${L('numeroExterior', 'Número exterior')}${L('colonia', 'Colonia')}${L('codigoPostal', 'Código postal')}${L('ciudad', 'Ciudad')}${L('estado', 'Estado')}
    <h2 class="font-bold">4. Entrega</h2><select name="delivery" class="field"><option value="domicilio">A domicilio</option><option value="sucursal">Recoger en sucursal</option></select>
    <h2 class="font-bold">5. Pago (ilustrativo, pendiente de aprobación del cliente)</h2><select name="paymentMethod" class="field"><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="tienda">Pago en tienda</option></select>
    <p class="bg-orange-50 p-2 text-sm">No se solicitan datos de tarjeta ni se realiza ningún cobro.</p><p id="ce" role="alert" class="text-red-700"></p><button class="btn">Confirmar pedido de demostración</button></form>` },
  async pedidos() { const o = await api('/orders')
    app.innerHTML = `<h1 class="mb-3 text-2xl font-bold">Mis pedidos (demostración)</h1>${o.length ? o.map(x => `<article class="card mb-3"><b>${esc(x.id)}</b> · ${new Date(x.createdAt).toLocaleString('es-MX')}<p>${esc(x.status)}</p><p>Pago: ${esc(x.paymentStatus.replace(/_/g, ' '))}</p><ul class="list-disc pl-5">${x.items.map(i => `<li>${i.quantity} × ${esc(i.name)} — ${mxn(i.subtotal)}</li>`).join('')}</ul><strong>Total ${mxn(x.total)}</strong></article>`).join('') : '<p>Aún no tienes pedidos.</p>'}` },
  async cuenta() {
    if (user) return app.innerHTML = `<div class="mx-auto max-w-md"><h1 class="mb-3 text-2xl font-bold">Mi cuenta</h1><p>Nombre: ${esc(user.name)}</p><p>Correo: ${esc(user.email)}</p>${user.isDemo ? '<p class="my-2 bg-orange-50 p-2 text-sm">Sesión de demostración (no es una cuenta real).</p>' : ''}<div class="mt-3 flex gap-3"><a class="btn" href="#/pedidos">Mis pedidos</a><button class="btn" data-logout>Cerrar sesión</button></div></div>`
    const cfg = await api('/config'); const L = (n, t, ty = 'text', ac = '') => `<label>${t}<input name="${n}" type="${ty}" autocomplete="${ac}" required class="field"></label>`
    app.innerHTML = `<div class="mx-auto grid max-w-3xl gap-8 md:grid-cols-2"><form id="lf" class="flex flex-col gap-3"><h1 class="text-2xl font-bold">Iniciar sesión</h1>${L('email', 'Correo', 'email', 'email')}${L('password', 'Contraseña', 'password', 'current-password')}<button class="btn">Entrar</button></form>
    <form id="rf" class="flex flex-col gap-3"><h2 class="text-2xl font-bold">Crear cuenta</h2>${L('name', 'Nombre', 'text', 'given-name')}${L('apellido', 'Apellido paterno', 'text', 'family-name')}${L('email', 'Correo', 'email', 'email')}${L('password', 'Contraseña (mínimo 8 caracteres)', 'password', 'new-password')}<button class="btn">Crear cuenta</button></form></div>
    <p id="ae" role="alert" class="mt-3 text-center text-red-700"></p><div class="mt-4 flex flex-col items-center gap-3">${cfg.googleClientId ? '<div id="gbtn"></div>' : '<p class="text-sm text-gray-600">Inicio con Google no configurado (falta GOOGLE_CLIENT_ID en .env).</p>'}<button class="btn" data-demo>Entrar como usuario de prueba</button><p class="text-sm text-gray-600">Recuperar contraseña: aún no disponible (requiere servicio de correo).</p></div>`
    if (cfg.googleClientId) initGoogle(cfg.googleClientId) },
  async info([s]) { const I = { faq: 'Preguntas frecuentes', privacidad: 'Política de privacidad', terminos: 'Términos y condiciones', envios: 'Envíos y devoluciones', nosotros: 'Nosotros', contacto: 'Contacto' }; app.innerHTML = I[s] ? `<h1 class="text-2xl font-bold">${I[s]}</h1><p>Texto demostrativo pendiente de definir por el cliente.</p>` : empty('404 · Página no encontrada', '#/', 'Inicio') },
}
async function render() { const [path, q = ''] = location.hash.slice(2).split('?'); const [name, ...args] = path.split('/'); const fn = routes[name || 'home']; app.className = name ? 'mx-auto max-w-6xl px-4 py-8' : ''; loading()
  const key = name === 'info' ? 'info/' + args[0] : name || 'home'; document.querySelectorAll('#nav a').forEach(a => a.toggleAttribute('aria-current', a.dataset.r === key))
  $('#acc').textContent = user ? 'Mi cuenta' : 'Iniciar sesión'; try { fn ? await fn(args, new URLSearchParams(q)) : app.innerHTML = empty('404 · Página no encontrada', '#/', 'Inicio') } catch (e) { fail(e) } }
const prod = id => api('/products/' + encodeURIComponent(id))
document.addEventListener('click', async e => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset
  try {
    if (d.add) { const p = await prod(d.add); setQty(p, qtyOf(p.id) + 1); toast('✓ Agregado al carrito') }
    else if (d.addn) { const p = await prod(d.addn); setQty(p, qtyOf(p.id) + Math.max(1, Number($('#qn').value) || 1)); toast('✓ Agregado al carrito'); render() }
    else if (d.inc || d.dec) { const id = d.inc || d.dec; const p = await prod(id); setQty(p, qtyOf(id) + (d.inc ? 1 : -1)); render() }
    else if (d.rm) { cart = cart.filter(l => l.productId !== d.rm); saveCart(); render() }
    else if (d.scroll) { const t = b.closest('[data-carousel]').querySelector('[data-track]'); t.scrollBy({ left: Number(d.scroll) * t.clientWidth * 0.8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }
    else if (d.slide) { $('#hero').innerHTML = hero(Number(d.slide)) }
    else if ('menu' in d) { const n = $('#nav'), o = n.classList.contains('hidden'); n.classList.toggle('hidden', !o); n.classList.toggle('flex', o); b.setAttribute('aria-expanded', o) }
    else if ('clear' in d) { cart = []; saveCart(); render() }
    else if ('demo' in d) { user = await api('/auth/demo-login', { method: 'POST' }); location.hash = '#/cuenta'; render() }
    else if ('logout' in d) { await api('/auth/logout', { method: 'POST' }); user = null; location.hash = '#/'; render() }
  } catch (x) { toast(x.message) } })
document.addEventListener('submit', async e => { e.preventDefault(); const f = e.target
  if (f.id === 'sf') location.hash = '#/catalogo?q=' + encodeURIComponent($('#sq').value)
  else if (f.id === 'ff') { const p = new URLSearchParams([...new FormData(f)].filter(([, v]) => v)); location.hash = '#/catalogo' + (p.size ? '?' + p : '') }
  else if (f.id === 'lf' || f.id === 'rf') { const v = Object.fromEntries(new FormData(f)), btn = f.querySelector('button'); btn.disabled = true; $('#ae').textContent = ''
    try { user = await api(f.id === 'lf' ? '/auth/login' : '/auth/register', { method: 'POST', body: v }); render() } catch (x) { $('#ae').textContent = x.fields ? 'Revisa los datos: nombre, apellido, correo válido y contraseña de al menos 8 caracteres' : x.message; btn.disabled = false } }
  else if (f.id === 'co') { const v = Object.fromEntries(new FormData(f)); f.querySelectorAll('[data-err]').forEach(s => s.textContent = ''); $('#ce').textContent = ''
    const er = {}; if (v.name.trim().length < 3) er.name = 'Escribe tu nombre completo'; if (!/^\S+@\S+\.\S+$/.test(v.email)) er.email = 'Correo no válido'; for (const k of ['calle', 'numeroExterior', 'colonia', 'codigoPostal', 'ciudad', 'estado']) if (!String(v[k] || '').trim()) er[k] = 'Campo obligatorio'
    if (Object.keys(er).length) return Object.entries(er).forEach(([k, m]) => f.querySelector(`[data-err=${k}]`).textContent = m)
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Creando…'
    try { const o = await api('/orders', { method: 'POST', body: { lines: cart, customer: { name: v.name, email: v.email }, address: { calle: v.calle, numeroExterior: v.numeroExterior, colonia: v.colonia, codigoPostal: v.codigoPostal, ciudad: v.ciudad, estado: v.estado }, delivery: v.delivery, paymentMethod: v.paymentMethod } }); cart = []; saveCart()
      app.innerHTML = `<div class="py-12 text-center"><h1 class="mb-2 text-2xl font-bold">¡Pedido de demostración creado!</h1><p>Folio demostrativo: <b>${esc(o.id)}</b></p><p>${esc(o.status)}</p><p class="mb-3">Total: ${mxn(o.total)}</p><a class="btn" href="#/pedidos">Ver mis pedidos</a></div>` }
    catch (x) { $('#ce').textContent = x.message; btn.disabled = false; btn.textContent = 'Confirmar pedido de demostración' } } })
window.addEventListener('hashchange', render)
$('#hdr').innerHTML = header(); $('#ftr').innerHTML = footer(); api('/categories').then(c => $('#fcat').innerHTML = c.slice(0, 6).map(x => `<li><a class="hover:text-brand" href="#/catalogo?categoryId=${esc(x.id)}">${esc(x.name)}</a></li>`).join('') || $('#fcat').innerHTML).catch(() => {})
saveCart(); api('/auth/me').then(u => user = u).catch(() => {}).finally(render)
