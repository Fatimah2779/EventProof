export type Status = "pending" | "verified" | "rejected" | "manual_review";

export interface CriterionLike {
  status: string;
  weight: number;
  mandatory: boolean;
  importance?: string;
}

/**
 * Weighted readiness. Only verified criteria count as completed.
 * If any mandatory criterion is not verified, the result is capped at 99.
 */
export function readiness(criteria: CriterionLike[]): number {
  const total = criteria.reduce((s, c) => s + Math.max(0, Number(c.weight) || 0), 0);
  if (total === 0) return 0;
  const done = criteria
    .filter((c) => c.status === "verified")
    .reduce((s, c) => s + Math.max(0, Number(c.weight) || 0), 0);
  let pct = Math.round((done / total) * 100);
  const mandatoryOpen = criteria.some((c) => c.mandatory && c.status !== "verified");
  if (mandatoryOpen && pct >= 100) pct = 99;
  return pct;
}

export function countByStatus(criteria: CriterionLike[]) {
  const out = { pending: 0, verified: 0, rejected: 0, manual_review: 0 };
  for (const c of criteria) {
    if (c.status in out) out[c.status as Status]++;
    else out.pending++;
  }
  return out;
}
