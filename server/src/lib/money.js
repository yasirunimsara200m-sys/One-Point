export function money(n) {
  return Number(n || 0);
}

export function roundMoney(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function hideCost(product) {
  if (!product) return product;
  const { costPrice, ...rest } = product;
  return rest;
}

export function toPublicProduct(product, role) {
  const base = {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    categoryId: product.categoryId,
    category: product.category,
    sellPrice: money(product.sellPrice),
    trackStock: product.trackStock,
    stockQty: money(product.stockQty),
    lowStockThreshold: money(product.lowStockThreshold),
    quickButton: product.quickButton,
    active: product.active,
    lowStock:
      product.trackStock &&
      money(product.stockQty) <= money(product.lowStockThreshold),
  };
  if (role === "OWNER") {
    base.costPrice = money(product.costPrice);
  }
  return base;
}
