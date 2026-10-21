import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { money, roundMoney } from "../lib/money.js";
import { colomboDayBounds } from "../lib/datetime.js";

export const salesRouter = Router();
salesRouter.use(requireAuth);

const itemSchema = z.object({
  productId: z.string(),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
  lineDiscount: z.number().nonnegative().optional(),
});

const saleSchema = z.object({
  items: z.array(itemSchema).min(1),
  discount: z.number().nonnegative().optional().default(0),
  customerId: z.string().optional().nullable(),
  cashAmount: z.number().nonnegative().optional().default(0),
  cardAmount: z.number().nonnegative().optional().default(0),
  creditAmount: z.number().nonnegative().optional().default(0),
  cashTendered: z.number().nonnegative().optional().default(0),
  note: z.string().optional(),
});

salesRouter.get("/", async (req, res) => {
  const { start, end } = colomboDayBounds();
  const from = req.query.from ? new Date(String(req.query.from)) : start;
  const to = req.query.to ? new Date(String(req.query.to)) : end;
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
    include: {
      items: true,
      cashier: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const hideCost = req.user.role !== "OWNER";
  res.json(
    sales.map((s) => ({
      ...serializeSale(s, hideCost),
    }))
  );
});

salesRouter.get("/:id", async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      cashier: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  res.json(serializeSale(sale, req.user.role !== "OWNER"));
});

salesRouter.post("/", async (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid sale", details: parsed.error.flatten() });
  }
  const input = parsed.data;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
      });
      const byId = Object.fromEntries(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const lines = [];
      for (const item of input.items) {
        const product = byId[item.productId];
        if (!product) throw new Error("UNKNOWN_PRODUCT");
        if (product.trackStock && money(product.stockQty) < item.qty) {
          throw Object.assign(new Error("NO_STOCK"), { sku: product.sku, name: product.name });
        }
        const unit = item.unitPrice != null ? item.unitPrice : money(product.sellPrice);
        const lineDiscount = item.lineDiscount || 0;
        const lineTotal = roundMoney(unit * item.qty - lineDiscount);
        if (lineTotal < 0) throw new Error("BAD_LINE");
        subtotal = roundMoney(subtotal + lineTotal);
        lines.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          qty: item.qty,
          unitPrice: unit,
          costPrice: money(product.costPrice),
          lineDiscount,
          lineTotal,
        });
      }

      const discount = input.discount || 0;
      const total = roundMoney(subtotal - discount);
      if (total < 0) throw new Error("BAD_TOTAL");

      const cashAmount = roundMoney(input.cashAmount || 0);
      const cardAmount = roundMoney(input.cardAmount || 0);
      const creditAmount = roundMoney(input.creditAmount || 0);
      const paid = roundMoney(cashAmount + cardAmount + creditAmount);
      if (Math.abs(paid - total) > 0.05) throw new Error("PAY_MISMATCH");
      if (creditAmount > 0 && !input.customerId) throw new Error("CUSTOMER_REQUIRED");

      let method = "CASH";
      const used = [cashAmount > 0, cardAmount > 0, creditAmount > 0].filter(Boolean).length;
      if (used > 1) method = "SPLIT";
      else if (cardAmount > 0) method = "CARD";
      else if (creditAmount > 0) method = "CREDIT";

      const cashTendered = roundMoney(input.cashTendered || cashAmount);
      const changeGiven = roundMoney(Math.max(0, cashTendered - cashAmount));

      const { start, end, day } = colomboDayBounds();
      const todayCount = await tx.sale.count({
        where: { createdAt: { gte: start, lte: end } },
      });
      const invoiceNo = `OP-${day.replaceAll("-", "")}-${String(todayCount + 1).padStart(4, "0")}`;

      const created = await tx.sale.create({
        data: {
          invoiceNo,
          cashierId: req.user.id,
          customerId: input.customerId || null,
          subtotal,
          discount,
          total,
          paymentMethod: method,
          cashAmount,
          cardAmount,
          creditAmount,
          cashTendered,
          changeGiven,
          note: input.note,
          items: { create: lines },
        },
        include: {
          items: true,
          cashier: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      });

      for (const item of input.items) {
        const product = byId[item.productId];
        if (product.trackStock) {
          await tx.product.update({
            where: { id: product.id },
            data: { stockQty: { decrement: item.qty } },
          });
        }
      }

      if (creditAmount > 0) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { creditBalance: { increment: creditAmount } },
        });
        await tx.creditLedger.create({
          data: {
            customerId: input.customerId,
            saleId: created.id,
            type: "CREDIT_SALE",
            amount: creditAmount,
            note: created.invoiceNo,
          },
        });
      }

      return created;
    });

    req.app.get("io")?.emit("sale:created", {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      total: money(sale.total),
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
    });

    res.status(201).json(serializeSale(sale, req.user.role !== "OWNER"));
  } catch (e) {
    if (e.message === "UNKNOWN_PRODUCT") {
      return res.status(400).json({ error: "Unknown or inactive product in cart" });
    }
    if (e.message === "NO_STOCK") {
      return res.status(409).json({ error: `Not enough stock for ${e.name} (${e.sku})` });
    }
    if (e.message === "PAY_MISMATCH") {
      return res.status(400).json({ error: "Payment amounts must equal bill total" });
    }
    if (e.message === "CUSTOMER_REQUIRED") {
      return res.status(400).json({ error: "Select a customer for credit sales" });
    }
    if (e.message === "BAD_LINE" || e.message === "BAD_TOTAL") {
      return res.status(400).json({ error: "Discount cannot exceed line or bill total" });
    }
    throw e;
  }
});

function serializeSale(sale, hideCost) {
  return {
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    cashier: sale.cashier,
    customer: sale.customer,
    subtotal: money(sale.subtotal),
    discount: money(sale.discount),
    total: money(sale.total),
    paymentMethod: sale.paymentMethod,
    cashAmount: money(sale.cashAmount),
    cardAmount: money(sale.cardAmount),
    creditAmount: money(sale.creditAmount),
    cashTendered: money(sale.cashTendered),
    changeGiven: money(sale.changeGiven),
    status: sale.status,
    note: sale.note,
    createdAt: sale.createdAt,
    items: sale.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      qty: money(i.qty),
      unitPrice: money(i.unitPrice),
      lineDiscount: money(i.lineDiscount),
      lineTotal: money(i.lineTotal),
      ...(hideCost ? {} : { costPrice: money(i.costPrice) }),
    })),
  };
}
