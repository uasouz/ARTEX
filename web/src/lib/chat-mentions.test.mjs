import { activeMention, mentionSearch, mentionToken, selectedMentions } from "./chat-mentions.ts";
import assert from "node:assert/strict";
import test from "node:test";

test("mention trigger supports Chinese and cursor placement without hijacking email", () => {
  assert.equal(activeMention("user@example.com", 16), null);
  assert.equal(activeMention("已选 @[漏洞#1 X]", 12), null);
  assert.deepEqual(activeMention("查看@漏洞 后面的文字", 5), { start: 2, end: 5, query: "漏洞" });
  assert.equal(activeMention("@漏洞\n下一行", 8), null);
});

test("categories, Chinese aliases, IP and keyword search", () => {
  assert.equal(mentionSearch("", "zh").categories.length, 9);
  assert.equal(mentionSearch("漏", "zh").categories[0].kind, "finding");
  assert.equal(mentionSearch("漏洞", "zh").kind, "finding");
  assert.equal(mentionSearch("漏洞SQL注入", "zh").query, "SQL注入");
  assert.equal(mentionSearch("ip 192.0.2.1", "zh").kind, "ip");
  assert.equal(mentionSearch("接口 GET /api", "zh").kind, "endpoint");
  assert.equal(mentionSearch("acme.com", "zh").kind, "");
});

test("locale labels drive search in English and Portuguese", () => {
  assert.equal(mentionSearch("", "en").categories.length, 9);
  assert.equal(mentionSearch("find", "en").categories[0].kind, "finding");
  assert.equal(mentionSearch("finding SQL", "en").query, "SQL");
  assert.equal(mentionSearch("domain acme", "en").kind, "root_domain");
  // Portuguese label with accent matches with or without the accent typed.
  assert.equal(mentionSearch("domínio acme", "pt").kind, "root_domain");
  assert.equal(mentionSearch("dominio acme", "pt").kind, "root_domain");
  assert.equal(mentionSearch("dominio acme", "pt").query, "acme");
  assert.equal(mentionSearch("domin", "pt").categories[0].kind, "root_domain");
  assert.equal(mentionSearch("empresa ACME", "pt").kind, "company");
  // Legacy Chinese labels still resolve the kind in non-Chinese locales.
  assert.equal(mentionSearch("漏洞注入", "en").kind, "finding");
});

test("tokens roundtrip labels and removing one reference preserves its neighbors", () => {
  const first = mentionToken({ kind: "finding", id: 12, label: "标题[1]\n描述" }, "zh");
  const second = mentionToken({ kind: "ip", id: 13, label: "192.0.2.1" }, "zh");
  const value = `分析 ${first} 和 ${second}`;
  const selected = selectedMentions(value);
  assert.equal(selected.length, 2);
  assert.equal(selected[0].label, "漏洞 #12 · 标题（1） 描述");
  const next = value.slice(0, selected[0].start) + value.slice(selected[0].start + selected[0].token.length);
  assert.equal(selectedMentions(next)[0].token, second);
});

test("localized tokens parse everywhere and legacy tokens keep parsing", () => {
  const en = mentionToken({ kind: "finding", id: 7, label: "SQLi" }, "en");
  const pt = mentionToken({ kind: "company", id: 8, label: "ACME" }, "pt");
  const legacy = mentionToken({ kind: "subdomain", id: 9, label: "a.b.com" }, "zh");
  const selected = selectedMentions(`see ${en} ${pt} ${legacy}`);
  assert.equal(selected.length, 3);
  assert.equal(selected[0].label, "finding #7 · SQLi");
  assert.equal(selected[1].label, "empresa #8 · ACME");
  assert.equal(selected[2].label, "子域名 #9 · a.b.com");
});
