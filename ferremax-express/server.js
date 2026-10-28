import express from 'express'; import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'; import { OAuth2Client } from 'google-auth-library'
import { pool } from './db.js'; import { priceCart } from './pricing.js'
const GID = process.env.GOOGLE_CLIENT_ID || ''; const gclient = GID ? new OAuth2Client(GID) : null
const app = express(); app.use(express.json({ limit: '50kb' }))
const sessions = new Map() // sid -> { user } (en memoria)
app.use((req, res, next) => { let sid = /(?:^|; )sid=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1]
  if (!sid || !sessions.has(sid)) { sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, { user: null }); res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`) }
  req.sid = sid; req.s = sessions.get(sid); next() })
const h = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'Error de base de datos. Verifica que MySQL (XAMPP) esté iniciado.' }) })
const s = v => String(v ?? '').trim()

const BASE = `SELECT p.id_producto AS id, p.sku, p.nombre AS name, p.descripcion AS description, p.precio AS price, p.id_categoria AS categoryId, m.nombre AS brand, p.unidad_venta AS unit, COALESCE(e.stock, 0) AS stock,
 (SELECT i.url_imagen FROM imagenes_producto i WHERE i.id_producto = p.id_producto ORDER BY i.es_principal DESC, i.orden_visual LIMIT 1) AS image
 FROM productos p JOIN categorias c ON c.id_categoria = p.id_categoria LEFT JOIN marcas m ON m.id_marca = p.id_marca
 LEFT JOIN (SELECT id_producto, SUM(existencia_actual) AS stock FROM existencias GROUP BY id_producto) e ON e.id_producto = p.id_producto
 WHERE p.activo = 1`
const shape = r => ({ ...r, id: String(r.id), categoryId: String(r.categoryId), price: Number(r.price), stock: Math.floor(Number(r.stock)), brand: r.brand || '', description: r.description || '', image: r.image || '' })
const load = async ids => { ids = [...new Set((ids || []).map(Number).filter(Number.isInteger))]; if (!ids.length) return []; const [r] = await pool.query(`${BASE} AND p.id_producto IN (?)`, [ids]); return r.map(shape) }

const api = express.Router()
api.get('/categories', h(async (_q, res) => { const [r] = await pool.query('SELECT id_categoria AS id, nombre AS name FROM categorias WHERE activo = 1 ORDER BY nombre'); res.json(r.map(x => ({ ...x, id: String(x.id) }))) }))
api.get('/brands', h(async (_q, res) => { const [r] = await pool.query('SELECT id_marca AS id, nombre AS name FROM marcas WHERE activo = 1 ORDER BY nombre'); res.json(r.map(x => ({ ...x, id: String(x.id) }))) }))
api.get('/products', h(async (req, res) => {
  const q = s(req.query.q), { categoryId, brand, maxPrice, sort } = req.query; const w = [], a = []
  if (q) { w.push('(p.nombre LIKE ? OR p.sku LIKE ? OR m.nombre LIKE ?)'); a.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  if (categoryId) { w.push('(p.id_categoria = ? OR c.id_categoria_padre = ?)'); a.push(Number(categoryId), Number(categoryId)) }
  if (brand) { w.push('m.nombre = ?'); a.push(s(brand)) }
  if (maxPrice) { w.push('p.precio <= ?'); a.push(Number(maxPrice)) }
  const order = { 'precio-asc': 'p.precio ASC', 'precio-desc': 'p.precio DESC', nombre: 'p.nombre ASC' }[sort] || 'p.fecha_creacion DESC, p.id_producto DESC'
  const [rows] = await pool.query(`${BASE}${w.length ? ' AND ' + w.join(' AND ') : ''} ORDER BY ${order}`, a); res.json(rows.map(shape)) }))
api.get('/products/:id', h(async (req, res) => { const [p] = await load([req.params.id]); p ? res.json(p) : res.status(404).json({ error: 'Producto no encontrado' }) }))
api.post('/pricing', h(async (req, res) => res.json(priceCart(req.body.lines, await load((req.body.lines || []).map(l => l.productId))))))

const pub = u => u && { name: u.name, email: u.email, isDemo: !!u.isDemo }
const startSession = (req, res, user) => { sessions.delete(req.sid); const sid = crypto.randomBytes(16).toString('hex'); sessions.set(sid, { user }); res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`); return pub(user) } // nueva sesión al entrar (evita fijación de sesión)
const tries = new Map()
const limited = req => { const n = Date.now(), t = (tries.get(req.ip) || []).filter(x => n - x < 9e5); t.push(n); tries.set(req.ip, t); return t.length > 10 }
const emailOk = v => /^\S+@\S+\.\S+$/.test(s(v))
const findUser = async mail => (await pool.query('SELECT id_usuario AS id, nombre, correo, password_hash, rol, activo FROM usuarios WHERE correo = ?', [mail]))[0][0]
const newUser = async (nombre, apellido, mail, hash) => { const [r] = await pool.query('INSERT INTO usuarios (nombre, apellido_paterno, correo, password_hash, rol) VALUES (?, ?, ?, ?, \'CLIENTE\')', [nombre, apellido, mail, hash]); await pool.query('INSERT INTO clientes (id_usuario) VALUES (?)', [r.insertId]); return r.insertId }
api.post('/auth/demo-login', h(async (req, res) => {
  const email = 'prueba@ejemplo.com'; let [[u]] = await pool.query('SELECT id_usuario AS id FROM usuarios WHERE correo = ?', [email])
  if (!u) { // usuario de prueba sin acceso real: el hash no corresponde a ninguna contraseña
    const [r] = await pool.query(`INSERT INTO usuarios (nombre, apellido_paterno, correo, password_hash, rol) VALUES ('Cliente', 'de Prueba', ?, '!SIN-ACCESO-DEMO', 'CLIENTE')`, [email]); u = { id: r.insertId }
    await pool.query('INSERT INTO clientes (id_usuario) VALUES (?)', [u.id]) }
  res.json(startSession(req, res, { id: u.id, name: 'Cliente de prueba', email, isDemo: true })) }))
api.post('/auth/logout', (req, res) => { req.s.user = null; res.status(204).end() })
api.get('/auth/me', (req, res) => res.json(pub(req.s.user) || null))
api.get('/config', (_q, res) => res.json({ googleClientId: GID }))
api.post('/auth/register', h(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
  const { name, apellido, email, password } = req.body
  if (s(name).length < 2 || s(apellido).length < 2 || !emailOk(email) || typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Datos inválidos', fields: ['name', 'apellido', 'email', 'password'] })
  const mail = s(email).toLowerCase(); if (await findUser(mail)) return res.status(409).json({ error: 'Ese correo ya está registrado' })
  const id = await newUser(s(name), s(apellido), mail, await bcrypt.hash(password, 10)); res.status(201).json(startSession(req, res, { id, name: s(name), email: mail })) }))
api.post('/auth/login', h(async (req, res) => {
  if (limited(req)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
  const u = await findUser(s(req.body.email).toLowerCase()), pw = String(req.body.password || '')
  const ok = u && u.activo && u.rol === 'CLIENTE' && u.password_hash.startsWith('$2') && await bcrypt.compare(pw, u.password_hash)
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
  res.json(startSession(req, res, { id: u.id, name: u.nombre, email: u.correo })) }))
api.post('/auth/google', h(async (req, res) => {
  if (!gclient) return res.status(501).json({ error: 'Inicio con Google no configurado (falta GOOGLE_CLIENT_ID)' })
  if (limited(req)) return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' })
  let p; try { p = (await gclient.verifyIdToken({ idToken: String(req.body.credential || ''), audience: GID })).getPayload() } catch { return res.status(401).json({ error: 'Token de Google inválido' }) }
  if (!p.email || !p.email_verified) return res.status(401).json({ error: 'Tu correo de Google no está verificado' })
  const mail = p.email.toLowerCase(); let u = await findUser(mail)
  if (u && (!u.activo || u.rol !== 'CLIENTE')) return res.status(403).json({ error: 'Esta cuenta no puede entrar a la tienda' })
  if (!u) { const nombre = s(p.given_name || p.name) || 'Cliente'; u = { id: await newUser(nombre, s(p.family_name) || '-', mail, '!GOOGLE'), nombre, correo: mail } }
  res.json(startSession(req, res, { id: u.id, name: u.nombre, email: u.correo })) }))
api.post('/auth/recover', (_q, res) => res.status(501).json({ error: 'Recuperación de contraseña pendiente (requiere servicio de correo)' }))

const PAGO = { tarjeta: 'TARJETA', transferencia: 'TRANSFERENCIA', tienda: 'EFECTIVO' }
const ESTADO = { PENDIENTE: 'Pendiente de confirmación', CONFIRMADO: 'Confirmado', PREPARANDO: 'En preparación', ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado' }
const DEMO = 'PEDIDO DE DEMOSTRACIÓN'
const out = (p, ds) => { const demo = String(p.observaciones || '').startsWith(DEMO)
  return { id: `PED-${p.id_pedido}`, isDemo: demo, createdAt: p.fecha_pedido, total: Number(p.total), paymentStatus: 'pendiente_de_integracion',
    status: demo && p.estado === 'PENDIENTE' ? 'Pedido de demostración creado; pago pendiente de integración' : ESTADO[p.estado],
    items: ds.map(d => ({ name: d.nombre, quantity: Number(d.cantidad), subtotal: Number(d.subtotal) })) } }
api.post('/orders', h(async (req, res) => {
  if (!req.s.user) return res.status(401).json({ error: 'Entra con el usuario de prueba para crear un pedido de demostración' })
  const { customer = {}, address = {}, delivery, paymentMethod, lines } = req.body; const bad = []
  if (s(customer.name).length < 3) bad.push('name'); if (!/^\S+@\S+\.\S+$/.test(s(customer.email))) bad.push('email')
  for (const k of ['calle', 'numeroExterior', 'colonia', 'codigoPostal', 'ciudad', 'estado']) if (!s(address[k])) bad.push(k)
  if (!PAGO[paymentMethod]) bad.push('paymentMethod'); if (!['domicilio', 'sucursal'].includes(delivery)) bad.push('delivery')
  if (!Array.isArray(lines) || !lines.length || lines.length > 50) bad.push('lines')
  if (bad.length) return res.status(400).json({ error: 'Datos inválidos', fields: bad })
  const want = new Map(lines.map(l => [String(l.productId), Number(l.quantity)]))
  if ([...want.values()].some(q => !Number.isInteger(q) || q < 1)) return res.status(400).json({ error: 'Cantidades inválidas' })
  const t = priceCart(lines, await load(lines.map(l => l.productId))) // precios y existencias SIEMPRE desde la base
  if (t.items.length !== want.size || t.items.some(i => i.quantity !== want.get(i.productId))) return res.status(409).json({ error: 'Algún producto no existe o no tiene existencias suficientes' })
  const obs = `${DEMO}. Pago pendiente de integración. Entrega: ${delivery}. Contacto: ${s(customer.name)} <${s(customer.email)}>`.slice(0, 500); const c = await pool.getConnection()
  try { await c.beginTransaction()
    const [r] = await c.query(`INSERT INTO pedidos (id_usuario, subtotal, costo_envio, total, estado, metodo_pago, observaciones, domicilio_calle, domicilio_numero_exterior, domicilio_numero_interior, domicilio_colonia, domicilio_codigo_postal, domicilio_ciudad, domicilio_estado, domicilio_referencias)
      VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.s.user.id, t.subtotal, t.shipping, t.total, PAGO[paymentMethod], obs, s(address.calle), s(address.numeroExterior), s(address.numeroInterior) || null, s(address.colonia), s(address.codigoPostal), s(address.ciudad), s(address.estado), s(address.referencias) || null])
    for (const i of t.items) await c.query('INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)', [r.insertId, Number(i.productId), i.quantity, i.unitPrice, i.subtotal])
    await c.commit()
    res.status(201).json(out({ id_pedido: r.insertId, fecha_pedido: new Date(), total: t.total, estado: 'PENDIENTE', observaciones: obs }, t.items.map(i => ({ nombre: i.name, cantidad: i.quantity, subtotal: i.subtotal }))))
  } catch (e) { await c.rollback(); throw e } finally { c.release() } }))
api.get('/orders', h(async (req, res) => { if (!req.s.user) return res.json([])
  const [ps] = await pool.query('SELECT id_pedido, fecha_pedido, total, estado, observaciones FROM pedidos WHERE id_usuario = ? ORDER BY fecha_pedido DESC, id_pedido DESC', [req.s.user.id]); const ids = ps.map(p => p.id_pedido)
  const [ds] = ids.length ? await pool.query('SELECT d.id_pedido, d.cantidad, d.subtotal, p.nombre FROM detalle_pedido d JOIN productos p ON p.id_producto = d.id_producto WHERE d.id_pedido IN (?)', [ids]) : [[]]
  res.json(ps.map(p => out(p, ds.filter(d => d.id_pedido === p.id_pedido)))) }))
// Pagos: sin proveedor definido. El servidor creará la sesión y confirmará por webhook; el navegador nunca marca "pagado".
api.post('/payments/session', (_q, res) => res.status(501).json({ error: 'Pasarela de pago pendiente de integración' }))
app.use('/api', api); app.use('/api', (_q, r) => r.status(404).json({ error: 'Ruta no encontrada' }))
app.use(express.static('public')); app.get('*', (_q, r) => r.sendFile('index.html', { root: 'public' }))
app.listen(process.env.PORT || 3000, () => console.log(`Ferremax en http://localhost:${process.env.PORT || 3000}`))
