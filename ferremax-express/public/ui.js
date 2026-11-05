// Piezas de interfaz sin datos dinámicos: iconos, cabecera, hero, franjas informativas y pie de página.
// Los datos de contacto son DEMOSTRATIVOS: sustituir cuando el cliente los defina.
const P = {
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m9 14-1.5 7L12 18.5 16.5 21 15 14"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20c0 1.5-2 2-5 2"/>',
  store: '<path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0M9 20v-6h6v6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  box: '<path d="M3 8 12 3l9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/>'
}
export const ic = (n, c = 'h-5 w-5') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${c}">${P[n]}</svg>`

// Emoji de reserva cuando un producto o categoría no tiene imagen en la base de datos
const EMO = [[/desarmador/, '🪛'], [/martillo|manual/, '🔨'], [/material el|cable|foco/, '💡'], [/taladro|esmeril|eléctric|electric/, '🛠️'], [/tornill|clavo|fijaci/, '🔩'], [/cerradur|herraje|candado/, '🔒'], [/plomer|llave|grifo|mezcladora/, '🚰'], [/pintur|brocha|rodillo/, '🎨'], [/lija|abrasiv|carpinter/, '🧱']]
export const emo = t => (EMO.find(([r]) => r.test(String(t || '').toLowerCase())) || [, '📦'])[1]

// ───────── Categorías ─────────
// Ruta del backend que devuelve la tabla `categorias` (ajustar si es otra).
// Se esperan filas con: id_categoria, nombre, id_categoria_padre, activo.
const CATS_API = '/api/categorias'

const catHref = nombre => `#/catalogo?cat=${encodeURIComponent(nombre)}`
const catNode = nombre => ({ nombre, href: catHref(nombre), hijos: [] })

// Categorías base mientras no lleguen datos del backend
const CATS = [
  'Herramientas manuales',
  'Herramientas eléctricas',
  'Desarmadores',
  'Tornillería y fijación',
  'Material eléctrico',
  'Plomería',
  'Cerraduras y herrajes',
  'Pinturas y accesorios',
  'Lijas y carpintería'
].map(catNode)

// Convierte filas planas (id_categoria_padre) en un árbol: padres con sus subcategorías.
// Ignora categorías inactivas y las hijas de una categoría inactiva.
export const buildCatTree = rows => {
  const activa = r => r.activo === undefined || r.activo === true || r.activo === 1 || r.activo === '1'
  const lista = (rows || []).filter(r => r && r.nombre && activa(r))
  const idDe = r => r.id_categoria ?? r.id
  const nodos = new Map(lista.map(r => [idDe(r), catNode(r.nombre)]))
  const raiz = []
  lista.forEach(r => {
    const padre = r.id_categoria_padre ?? null
    if (padre === null) raiz.push(nodos.get(idDe(r)))
    else if (nodos.has(padre)) nodos.get(padre).hijos.push(nodos.get(idDe(r)))
  })
  return raiz
}

let catTree = CATS
let catDinamico = false

export const setCategorias = rows => {
  const arbol = buildCatTree(rows)
  if (!arbol.length) return
  catTree = arbol
  catDinamico = true
  if (typeof document === 'undefined') return
  const hcat = document.getElementById('hcat')
  if (hcat) hcat.innerHTML = renderCatItems(catTree)
}

const NAV = [['home', '#/', 'Inicio'], ['catalogo', '#/catalogo', 'Tienda'], ['marcas', '#/marcas', 'Marcas'], ['info/nosotros', '#/info/nosotros', 'Nosotros'], ['info/contacto', '#/info/contacto', 'Contacto']]

// Menú de categorías (diseño minimalista, sin emojis).
// · Escritorio (md+): lista de padres; al pasar el cursor (o con el teclado) se abre un panel lateral con sus subcategorías.
// · Móvil: acordeón; el botón de la derecha despliega las subcategorías debajo del padre.
const renderCatItems = items => [
  ...items.map(({ nombre, href, hijos = [] }) => {
    const sub = hijos.length > 0
    return `<li class="${sub ? 'has-sub ' : ''}group/p relative">
      <div class="flex items-stretch">
        <a class="flex flex-1 items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-gray-700 transition-colors hover:bg-crema hover:text-brand focus-visible:bg-crema focus-visible:text-brand focus-visible:outline-none group-hover/p:bg-crema group-hover/p:text-brand" href="${href}"><span class="leading-tight">${nombre}</span><span class="hidden -translate-x-1 text-brand opacity-0 transition duration-150 group-hover/p:translate-x-0 group-hover/p:opacity-100 group-focus-within/p:translate-x-0 group-focus-within/p:opacity-100 md:block">${ic('chevR', 'h-4 w-4')}</span></a>
        ${sub ? `<button type="button" data-sub aria-expanded="false" aria-label="Mostrar subcategorías de ${nombre}" class="grid w-12 shrink-0 place-items-center border-l border-gray-100 text-gray-500 hover:text-brand md:hidden"><span data-chev class="transition-transform duration-200">${ic('chevR', 'h-4 w-4')}</span></button>` : ''}
      </div>
      ${sub ? `<ul class="sub border-t border-gray-100 bg-gray-50 py-1 md:z-40 md:rounded-[3px] md:border md:border-gray-200 md:bg-white md:py-1 md:shadow-[0_10px_28px_-12px_rgba(0,0,0,.25)]">${hijos.map(h => `<li><a class="block py-2.5 pl-9 pr-4 text-[13px] text-gray-600 transition-colors hover:bg-crema hover:text-brand focus-visible:bg-crema focus-visible:text-brand focus-visible:outline-none md:pl-4" href="${h.href}">${h.nombre}</a></li>`).join('')}</ul>` : ''}
    </li>`
  }),
  `<li class="sticky bottom-0 mt-1 border-t border-gray-100 bg-white"><a class="flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-brand transition-colors hover:bg-crema focus-visible:bg-crema focus-visible:outline-none" href="#/catalogo"><span>Ver todo el catálogo</span>${ic('arrowR', 'h-4 w-4')}</a></li>`
].join('')

export const header = () => `
<div class="bg-crema text-[12px] text-gray-700"><div class="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
  <span class="flex items-center gap-1.5"><span class="text-brand">${ic('pin', 'h-4 w-4')}</span>Dirección de la sucursal (pendiente de definir)</span>
  <span class="hidden items-center gap-1.5 sm:flex"><span class="text-brand">${ic('clock', 'h-4 w-4')}</span>Horario de atención (pendiente de definir)</span>
  <span class="font-semibold">Sitio de demostración · sin cobros reales</span>
</div></div>
<header class="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
  <a href="#/" aria-label="Ferromax, ir al inicio" class="flex h-[84px] w-[230px] shrink-0 flex-col items-center justify-center rounded-[3px] bg-brand text-white">
    <span class="text-[32px] font-black leading-none tracking-wider">FERROMAX</span><span class="mt-1.5 text-[10px] font-bold uppercase tracking-[.28em]">Ferretería en línea</span></a>
  <form id="sf" role="search" class="order-last flex w-full min-w-[240px] flex-1 md:order-none md:w-auto">
    <input id="sq" class="h-11 w-full rounded-l-[3px] bg-gray-100 px-4 text-sm placeholder:text-gray-500" aria-label="Buscar productos" placeholder="Buscar productos…">
    <button class="grid h-11 w-12 shrink-0 place-items-center rounded-r-[3px] bg-gray-100 text-tinta hover:text-brand" aria-label="Buscar">${ic('search')}</button></form>
  <a href="#/cuenta" class="flex items-center gap-2.5 text-[13px] hover:text-brand"><span class="text-brand">${ic('user', 'h-8 w-8')}</span>
    <span><span id="acc" class="block font-bold">Iniciar sesión</span><span class="block text-xs text-gray-600">Mi cuenta y pedidos</span></span></a>
  <a href="#/carrito" class="flex items-center gap-2.5 hover:text-brand" aria-label="Ver carrito">
    <span class="relative">${ic('cart', 'h-8 w-8')}<span id="cc" class="absolute -right-2.5 -top-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">0</span></span>
    <span id="ct" class="text-sm font-bold">$0.00</span></a>
</header>
<div class="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-2 px-4 pb-3">
  <details id="cat-dd" class="group relative">
    <summary class="inline-flex h-11 cursor-pointer list-none items-center gap-3 rounded-[3px] bg-brand px-5 text-[13px] font-bold uppercase tracking-wide text-white select-none transition-colors hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand group-open:bg-brand-dark [&::-webkit-details-marker]:hidden">
      ${ic('menu', 'h-4 w-4')}Todas las categorías<span class="transition-transform duration-200 group-open:rotate-180">${ic('chevD', 'h-4 w-4')}</span>
    </summary>
    <ul id="hcat" class="absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-[3px] border border-gray-200 bg-white py-1 text-tinta shadow-[0_10px_28px_-12px_rgba(0,0,0,.25)] overscroll-contain md:w-64">
      ${renderCatItems(catTree)}
    </ul>
  </details>
  <button data-menu class="grid h-11 w-11 place-items-center rounded-[3px] border border-gray-300 md:hidden" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav">${ic('menu')}</button>
  <nav id="nav" aria-label="Principal" class="hidden w-full flex-col gap-2 md:flex md:w-auto md:flex-row md:gap-8">${NAV.map(([r, h, t]) => `<a class="nav-link" data-r="${r}" href="${h}">${t}</a>`).join('')}</nav>
</div>`

const lock = () => `<svg viewBox="0 0 460 350" class="h-full w-full" role="img" aria-label="Ilustración de un candado rojo">
  <defs><linearGradient id="acero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f4f6"/><stop offset=".5" stop-color="#b4b7bd"/><stop offset="1" stop-color="#868a92"/></linearGradient>
  <linearGradient id="cuerpo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8203d"/><stop offset="1" stop-color="#a50d26"/></linearGradient></defs>
  <circle cx="290" cy="170" r="165" fill="#fff" opacity=".55"/><circle cx="290" cy="170" r="110" fill="#fff" opacity=".5"/>
  <path d="M215 180v-55a65 65 0 0 1 130 0v55" fill="none" stroke="url(#acero)" stroke-width="24" stroke-linecap="round"/>
  <rect x="170" y="175" width="240" height="160" rx="18" fill="url(#cuerpo)"/><rect x="182" y="187" width="216" height="136" rx="12" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
  <circle cx="290" cy="238" r="19" fill="#2f2f33"/><path d="M281 246h18l6 38h-30z" fill="#2f2f33"/></svg>`

export const slides = [
  { eyebrow: 'Todo para tu obra y tu hogar', a: 'Herramientas de calidad', b: 'para cada proyecto', text: 'Explora el catálogo de Ferromax: herramientas manuales y eléctricas, tornillería, material eléctrico, plomería, pinturas y más.', cta: ['Ver productos', '#/catalogo'], alt: ['Contáctanos', '#/info/contacto'] },
  { eyebrow: 'Para el taller', a: 'Todo lo que necesitas', b: 'para trabajar mejor', text: 'Taladros, esmeriladoras, juegos de desarmadores y abrasivos para tu siguiente trabajo.', cta: ['Ver herramientas', '#/catalogo'], alt: ['Ver marcas', '#/marcas'] },
  { eyebrow: 'Para el hogar', a: 'Repara, pinta y mejora', b: 'sin salir de casa', text: 'Plomería, material eléctrico, pinturas y cerraduras. Elige entrega a domicilio o recoge en sucursal.', cta: ['Explorar catálogo', '#/catalogo'], alt: ['Cómo comprar', '#/info/faq'] }
]
export const hero = (i = 0) => { const s = slides[i]; return `
<div class="relative overflow-hidden bg-gradient-to-r from-crema via-crema to-gray-200">
  <div class="mx-auto grid min-h-[320px] max-w-[1180px] items-center px-4 md:min-h-[350px] md:grid-cols-[1.25fr_1fr]">
    <div class="py-10 md:pr-8">
      <p class="mb-4 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-brand"><span class="h-px w-4 bg-brand"></span>${s.eyebrow}</p>
      <h1 class="text-[34px] font-extrabold leading-[1.12] text-tinta md:text-[42px]">${s.a}<br><span class="text-brand">${s.b}</span></h1>
      <p class="mt-5 max-w-md text-[15px] leading-relaxed text-gray-600">${s.text}</p>
      <div class="mt-8 flex flex-wrap gap-3"><a class="btn h-11 px-6" href="${s.cta[1]}">${s.cta[0]}${ic('arrowR', 'h-4 w-4')}</a><a class="btn-ghost h-11 px-6" href="${s.alt[1]}">${s.alt[0]}</a></div>
    </div>
    <div class="hidden h-full md:block">${lock()}</div>
  </div>
  <div class="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" role="group" aria-label="Elegir diapositiva">${slides.map((_, j) => `<button data-slide="${j}" aria-label="Diapositiva ${j + 1}" aria-current="${j === i}" class="h-2.5 w-2.5 rounded-full ${j === i ? 'bg-brand' : 'bg-white shadow'}"></button>`).join('')}</div>
</div>` }

const strip = items => `<section class="bg-crema"><div class="mx-auto grid max-w-[1180px] gap-x-6 gap-y-5 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4">${items.map(([i, t, d]) => `<div class="flex items-center gap-3"><span class="text-brand">${ic(i, 'h-10 w-10')}</span><p class="text-[13px] leading-snug"><b class="block text-[13px]">${t}</b><span class="text-gray-600">${d}</span></p></div>`).join('')}</div></section>`
export const benefits = () => strip([['truck', 'Entrega o recolección', 'A domicilio o en sucursal'], ['award', 'Variedad de productos', 'Para obra, taller y hogar'], ['shield', 'Compra segura', 'Sin cobros en esta demostración'], ['headset', 'Atención al cliente', 'Te ayudamos a elegir']])
export const infoStrip = () => strip([['store', 'Visítanos en tienda', 'Dirección pendiente de definir'], ['chat', '¿Tienes dudas?', 'Contacto pendiente de definir'], ['shield', 'Compra 100% segura', 'Tus datos están protegidos'], ['box', 'Envíos', 'Cobertura pendiente de definir']])

export const footer = () => `
<footer class="mt-10 border-t border-gray-200 bg-crema">
  <div class="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_.8fr_1fr_1.1fr_1.3fr]">
    <div><a href="#/" class="inline-flex h-[60px] w-[170px] flex-col items-center justify-center rounded-[3px] bg-brand text-white" aria-label="Ferromax, inicio"><span class="text-[22px] font-black leading-none tracking-wider">FERROMAX</span><span class="mt-1 text-[8px] font-bold uppercase tracking-[.25em]">Ferretería en línea</span></a>
      <p class="mt-4 max-w-[220px] text-xs leading-relaxed text-gray-600">Tu ferretería en línea para obra, taller y hogar. Catálogo de demostración.</p></div>
    <div><h2 class="mb-3 text-[13px] font-bold uppercase tracking-wide">Enlaces</h2><ul class="space-y-2 text-xs text-gray-700">${NAV.map(([, h, t]) => `<li><a class="hover:text-brand" href="${h}">${t}</a></li>`).join('')}</ul></div>
    <div><h2 class="mb-3 text-[13px] font-bold uppercase tracking-wide">Categorías</h2><ul id="fcat" class="space-y-2 text-xs text-gray-700">${CATS.map(c => `<li><a class="hover:text-brand" href="${c.href}">${c.nombre}</a></li>`).join('')}</ul></div>
    <div><h2 class="mb-3 text-[13px] font-bold uppercase tracking-wide">Contacto</h2><ul class="space-y-2.5 text-xs text-gray-700">
      <li class="flex gap-2"><span class="text-brand">${ic('pin', 'h-4 w-4')}</span>Dirección pendiente de definir</li>
      <li class="flex gap-2"><span class="text-brand">${ic('phone', 'h-4 w-4')}</span>Teléfono pendiente</li>
      <li class="flex gap-2"><span class="text-brand">${ic('mail', 'h-4 w-4')}</span>correo@ejemplo.com</li>
      <li class="flex gap-2"><span class="text-brand">${ic('clock', 'h-4 w-4')}</span>Horario pendiente de definir</li></ul></div>
    <div class="grid min-h-[140px] place-items-center rounded-[3px] bg-gray-200 p-4 text-center text-xs text-gray-600"><span><span class="mx-auto mb-1 block w-fit text-brand">${ic('pin', 'h-8 w-8')}</span>Mapa de la sucursal<br>(pendiente de la dirección)</span></div>
  </div>
  <div class="border-t border-gray-200"><div class="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-gray-600">
    <span>© 2026 Ferromax. Sitio de demostración; datos definitivos pendientes del cliente.</span>
    <span class="flex flex-wrap gap-5"><a class="hover:text-brand" href="#/info/envios">Envíos y devoluciones</a><a class="hover:text-brand" href="#/info/faq">Preguntas frecuentes</a><a class="hover:text-brand" href="#/info/privacidad">Aviso de privacidad</a><a class="hover:text-brand" href="#/info/terminos">Términos y condiciones</a></span></div></div>
</footer>
<a href="#/info/contacto" class="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-5 text-[13px] font-bold shadow-lg ring-1 ring-black/5 hover:text-brand"><span class="grid h-11 w-11 place-items-center rounded-full bg-brand text-white">${ic('chat', 'h-6 w-6')}</span>¿Necesitas ayuda?</a>`

// ───────── Comportamiento del menú de categorías ─────────
if (typeof document !== 'undefined') {
  // Reglas de mostrar/ocultar subcategorías (no dependen de la versión de Tailwind)
  if (!document.getElementById('cat-dd-css')) {
    const st = document.createElement('style')
    st.id = 'cat-dd-css'
    st.textContent = `
#hcat .sub{display:none}
#hcat li[data-open="true"]>.sub{display:block}
#hcat li[data-open="true"] [data-chev]{transform:rotate(90deg)}
@media (min-width:768px){
  #hcat li[data-open="true"]>.sub{display:none}
  #hcat li.has-sub:hover>.sub,#hcat li.has-sub:focus-within>.sub{display:block}
  #hcat .sub{position:fixed;width:16rem;max-height:70vh;overflow-y:auto;overscroll-behavior:contain}
}`
    document.head.appendChild(st)
  }

  document.addEventListener('click', e => {
    const dd = document.getElementById('cat-dd')
    if (!dd || !dd.open) return
    // Móvil: despliega / pliega las subcategorías de un padre
    const t = e.target.closest('#hcat [data-sub]')
    if (t) {
      const li = t.closest('li')
      const abre = li.dataset.open !== 'true'
      li.dataset.open = String(abre)
      t.setAttribute('aria-expanded', String(abre))
      return
    }
    // Cierra al hacer clic fuera o al elegir una categoría
    if (!dd.contains(e.target) || e.target.closest('#hcat a')) dd.open = false
  })

  // Escritorio: el panel de subcategorías usa posición fija para que el scroll de la lista no lo recorte
  const colocaSub = li => {
    if (!li || !window.matchMedia('(min-width:768px)').matches) return
    const sub = li.querySelector(':scope > .sub')
    if (!sub) return
    const r = li.getBoundingClientRect()
    sub.style.left = r.right + 'px'
    sub.style.top = Math.max(8, r.top - 5) + 'px'
    requestAnimationFrame(() => {
      const h = sub.offsetHeight
      if (h && r.top - 5 + h > window.innerHeight - 8) sub.style.top = Math.max(8, window.innerHeight - h - 8) + 'px'
    })
  }
  document.addEventListener('mouseover', e => colocaSub(e.target.closest?.('#hcat li.has-sub')))
  document.addEventListener('focusin', e => colocaSub(e.target.closest?.('#hcat li.has-sub')))
  document.addEventListener('scroll', e => { if (e.target && e.target.id === 'hcat') colocaSub(e.target.querySelector('li.has-sub:hover')) }, true)

  // Cierra con Escape y devuelve el foco al botón
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return
    const dd = document.getElementById('cat-dd')
    if (!dd || !dd.open) return
    dd.open = false
    dd.querySelector('summary')?.focus()
  })

  // Respaldo: si el pie recibe categorías planas y aún no hay árbol del backend, el menú las copia
  const syncFromFooter = () => {
    if (catDinamico) return
    const fcat = document.getElementById('fcat')
    const hcat = document.getElementById('hcat')
    if (!fcat || !hcat) return
    const links = [...fcat.querySelectorAll('a')].map(a => ({
      nombre: a.textContent.trim(),
      href: a.getAttribute('href') || '#/catalogo',
      hijos: []
    })).filter(x => x.nombre && !/ver cat[aá]logo/i.test(x.nombre))
    if (links.length) hcat.innerHTML = renderCatItems(links)
  }

  const obs = new MutationObserver(syncFromFooter)
  const initSync = () => {
    const fcat = document.getElementById('fcat')
    if (fcat) {
      syncFromFooter()
      obs.observe(fcat, { childList: true, subtree: true })
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSync)
  } else {
    setTimeout(initSync, 0)
  }

  // Carga las categorías reales (con sus padres) desde el backend; si falla, se queda la lista base
  fetch(CATS_API)
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then(j => setCategorias(Array.isArray(j) ? j : (j.categorias || j.data || [])))
    .catch(() => {})
}