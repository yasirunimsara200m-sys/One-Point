import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole("OWNER"));

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  res.json(users);
});

usersRouter.post("/", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["OWNER", "CASHIER"]),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid user payload" });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: parsed.data.role,
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.status(201).json(user);
});

usersRouter.patch("/:id", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      active: z.boolean().optional(),
      password: z.string().min(6).optional(),
      role: z.enum(["OWNER", "CASHIER"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update" });
  }
  const data = { ...parsed.data };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.json(user);
});
