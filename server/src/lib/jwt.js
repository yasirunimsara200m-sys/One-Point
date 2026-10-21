import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    SECRET,
    { expiresIn: "12h" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
