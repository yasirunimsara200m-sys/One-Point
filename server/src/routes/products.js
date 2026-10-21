import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { toPublicProduct } from "../lib/money.js";

export const productsRouter = Router();
productsRouter.use(requireAuth);

productsRouter.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const categoryId = String(req.query.categoryId || "");
  const quick = req.query.quick === "1";
  const where = { active: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (quick) where.quickButton = true;

  const includeInactive = req.query.all === "1" && req.user.role === "OWNER";
  if (includeInactive) delete where.active;

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ quickButton: "desc" }, { name: "asc" }],
  });
  res.json(products.map((p) => toPublicProduct(p, req.user.role)));
});

productsRouter.get("/barcode/:code", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: {
      active: true,
      OR: [{ barcode: req.params.code }, { sku: req.params.code }],
    },
    include: { category: true },
  });
  if (!product) return res.status(404).json({ error: "Item not found" });
  res.json(toPublicProduct(product, req.user.role));
});

productsRouter.get("/low-stock", requireRole("OWNER"), async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true, trackStock: true },
    include: { category: true },
  });
  const low = products
    .filter((p) => Number(p.stockQty) <= Number(p.lowStockThreshold))
    .map((p) => toPublicProduct(p, "OWNER"));
  res.json(low);
});

const productSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1),
  categoryId: z.string().min(1),
  costPrice: z.number().nonnegative(),
  sellPrice: z.number().positive(),
  trackStock: z.boolean(),
  stockQty: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().nonnegative().optional(),
  quickButton: z.boolean().optional(),
  active: z.boolean().optional(),
});

productsRouter.post("/", requireRole("OWNER"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid product", details: parsed.error.flatten() });
  }
  const barcode = parsed.data.barcode ? parsed.data.barcode : null;
  try {
    const product = await prisma.product.create({
      data: { ...parsed.data, barcode },
      include: { category: true },
    });
    res.status(201).json(toPublicProduct(product, "OWNER"));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "SKU or barcode already exists" });
    }
    throw e;
  }
});

productsRouter.patch("/:id", requireRole("OWNER"), async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid product update" });
  }
  const data = { ...parsed.data };
  if (data.barcode === "") data.barcode = null;
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(toPublicProduct(product, "OWNER"));
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "SKU or barcode already exists" });
    }
    throw e;
  }
});
