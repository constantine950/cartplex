/// <reference types="node" />
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin ─────────────────────────────────────────────────
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

  // ── Vendor 1 — TechGear ───────────────────────────────────
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

  // ── Vendor 2 — StyleHouse ─────────────────────────────────
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

  // ── Vendor 3 — HomeNest ───────────────────────────────────
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

  // ── Buyer ─────────────────────────────────────────────────
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

  // ── TechGear Products ─────────────────────────────────────
  const techProducts = [
    {
      name: "Wireless Noise-Cancelling Headphones",
      category: "Audio",
      price: "149.99",
      tags: ["wireless", "audio", "noise-cancelling"],
      description:
        "Premium wireless headphones with industry-leading noise cancellation. Up to 30 hours battery life.",
      images: [
        "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80",
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&q=80",
      ],
    },
    {
      name: "Mechanical Keyboard TKL",
      category: "Peripherals",
      price: "89.99",
      tags: ["keyboard", "mechanical", "gaming"],
      description:
        "Tenkeyless mechanical keyboard with tactile switches. RGB backlit with customizable layouts.",
      images: [
        "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600&q=80",
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
      ],
    },
    {
      name: "USB-C Hub 7-in-1",
      category: "Accessories",
      price: "49.99",
      tags: ["usb-c", "hub", "connectivity"],
      description:
        "All-in-one USB-C hub with HDMI, USB 3.0, SD card reader, and 100W PD charging.",
      images: [
        "https://images.unsplash.com/photo-1640955014216-75201056c829?w=600&q=80",
      ],
    },
    {
      name: "Portable SSD 1TB",
      category: "Storage",
      price: "109.99",
      tags: ["ssd", "storage", "portable"],
      description:
        "Ultra-fast portable SSD with 1050MB/s read speeds. Drop-resistant and compact.",
      images: [
        "https://images.unsplash.com/photo-1618410320928-25228d811631?w=600&q=80",
      ],
    },
    {
      name: "4K Webcam Pro",
      category: "Cameras",
      price: "129.99",
      tags: ["webcam", "4k", "streaming"],
      description:
        "4K Ultra HD webcam with auto-focus and built-in noise-cancelling microphone. Perfect for streaming.",
      images: [
        "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
      ],
    },
    {
      name: "Ergonomic Mouse Vertical",
      category: "Peripherals",
      price: "59.99",
      tags: ["mouse", "ergonomic", "wireless"],
      description:
        "Vertical ergonomic mouse that reduces wrist strain. 2.4GHz wireless with 90-day battery life.",
      images: [
        "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&q=80",
      ],
    },
    {
      name: "LED Desk Lamp Smart",
      category: "Accessories",
      price: "39.99",
      tags: ["lamp", "smart", "led"],
      description:
        "Smart LED desk lamp with touch control, USB charging port, and adjustable color temperature.",
      images: [
        "https://images.unsplash.com/photo-1534073737927-85f1ebff1f5d?w=600&q=80",
      ],
    },
    {
      name: "Phone Stand Adjustable",
      category: "Accessories",
      price: "19.99",
      tags: ["phone", "stand", "desk"],
      description:
        "Adjustable aluminum phone stand. Compatible with all smartphones and small tablets.",
      images: [
        "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&q=80",
      ],
    },
  ];

  for (const p of techProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: { images: p.images, description: p.description },
      create: {
        vendorId: vendor1.id,
        name: p.name,
        slug,
        description: p.description,
        category: p.category,
        tags: p.tags,
        basePrice: p.price,
        images: p.images,
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

  // ── StyleHouse Products ───────────────────────────────────
  const styleProducts = [
    {
      name: "Classic Denim Jacket",
      category: "Outerwear",
      price: "79.99",
      tags: ["denim", "jacket", "casual"],
      description:
        "Timeless denim jacket with a relaxed fit. Made from 100% cotton denim.",
      images: [
        "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&q=80",
      ],
    },
    {
      name: "Slim Fit Chinos",
      category: "Bottoms",
      price: "49.99",
      tags: ["chinos", "slim", "formal"],
      description:
        "Versatile slim-fit chinos perfect for office or casual wear. Wrinkle-resistant fabric.",
      images: [
        "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80",
      ],
    },
    {
      name: "Linen Summer Dress",
      category: "Dresses",
      price: "64.99",
      tags: ["linen", "summer", "casual"],
      description:
        "Lightweight linen dress perfect for warm days. Breathable and elegant.",
      images: [
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80",
      ],
    },
    {
      name: "Leather Crossbody Bag",
      category: "Bags",
      price: "89.99",
      tags: ["leather", "bag", "crossbody"],
      description:
        "Genuine leather crossbody bag with adjustable strap and multiple compartments.",
      images: [
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80",
      ],
    },
    {
      name: "Knit Wool Sweater",
      category: "Tops",
      price: "69.99",
      tags: ["wool", "knit", "winter"],
      description:
        "Cozy merino wool sweater with ribbed cuffs and hem. Perfect for cold days.",
      images: [
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80",
      ],
    },
    {
      name: "Canvas Sneakers Low",
      category: "Footwear",
      price: "54.99",
      tags: ["sneakers", "canvas", "casual"],
      description:
        "Classic low-top canvas sneakers. Vulcanized rubber sole for durability.",
      images: [
        "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&q=80",
      ],
    },
  ];

  for (const p of styleProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: { images: p.images, description: p.description },
      create: {
        vendorId: vendor2.id,
        name: p.name,
        slug,
        description: p.description,
        category: p.category,
        tags: p.tags,
        basePrice: p.price,
        images: p.images,
        isActive: true,
      },
    });

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

  // ── HomeNest Products ─────────────────────────────────────
  const homeProducts = [
    {
      name: "Scented Soy Candle Set",
      category: "Decor",
      price: "34.99",
      tags: ["candle", "scented", "gift"],
      description:
        "Set of 3 hand-poured soy candles in calming scents. Burns cleanly for 40+ hours each.",
      images: [
        "https://images.unsplash.com/photo-1602607144937-1f96d8c51c7a?w=600&q=80",
      ],
    },
    {
      name: "Bamboo Serving Board",
      category: "Kitchen",
      price: "29.99",
      tags: ["bamboo", "kitchen", "eco"],
      description:
        "Eco-friendly bamboo serving board with juice groove. Perfect for charcuterie and entertaining.",
      images: [
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80",
      ],
    },
    {
      name: "Linen Throw Pillow",
      category: "Bedroom",
      price: "24.99",
      tags: ["pillow", "linen", "bedroom"],
      description:
        "Soft linen throw pillow with hidden zipper. Available in natural tones.",
      images: [
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?w=600&q=80",
      ],
    },
    {
      name: "Ceramic Pour-Over Set",
      category: "Kitchen",
      price: "44.99",
      tags: ["ceramic", "coffee", "pour-over"],
      description:
        "Handcrafted ceramic pour-over coffee set. Includes dripper, carafe, and two mugs.",
      images: [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80",
      ],
    },
    {
      name: "Macrame Wall Hanging",
      category: "Decor",
      price: "39.99",
      tags: ["macrame", "wall", "boho"],
      description:
        "Handwoven macrame wall hanging in natural cotton rope. Boho-chic home accent.",
      images: [
        "https://images.unsplash.com/photo-1617704548623-340376564e68?w=600&q=80",
      ],
    },
    {
      name: "Woven Storage Basket",
      category: "Organization",
      price: "27.99",
      tags: ["basket", "storage", "woven"],
      description:
        "Handwoven seagrass storage basket with handles. Perfect for blankets, toys, or laundry.",
      images: [
        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80",
      ],
    },
  ];

  for (const p of homeProducts) {
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const product = await prisma.product.upsert({
      where: { slug },
      update: { images: p.images, description: p.description },
      create: {
        vendorId: vendor3.id,
        name: p.name,
        slug,
        description: p.description,
        category: p.category,
        tags: p.tags,
        basePrice: p.price,
        images: p.images,
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

  // ── Coupons ───────────────────────────────────────────────
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

  console.log("✅ Seed complete:");
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
