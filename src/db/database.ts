import Dexie, { type Table } from "dexie";
import type { AlertEvent, AlertRule, Item, PricePoint } from "../shared/types";

export class PriceRadarDatabase extends Dexie {
  items!: Table<Item, string>;
  pricePoints!: Table<PricePoint, string>;
  alertRules!: Table<AlertRule, string>;
  alertEvents!: Table<AlertEvent, string>;

  constructor() {
    super("PriceRadar");
    this.version(1).stores({
      items: "id, productKey, domain, nextCheckAt, status",
      pricePoints: "id, [itemId+ts], itemId, ts",
      alertRules: "id, itemId, enabled",
      alertEvents: "id, itemId, ts, read",
    });
  }
}

export const db = new PriceRadarDatabase();
