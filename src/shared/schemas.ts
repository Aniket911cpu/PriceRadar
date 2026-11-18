import { z } from "zod";

export const availabilitySchema = z.enum(["in_stock", "out_of_stock", "preorder", "unknown"]);

export const itemSchema = z.object({
  id: z.string().min(1),
  productKey: z.string().min(1),
  url: z.string().url(),
  canonicalUrl: z.string().url(),
  domain: z.string().min(1),
  title: z.string().min(1).max(500),
  currency: z.string().length(3),
  currentPrice: z.number().int().nonnegative().nullable(),
  lowestPrice: z.number().int().nonnegative().nullable(),
  highestPrice: z.number().int().nonnegative().nullable(),
  availability: availabilitySchema,
  status: z.enum(["active", "paused", "blocked", "achieved", "archived"]),
  priority: z.enum(["high", "normal", "low"]),
  checkIntervalMinutes: z.number().int().positive(),
  tags: z.array(z.string().max(80)).max(50),
  createdAt: z.number().int().nonnegative(),
  lastCheckedAt: z.number().int().nonnegative().optional(),
  nextCheckAt: z.number().int().nonnegative().optional(),
  failureCount: z.number().int().nonnegative(),
});

export const messageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PING") }),
  z.object({ type: z.literal("GET_CURRENT_ITEM"), url: z.string().url() }),
  z.object({ type: z.literal("TRACK_ITEM"), item: itemSchema }),
  z.object({ type: z.literal("LIST_ITEMS") }),
]);

export type Message = z.infer<typeof messageSchema>;
export type MessageResponse = { ok: true; data?: unknown } | { ok: false; error: string };
