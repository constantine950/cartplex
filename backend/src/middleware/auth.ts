import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export interface JWTPayload {
  userId: string;
  role: "BUYER" | "VENDOR" | "ADMIN";
  vendorId?: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function requireAuth(context: { userId?: string }): string {
  if (!context.userId) throw new Error("UNAUTHENTICATED");
  return context.userId;
}

export function requireVendor(context: {
  userId?: string;
  vendorId?: string;
  role?: string;
}): string {
  if (!context.userId) throw new Error("UNAUTHENTICATED");
  if (context.role !== "VENDOR" && context.role !== "ADMIN")
    throw new Error("FORBIDDEN");
  return context.vendorId!;
}

export function requireAdmin(context: {
  userId?: string;
  role?: string;
}): void {
  if (!context.userId) throw new Error("UNAUTHENTICATED");
  if (context.role !== "ADMIN") throw new Error("FORBIDDEN");
}
