import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { money, roundMoney } from "../lib/money.js";

export const customersRouter = Router();
customersRouter.use(requireAuth);

customersRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {};
  const rows = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    take: 80,
  });
  res.json(
    rows.map((c) => ({
      ...c,
      creditBalance: money(c.creditBalance),
    }))
  );
});

customersRouter.post("/", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      phone: z.string().min(9),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid customer" });
  try {
    const row = await prisma.customer.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone.trim(),
        notes: parsed.data.notes,
      },
    });
    res.status(201).json({ ...row, creditBalance: money(row.creditBalance) });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Phone already registered" });
    }
    throw e;
  }
});

customersRouter.post("/:id/settle", requireRole("OWNER", "CASHIER"), async (req, res) => {
  const parsed = z
    .object({
      amount: z.number().positive(),
      note: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Amount required" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: req.params.id } });
      if (!customer) throw new Error("NOT_FOUND");
      const next = roundMoney(money(customer.creditBalance) - parsed.data.amount);
      if (next < -0.001) throw new Error("OVERPAY");
      await tx.creditLedger.create({
        data: {
          customerId: customer.id,
          type: "SETTLEMENT",
          amount: parsed.data.amount,
          note: parsed.data.note || "Credit settlement",
        },
      });
      return tx.customer.update({
        where: { id: customer.id },
        data: { creditBalance: next },
      });
    });
    res.json({ ...result, creditBalance: money(result.creditBalance) });
  } catch (e) {
    if (e.message === "NOT_FOUND") return res.status(404).json({ error: "Customer not found" });
    if (e.message === "OVERPAY") {
      return res.status(400).json({ error: "Settlement exceeds outstanding credit" });
    }
    throw e;
  }
});
