import { verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Sign in required" });
    }
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      return res.status(401).json({ error: "Account disabled" });
    }
    req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not allowed for this role" });
    }
    next();
  };
}
