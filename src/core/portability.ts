import type { AlertEvent, AlertRule, Item, PricePoint } from "../shared/types";

export interface ExportBundle {
  version: 1;
  exportedAt: number;
  items: Item[];
  pricePoints: PricePoint[];
  alertRules: AlertRule[];
  alertEvents: AlertEvent[];
}

export function createExportBundle(data: Omit<ExportBundle, "version" | "exportedAt">): ExportBundle {
  return { version: 1, exportedAt: Date.now(), ...data };
}

export function parseExportBundle(input: unknown): ExportBundle {
  if (!input || typeof input !== "object") throw new Error("Export must be an object");
  const value = input as Partial<ExportBundle>;
  if (value.version !== 1 || !Array.isArray(value.items) || !Array.isArray(value.pricePoints) || !Array.isArray(value.alertRules) || !Array.isArray(value.alertEvents)) {
    throw new Error("Unsupported or malformed PriceRadar export");
  }
  return value as ExportBundle;
}
