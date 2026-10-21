import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { customersRouter } from "./routes/customers.js";
import { salesRouter } from "./routes/sales.js";
import { reportsRouter } from "./routes/reports.js";
import { drawerRouter } from "./routes/drawer.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST", "PATCH", "DELETE"] },
});
app.set("io", io);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "onepoint-api", status: "running" });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "onepoint-api" });
  } catch {
    res.status(503).json({ ok: false, error: "Database unavailable" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/customers", customersRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/drawer", drawerRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

io.on("connection", (socket) => {
  socket.on("join:owner", () => socket.join("owners"));
});

const port = Number(process.env.PORT || 4000);
if (!process.env.VERCEL) {
  server.listen(port, () => {
    console.log(`One Point API on http://localhost:${port}`);
  });
}

export default app;
