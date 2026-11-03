import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, escapeHtml, plainText } from "../../src/lib/markdown.ts";

test("HTML teqləri escape edilir (XSS)", () => {
  const out = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
  assert.ok(!out.includes("<script"), out);
  assert.ok(!out.includes("<img src=x"), out);
  assert.ok(out.includes("&lt;script&gt;"));
});

test("javascript: keçidləri bloklanır", () => {
  const out = renderMarkdown("[klik](javascript:alert(1))");
  assert.ok(!out.includes("href"), out);
  assert.ok(out.includes("klik"));
});

test("data: və protokolsuz // keçidləri bloklanır", () => {
  assert.ok(!renderMarkdown("[a](data:text/html,xx)").includes("href"));
  assert.ok(!renderMarkdown("[a](//evil.com)").includes("href"));
});

test("atribut injection mümkün deyil", () => {
  const out = renderMarkdown('[a](https://x.az" onmouseover="alert(1))');
  assert.ok(!/onmouseover="/.test(out), out);
});

test("xarici keçidlər noopener ilə açılır", () => {
  const out = renderMarkdown("[Nazirlik](https://edu.gov.az)");
  assert.match(out, /href="https:\/\/edu\.gov\.az"/);
  assert.match(out, /rel="noopener noreferrer nofollow"/);
});

test("yalnız yerli /media/ şəkillərinə icazə var", () => {
  assert.match(renderMarkdown("![alt](/media/2026/11/abc.webp)"), /<img src="\/media\/2026\/11\/abc\.webp"/);
  assert.ok(!renderMarkdown("![alt](https://evil.com/x.png)").includes("<img"));
});

test("başlıq, siyahı və sitat", () => {
  const out = renderMarkdown("## Başlıq\n\n- bir\n- iki\n\n> sitat\n\n1. a\n2. b");
  assert.match(out, /<h2>Başlıq<\/h2>/);
  assert.match(out, /<ul><li>bir<\/li><li>iki<\/li><\/ul>/);
  assert.match(out, /<blockquote>/);
  assert.match(out, /<ol><li>a<\/li><li>b<\/li><\/ol>/);
});

test("qalın və kursiv", () => {
  assert.match(renderMarkdown("**qalın** və *kursiv*"), /<strong>qalın<\/strong> və <em>kursiv<\/em>/);
});

test("escapeHtml və plainText", () => {
  assert.equal(escapeHtml(`<"'&>`), "&lt;&quot;&#39;&amp;&gt;");
  assert.equal(plainText("## Salam **dünya** [keçid](https://a.az)"), "Salam dünya keçid");
  assert.ok(plainText("a".repeat(300), 50).length <= 50);
});
