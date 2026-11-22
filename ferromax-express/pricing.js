export const SHIPPING_FLAT = 129;
export const FREE_SHIPPING_FROM = 999;

export const clampQty = (q, stock) =>
    Math.max(0, Math.min(Math.floor(Number.isFinite(q) ? q : 0), stock));

export function priceCart(lines, products, { delivery = 'domicilio' } = {}) {
    const byId = new Map(products.map(product => [String(product.id), product]));

    const items = (lines || []).flatMap(line => {
        const product = byId.get(String(line.productId));
        if (!product) return [];

        const quantity = clampQty(Number(line.quantity), product.stock);
        if (quantity <= 0) return [];

        return [{
            productId: String(product.id),
            name: product.name,
            unitPrice: product.price,
            quantity,
            subtotal: product.price * quantity
        }];
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const shipping =
        delivery === 'sucursal' || subtotal === 0 || subtotal >= FREE_SHIPPING_FROM
            ? 0
            : SHIPPING_FLAT;

    return { items, subtotal, shipping, total: subtotal + shipping };
}