import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (_req, res) => {
  const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(rows);
});

categoriesRouter.post("/", requireRole("OWNER"), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      kind: z.enum(["PRODUCT", "SERVICE"]),
      sortOrder: z.number().int().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category" });
  const row = await prisma.category.create({ data: parsed.data });
  res.status(201).json(row);
});
