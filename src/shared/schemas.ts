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
  lastErrorCode: z.string().max(500).optional(),
});

export const messageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PING") }),
  z.object({ type: z.literal("GET_CURRENT_ITEM"), url: z.string().url() }),
  z.object({ type: z.literal("GET_CURRENT_PAGE") }),
  z.object({ type: z.literal("SET_PAUSED"), paused: z.boolean() }),
  z.object({ type: z.literal("GET_PAUSED") }),
  z.object({ type: z.literal("GET_NOTIFICATIONS") }),
  z.object({ type: z.literal("MARK_NOTIFICATIONS_READ") }),
  z.object({ type: z.literal("UPDATE_ITEM"), itemId: z.string().min(1), title: z.string().min(1).max(500).optional(), status: z.enum(["active", "paused", "blocked", "achieved", "archived"]).optional() }),
  z.object({ type: z.literal("DELETE_ITEM"), itemId: z.string().min(1) }),
  z.object({ type: z.literal("GET_EXTRACTION") }),
  z.object({ type: z.literal("GET_PRICE_HISTORY"), url: z.string().url().optional(), itemId: z.string().optional() }),
  z.object({
    type: z.literal("CREATE_ALERT"),
    itemId: z.string().min(1),
    mode: z.enum(["target_price", "any_drop", "price_range", "all_time_low"]),
    target: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal("TRACK_ITEM"), item: itemSchema }),
  z.object({ type: z.literal("LIST_ITEMS") }),
  z.object({
    type: z.literal("CAPTURE_PRICE"),
    extraction: z.object({
      title: z.string().min(1).max(500),
      canonicalUrl: z.string().url(),
      domain: z.string().min(1),
      imageUrl: z.string().url().optional(),
      currentPrice: z.object({ minorUnits: z.number().int().nonnegative(), currency: z.string().length(3), raw: z.string() }),
      listPrice: z.object({ minorUnits: z.number().int().nonnegative(), currency: z.string().length(3), raw: z.string() }).optional(),
      currency: z.string().length(3),
      availability: availabilitySchema,
      productKey: z.string().min(1),
      method: z.enum(["jsonld", "microdata", "opengraph", "heuristic"]),
      confidence: z.number().min(0).max(1),
    }),
  }),
]);

export type Message = z.infer<typeof messageSchema>;
export type MessageResponse = { ok: true; data?: unknown } | { ok: false; error: string };
