import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { money, roundMoney } from "../lib/money.js";
import { colomboDayBounds } from "../lib/datetime.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("OWNER"));

reportsRouter.get("/today", async (_req, res) => {
  const { start, end, day } = colomboDayBounds();
  res.json(await buildReport(start, end, day));
});

reportsRouter.get("/range", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : colomboDayBounds().start;
  const to = req.query.to ? new Date(String(req.query.to)) : colomboDayBounds().end;
  res.json(await buildReport(from, to));
});

async function buildReport(start, end, day) {
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end }, status: "COMPLETED" },
    include: { items: true },
  });

  let revenue = 0;
  let cost = 0;
  let cash = 0;
  let card = 0;
  let credit = 0;
  const itemMap = new Map();

  for (const s of sales) {
    revenue = roundMoney(revenue + money(s.total));
    cash = roundMoney(cash + money(s.cashAmount));
    card = roundMoney(card + money(s.cardAmount));
    credit = roundMoney(credit + money(s.creditAmount));
    for (const i of s.items) {
      cost = roundMoney(cost + money(i.costPrice) * money(i.qty));
      const prev = itemMap.get(i.productId) || {
        productId: i.productId,
        name: i.name,
        qty: 0,
        revenue: 0,
      };
      prev.qty = roundMoney(prev.qty + money(i.qty));
      prev.revenue = roundMoney(prev.revenue + money(i.lineTotal));
      itemMap.set(i.productId, prev);
    }
  }

  const topItems = [...itemMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return {
    day,
    from: start,
    to: end,
    saleCount: sales.length,
    revenue,
    cost,
    profit: roundMoney(revenue - cost),
    payments: { cash, card, credit },
    topItems,
  };
}
