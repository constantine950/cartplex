/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@cartplex.dev" },
    update: {},
    create: {
      email: "admin@cartplex.dev",
      passwordHash: adminPassword,
      name: "CartPlex Admin",
      role: "ADMIN",
    },
  });

  // Vendor 1 — TechGear
  const vendor1Password = await bcrypt.hash("vendor123", 10);
  const vendor1User = await prisma.user.upsert({
    where: { email: "techgear@cartplex.dev" },
    update: {},
    create: {
      email: "techgear@cartplex.dev",
      passwordHash: vendor1Password,
      name: "TechGear Store",
      role: "VENDOR",
    },
  });

  const vendor1 = await prisma.vendor.upsert({
    where: { slug: "techgear" },
    update: {},
    create: {
      userId: vendor1User.id,
      name: "TechGear",
      slug: "techgear",
      description: "Premium tech accessories and gadgets.",
      status: "APPROVED",
    },
  });

  // Vendor 2 — StyleHouse
  const vendor2Password = await bcrypt.hash("vendor123", 10);
  const vendor2User = await prisma.user.upsert({
    where: { email: "stylehouse@cartplex.dev" },
    update: {},
    create: {
      email: "stylehouse@cartplex.dev",
      passwordHash: vendor2Password,
      name: "StyleHouse",
      role: "VENDOR",
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { slug: "stylehouse" },
    update: {},
    create: {
      userId: vendor2User.id,
      name: "StyleHouse",
      slug: "stylehouse",
      description: "Trendy fashion for every occasion.",
      status: "APPROVED",
    },
  });

  // Vendor 3 — HomeNest
  const vendor3Password = await bcrypt.hash("vendor123", 10);
  const vendor3User = await prisma.user.upsert({
    where: { email: "homenest@cartplex.dev" },
    update: {},
    create: {
      email: "homenest@cartplex.dev",
      passwordHash: vendor3Password,
      name: "HomeNest",
      role: "VENDOR",
    },
  });

  const vendor3 = await prisma.vendor.upsert({
    where: { slug: "homenest" },
    update: {},
    create: {
      userId: vendor3User.id,
      name: "HomeNest",
      slug: "homenest",
      description: "Beautiful homewares and decor.",
      status: "APPROVED",
    },
  });

  // Buyer
  const buyerPassword = await bcrypt.hash("buyer123", 10);
  await prisma.user.upsert({
    where: { email: "buyer@cartplex.dev" },
    update: {},
    create: {
      email: "buyer@cartplex.dev",
      passwordHash: buyerPassword,
      name: "Test Buyer",
      role: "BUYER",
    },
  });

  // TechGear Products (8)
  const techProducts = [
    {
      name: "Wireless Noise-Cancelling Headphones",
      category: "Audio",
      price: "149.99",
      tags: ["wireless", "audio", "noise-cancelling"],
    },
    {
      name: "Mechanical Keyboard TKL",
      category: "Peripherals",
      price: "89.99",
      tags: ["keyboard", "mechanical", "gaming"],
    },
    {
      name: "USB-C Hub 7-in-1",
      category: "Accessories",
      price: "49.99",
      tags: ["usb-c", "hub", "connectivity"],
    },
    {
      name: "Portable SSD 1TB",
      category: "Storage",
      price: "109.99",
      tags: ["ssd", "storage", "portable"],
    },
    {
      name: "4K Webcam Pro",
      category: "Cameras",
      price: "129.99",
      tags: ["webcam", "4k", "streaming"],
    },
    {
      name: "Ergonomic Mouse Vertical",
      category: "Peripherals",
      price: "59.99",
      tags: ["mouse", "ergonomic", "wireless"],
    },
    {
      name: "LED Desk Lamp Smart",
      category: "Accessories",
      price: "39.99",
      tags: ["lamp", "smart", "led"],
    },
    {
      name: "Phone Stand Adjustable",
      category: "Accessories",
      price: "19.99",
      tags: ["phone", "stand", "desk"],
    },
  ];

  for (const p of techProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        vendorId: vendor1.id,
        name: p.name,
        slug,
        category: p.category,
        tags: p.tags,
        basePrice: p.price,
        images: [`https://picsum.photos/seed/${slug}/400/400`],
        isActive: true,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: `${slug}-default` },
      update: {},
      create: {
        productId: product.id,
        sku: `${slug}-default`,
        options: { type: "standard" },
        priceModifier: "0",
        inventoryCount: Math.floor(Math.random() * 50) + 10,
      },
    });
  }

  // StyleHouse Products (6)
  const styleProducts = [
    {
      name: "Classic Denim Jacket",
      category: "Outerwear",
      price: "79.99",
      tags: ["denim", "jacket", "casual"],
    },
    {
      name: "Slim Fit Chinos",
      category: "Bottoms",
      price: "49.99",
      tags: ["chinos", "slim", "formal"],
    },
    {
      name: "Linen Summer Dress",
      category: "Dresses",
      price: "64.99",
      tags: ["linen", "summer", "casual"],
    },
    {
      name: "Leather Crossbody Bag",
      category: "Bags",
      price: "89.99",
      tags: ["leather", "bag", "crossbody"],
    },
    {
      name: "Knit Wool Sweater",
      category: "Tops",
      price: "69.99",
      tags: ["wool", "knit", "winter"],
    },
    {
      name: "Canvas Sneakers Low",
      category: "Footwear",
      price: "54.99",
      tags: ["sneakers", "canvas", "casual"],
    },
  ];

  for (const p of styleProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        vendorId: vendor2.id,
        name: p.name,
        slug,
        category: p.category,
        tags: p.tags,
        basePrice: p.price,
        images: [`https://picsum.photos/seed/${slug}/400/400`],
        isActive: true,
      },
    });

    // Size variants for clothing
    for (const size of ["S", "M", "L", "XL"]) {
      await prisma.productVariant.upsert({
        where: { sku: `${slug}-${size.toLowerCase()}` },
        update: {},
        create: {
          productId: product.id,
          sku: `${slug}-${size.toLowerCase()}`,
          options: { size },
          priceModifier: "0",
          inventoryCount: Math.floor(Math.random() * 20) + 5,
        },
      });
    }
  }

  // HomeNest Products (6)
  const homeProducts = [
    {
      name: "Scented Soy Candle Set",
      category: "Decor",
      price: "34.99",
      tags: ["candle", "scented", "gift"],
    },
    {
      name: "Bamboo Serving Board",
      category: "Kitchen",
      price: "29.99",
      tags: ["bamboo", "kitchen", "eco"],
    },
    {
      name: "Linen Throw Pillow",
      category: "Bedroom",
      price: "24.99",
      tags: ["pillow", "linen", "bedroom"],
    },
    {
      name: "Ceramic Pour-Over Set",
      category: "Kitchen",
      price: "44.99",
      tags: ["ceramic", "coffee", "pour-over"],
    },
    {
      name: "Macrame Wall Hanging",
      category: "Decor",
      price: "39.99",
      tags: ["macrame", "wall", "boho"],
    },
    {
      name: "Woven Storage Basket",
      category: "Organization",
      price: "27.99",
      tags: ["basket", "storage", "woven"],
    },
  ];

  for (const p of homeProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        vendorId: vendor3.id,
        name: p.name,
        slug,
        category: p.category,
        tags: p.tags,
        basePrice: p.price,
        images: [`https://picsum.photos/seed/${slug}/400/400`],
        isActive: true,
      },
    });

    await prisma.productVariant.upsert({
      where: { sku: `${slug}-default` },
      update: {},
      create: {
        productId: product.id,
        sku: `${slug}-default`,
        options: { type: "standard" },
        priceModifier: "0",
        inventoryCount: Math.floor(Math.random() * 30) + 10,
      },
    });
  }

  //  Coupons
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: "10",
      minOrderValue: "20",
      usageLimit: 100,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "FREESHIP" },
    update: {},
    create: {
      code: "FREESHIP",
      type: "FREE_SHIPPING",
      value: "0",
      minOrderValue: "50",
      isActive: true,
    },
  });

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.coupon.count(),
  ]);

  console.log(`✅ Seed complete:`);
  console.log(`   Users: ${counts[0]}`);
  console.log(`   Vendors: ${counts[1]}`);
  console.log(`   Products: ${counts[2]}`);
  console.log(`   Variants: ${counts[3]}`);
  console.log(`   Coupons: ${counts[4]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
