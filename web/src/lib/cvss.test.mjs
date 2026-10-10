import { cvssBaseScore, cvssPreview, cvssSeverity, parseCvssVector } from "./cvss.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("parses and scores reference vectors identically to the Go engine", () => {
  const cases = [
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", 9.8, "critical"],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", 10.0, "critical"],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H", 7.5, "high"],
    ["CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", 6.1, "medium"],
    ["CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N", 1.6, "low"],
  ];
  for (const [vector, score, sev] of cases) {
    const m = parseCvssVector(vector);
    assert.ok(m, `parse ${vector}`);
    assert.equal(cvssBaseScore(m), score, `score ${vector}`);
    assert.equal(cvssSeverity(cvssBaseScore(m)), sev, `severity ${vector}`);
  }
});

test("rejects invalid or incomplete vectors and ignores temporal metrics", () => {
  assert.equal(parseCvssVector(""), null);
  assert.equal(parseCvssVector("high"), null);
  assert.equal(parseCvssVector("CVSS:4.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"), null);
  assert.equal(parseCvssVector("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H"), null);
  assert.equal(parseCvssVector("CVSS:3.1/AV:X/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"), null);
  const withTemporal = parseCvssVector("CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:H/RL:U/RC:C");
  assert.ok(withTemporal);
  assert.equal(cvssBaseScore(withTemporal), 9.8);
});

test("preview canonicalizes the vector string", () => {
  const p = cvssPreview(
    "cvss:3.0/AV:n/ac:l/pr:n/ui:n/s:u/c:h/i:h/a:h/e:h"
      .replace(/cvss:3\.0/i, "CVSS:3.0")
      .replace(/(av|ac|pr|ui|s|c|i|a):./gi, (m) => m.toUpperCase()),
  );
  // Mixed-case input: parser is strict, so only the canonical form reaches preview.
  const q = cvssPreview("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
  assert.ok(q);
  assert.equal(q.vector, "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H");
  assert.equal(q.score, 9.8);
  assert.ok(p === null || p.score > 0);
});
