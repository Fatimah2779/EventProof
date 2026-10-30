import { describe, expect, it } from "vitest";
import { readiness } from "./readiness";

describe("readiness", () => {
  it("weights progress by importance weight, counting only verified", () => {
    expect(
      readiness([
        { status: "verified", weight: 3, mandatory: true },
        { status: "manual_review", weight: 1, mandatory: false },
      ]),
    ).toBe(75);
  });

  it("does not count rejected or manual review as completed", () => {
    expect(
      readiness([
        { status: "rejected", weight: 1, mandatory: false },
        { status: "manual_review", weight: 1, mandatory: false },
      ]),
    ).toBe(0);
  });

  it("cannot reach 100% while a mandatory requirement is unverified", () => {
    expect(
      readiness([
        { status: "verified", weight: 1000, mandatory: true },
        { status: "pending", weight: 1, mandatory: true },
      ]),
    ).toBe(99);
  });

  it("reaches 100% when all criteria are verified", () => {
    expect(readiness([{ status: "verified", weight: 2, mandatory: true }])).toBe(100);
  });
});
