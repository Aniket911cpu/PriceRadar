import { describe, expect, it } from "vitest";
import { messageSchema } from "../src/shared/schemas";

describe("message protocol", () => {
  it("accepts a ping", () => {
    expect(messageSchema.parse({ type: "PING" })).toEqual({ type: "PING" });
  });

  it("rejects malformed tracking messages", () => {
    expect(() => messageSchema.parse({ type: "TRACK_ITEM", item: {} })).toThrow();
  });
});
