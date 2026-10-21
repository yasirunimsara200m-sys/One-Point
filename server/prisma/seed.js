import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerHash = await bcrypt.hash("KaveeOnepoint2026", 10);
  const cashierHash = await bcrypt.hash("Cashier@2026", 10);

  await prisma.user.upsert({
    where: { email: "owner@onepoint.lk" },
    update: { passwordHash: ownerHash },
    create: {
      name: "Shop Owner",
      email: "owner@onepoint.lk",
      passwordHash: ownerHash,
      role: "OWNER",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@onepoint.lk" },
    update: { passwordHash: cashierHash },
    create: {
      name: "Counter Cashier",
      email: "cashier@onepoint.lk",
      passwordHash: cashierHash,
      role: "CASHIER",
    },
  });

  const cats = [
    { name: "Books", kind: "PRODUCT", sortOrder: 1 },
    { name: "Stationery", kind: "PRODUCT", sortOrder: 2 },
    { name: "School items", kind: "PRODUCT", sortOrder: 3 },
    { name: "Photocopy & print", kind: "SERVICE", sortOrder: 4 },
    { name: "Lamination & binding", kind: "SERVICE", sortOrder: 5 },
    { name: "Reloads", kind: "SERVICE", sortOrder: 6 },
  ];

  const categoryMap = {};
  for (const c of cats) {
    const row = await prisma.category.upsert({
      where: { name: c.name },
      update: { kind: c.kind, sortOrder: c.sortOrder },
      create: c,
    });
    categoryMap[c.name] = row.id;
  }

  const products = [
    {
      sku: "BK-SINH-001",
      barcode: "9789551234001",
      name: "Grade 10 Sinhala workbook",
      category: "Books",
      costPrice: 280,
      sellPrice: 420,
      stockQty: 24,
      lowStockThreshold: 5,
      trackStock: true,
    },
    {
      sku: "BK-ENG-002",
      barcode: "9789551234002",
      name: "O/L English past papers",
      category: "Books",
      costPrice: 350,
      sellPrice: 520,
      stockQty: 18,
      lowStockThreshold: 4,
      trackStock: true,
    },
    {
      sku: "BK-MATH-003",
      barcode: "9789551234003",
      name: "A/L Combined Maths MCQ",
      category: "Books",
      costPrice: 680,
      sellPrice: 980,
      stockQty: 8,
      lowStockThreshold: 3,
      trackStock: true,
    },
    {
      sku: "ST-PEN-BLUE",
      barcode: "8901030890123",
      name: "Ballpoint pen (blue)",
      category: "Stationery",
      costPrice: 18,
      sellPrice: 40,
      stockQty: 120,
      lowStockThreshold: 20,
      trackStock: true,
    },
    {
      sku: "ST-EX-80",
      barcode: "8901030890456",
      name: "80-page single ruled book",
      category: "Stationery",
      costPrice: 55,
      sellPrice: 90,
      stockQty: 60,
      lowStockThreshold: 15,
      trackStock: true,
    },
    {
      sku: "ST-GLUE-20",
      barcode: "8901030890789",
      name: "Glue stick 20g",
      category: "Stationery",
      costPrice: 85,
      sellPrice: 140,
      stockQty: 4,
      lowStockThreshold: 6,
      trackStock: true,
    },
    {
      sku: "SC-BOX-L",
      barcode: "8901030890999",
      name: "Geometry box",
      category: "School items",
      costPrice: 220,
      sellPrice: 350,
      stockQty: 14,
      lowStockThreshold: 4,
      trackStock: true,
    },
    {
      sku: "SVC-XEROX-BW",
      barcode: null,
      name: "Photocopy B/W (A4 page)",
      category: "Photocopy & print",
      costPrice: 2,
      sellPrice: 8,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-XEROX-CLR",
      barcode: null,
      name: "Photocopy colour (A4)",
      category: "Photocopy & print",
      costPrice: 12,
      sellPrice: 40,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-PRINT-BW",
      barcode: null,
      name: "Printout B/W (A4)",
      category: "Photocopy & print",
      costPrice: 4,
      sellPrice: 15,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-LAM-A4",
      barcode: null,
      name: "Lamination A4",
      category: "Lamination & binding",
      costPrice: 35,
      sellPrice: 80,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-BIND-SPIRAL",
      barcode: null,
      name: "Spiral binding",
      category: "Lamination & binding",
      costPrice: 60,
      sellPrice: 150,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-RELOAD-100",
      barcode: null,
      name: "Mobile reload Rs. 100",
      category: "Reloads",
      costPrice: 97,
      sellPrice: 100,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-RELOAD-200",
      barcode: null,
      name: "Mobile reload Rs. 200",
      category: "Reloads",
      costPrice: 194,
      sellPrice: 200,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
    {
      sku: "SVC-RELOAD-500",
      barcode: null,
      name: "Mobile reload Rs. 500",
      category: "Reloads",
      costPrice: 485,
      sellPrice: 500,
      stockQty: 0,
      lowStockThreshold: 0,
      trackStock: false,
      quickButton: true,
    },
  ];

  for (const p of products) {
    const { category, ...data } = p;
    await prisma.product.upsert({
      where: { sku: data.sku },
      update: {
        name: data.name,
        sellPrice: data.sellPrice,
        costPrice: data.costPrice,
        trackStock: data.trackStock,
        quickButton: Boolean(data.quickButton),
      },
      create: {
        ...data,
        quickButton: Boolean(data.quickButton),
        categoryId: categoryMap[category],
      },
    });
  }

  await prisma.customer.upsert({
    where: { phone: "0771234567" },
    update: {},
    create: {
      name: "Nimal Perera",
      phone: "0771234567",
      creditBalance: 0,
      notes: "Regular tuition parent",
    },
  });

  console.log("Seed complete.");
  console.log("Owner:    owner@onepoint.lk / KaveeOnepoint2026");
  console.log("Cashier:  cashier@onepoint.lk / Cashier@2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
