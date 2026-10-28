import test from 'node:test'; import assert from 'node:assert'
import { priceCart, clampQty } from './pricing.js'
const P = (id, price, stock) => ({ id, name: id, price, stock })
test('clamp', () => { assert.equal(clampQty(9, 3), 3); assert.equal(clampQty(-1, 3), 0); assert.equal(clampQty(NaN, 3), 0) })
test('totales y envío', () => { const t = priceCart([{ productId: 'a', quantity: 2 }], [P('a', 100, 5)]); assert.deepEqual([t.subtotal, t.shipping, t.total], [200, 129, 329]) })
test('envío gratis y sin stock', () => { assert.equal(priceCart([{ productId: 'a', quantity: 1 }], [P('a', 1000, 1)]).shipping, 0); assert.equal(priceCart([{ productId: 'a', quantity: 1 }], [P('a', 5, 0)]).items.length, 0) })
test('ids numéricos y de texto coinciden', () => { assert.equal(priceCart([{ productId: '7', quantity: 1 }], [P(7, 50, 2)]).items.length, 1) })
