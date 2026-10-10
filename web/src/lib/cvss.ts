// CVSS v3.0/3.1 base-vector parsing and scoring, mirrored from cvss/cvss.go so
// the UI can preview the score before the server persists it.

export type CvssMetrics = {
  AV: string;
  AC: string;
  PR: string;
  UI: string;
  S: string;
  C: string;
  I: string;
  A: string;
};

const ALLOWED: Record<string, string[]> = {
  AV: ["N", "A", "L", "P"],
  AC: ["L", "H"],
  PR: ["N", "L", "H"],
  UI: ["N", "R"],
  S: ["U", "C"],
  C: ["H", "L", "N"],
  I: ["H", "L", "N"],
  A: ["H", "L", "N"],
};

export const CVSS_METRIC_KEYS = Object.keys(ALLOWED) as (keyof CvssMetrics)[];

const AV_W: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC_W: Record<string, number> = { L: 0.77, H: 0.44 };
const PR_W: Record<string, [number, number]> = { N: [0.85, 0.85], L: [0.62, 0.68], H: [0.27, 0.5] };
const UI_W: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA_W: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };

function roundup(x: number): number {
  const i = Math.round(x * 100000);
  if (i % 10000 === 0) return i / 100000;
  return (Math.trunc(i / 10000) + 1) / 10;
}

/** Parses a CVSS vector string; returns null when invalid or incomplete. */
export function parseCvssVector(input: string): CvssMetrics | null {
  const parts = input.trim().split("/");
  if (parts.length < 2) return null;
  if (parts[0] !== "CVSS:3.0" && parts[0] !== "CVSS:3.1") return null;
  const seen: Partial<CvssMetrics> = {};
  for (const part of parts.slice(1)) {
    if (!part) continue;
    const [key, val] = part.split(":");
    if (!key || !ALLOWED[key]) continue; // temporal/environmental ignored
    if (!ALLOWED[key].includes(val)) return null;
    (seen as Record<string, string>)[key] = val;
  }
  for (const key of CVSS_METRIC_KEYS) {
    if (!seen[key]) return null;
  }
  return seen as CvssMetrics;
}

export function cvssBaseScore(m: CvssMetrics): number {
  const scopeIdx = m.S === "C" ? 1 : 0;
  const exploitability = 8.22 * AV_W[m.AV] * AC_W[m.AC] * PR_W[m.PR][scopeIdx] * UI_W[m.UI];
  const iss = 1 - (1 - CIA_W[m.C]) * (1 - CIA_W[m.I]) * (1 - CIA_W[m.A]);
  const impact = m.S === "U" ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
  if (impact <= 0) return 0;
  const base = m.S === "U" ? impact + exploitability : 1.08 * (impact + exploitability);
  return roundup(Math.min(base, 10));
}

export function cvssSeverity(score: number): "none" | "low" | "medium" | "high" | "critical" {
  if (score <= 0) return "none";
  if (score < 4) return "low";
  if (score < 7) return "medium";
  if (score < 9) return "high";
  return "critical";
}

export function formatCvssVector(m: CvssMetrics): string {
  return `CVSS:3.1/AV:${m.AV}/AC:${m.AC}/PR:${m.PR}/UI:${m.UI}/S:${m.S}/C:${m.C}/I:${m.I}/A:${m.A}`;
}

/** Score + severity for a vector string, or null when it doesn't parse. */
export function cvssPreview(input: string): { score: number; severity: string; vector: string } | null {
  const m = parseCvssVector(input);
  if (!m) return null;
  const score = cvssBaseScore(m);
  return { score, severity: cvssSeverity(score), vector: formatCvssVector(m) };
}
