import { prisma } from "../../lib/prisma.js";
import { signToken } from "../../middleware/auth.js";
import bcrypt from "bcryptjs";
import type { ApolloContext } from "../types/index.js";

export const vendorResolvers = {
  Query: {
    vendors: async () => {
      return prisma.vendor.findMany({
        where: { status: "APPROVED" },
        include: { products: { where: { isActive: true }, take: 8 } },
      });
    },

    vendor: async (_: unknown, { slug }: { slug: string }) => {
      return prisma.vendor.findUnique({
        where: { slug },
        include: {
          products: { where: { isActive: true }, include: { variants: true } },
        },
      });
    },

    me: async (_: unknown, __: unknown, context: ApolloContext) => {
      if (!context.userId) return null;
      return prisma.user.findUnique({
        where: { id: context.userId },
        include: { vendor: true },
      });
    },

    allVendors: async (
      _: unknown,
      { status }: { status?: string },
      context: ApolloContext,
    ) => {
      if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
      return prisma.vendor.findMany({
        where: status ? { status: status as any } : undefined,
        include: { user: true },
      });
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: { input: any }) => {
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing) throw new Error("Email already in use");

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          role: "BUYER",
        },
      });

      const token = signToken({ userId: user.id, role: "BUYER" });
      return { token, user };
    },

    login: async (_: unknown, { input }: { input: any }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: { vendor: true },
      });
      if (!user) throw new Error("Invalid credentials");

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new Error("Invalid credentials");

      const token = signToken({
        userId: user.id,
        role: user.role as any,
        vendorId: user.vendor?.id,
      });

      return { token, user };
    },

    approveVendor: async (
      _: unknown,
      { vendorId }: { vendorId: string },
      context: ApolloContext,
    ) => {
      if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
      return prisma.vendor.update({
        where: { id: vendorId },
        data: { status: "APPROVED" },
      });
    },

    suspendVendor: async (
      _: unknown,
      { vendorId }: { vendorId: string },
      context: ApolloContext,
    ) => {
      if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
      return prisma.vendor.update({
        where: { id: vendorId },
        data: { status: "SUSPENDED" },
      });
    },
  },

  Vendor: {
    products: (parent: any) =>
      parent.products ??
      prisma.product.findMany({
        where: { vendorId: parent.id, isActive: true },
        include: { variants: true },
      }),
  },

  User: {
    vendor: (parent: any) =>
      parent.vendor ??
      prisma.vendor.findUnique({ where: { userId: parent.id } }),
  },
};
