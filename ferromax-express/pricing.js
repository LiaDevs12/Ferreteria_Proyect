export const SHIPPING_FLAT = 129, FREE_SHIPPING_FROM = 999
export const clampQty = (q, stock) => Math.max(0, Math.min(Math.floor(Number.isFinite(q) ? q : 0), stock))
export function priceCart(lines, products) {
  const by = new Map(products.map(p => [String(p.id), p]))
  const items = (lines || []).flatMap(l => { const p = by.get(String(l.productId)); const q = p ? clampQty(Number(l.quantity), p.stock) : 0; return p && q > 0 ? [{ productId: String(p.id), name: p.name, unitPrice: p.price, quantity: q, subtotal: p.price * q }] : [] })
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FLAT
  return { items, subtotal, shipping, total: subtotal + shipping }
}
