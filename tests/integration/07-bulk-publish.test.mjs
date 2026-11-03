// Yoxlama növbəsinin toplu dərci: yalnız dərc səlahiyyəti olanlar, yalnız açıq razılıq təsdiqi ilə.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { login, q, closeDb } from "./helpers.mjs";

let author, editor, chief;
before(async () => {
  [author, editor, chief] = await Promise.all(["muellif", "redaktor", "bas.redaktor"].map((n) => login(`${n}@demo.local`)));
});
after(closeDb);

test("toplu dərc: razılıq təsdiqi olmadan rədd, redaktor üçün qadağan, baş redaktor üçün işləyir", async () => {
  const [cat] = await q("SELECT id FROM news_categories LIMIT 1").catch(() => [undefined]);
  const created = await author.post("/api/editorial", {
    title: "Toplu dərc testi", content: "Bu məqalə toplu dərc testi üçün yazılıb.", summary: "Qısa", categoryId: cat?.id ?? null, containsMinors: true, consentConfirmed: false,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id;
  assert.equal((await author.post(`/api/editorial/${id}/transition`, { action: "submit" })).status, 200);

  assert.equal((await chief.post("/api/editorial/bulk-publish", { consentConfirmed: false })).status, 422);
  assert.equal((await chief.post("/api/editorial/bulk-publish", {})).status, 422);
  assert.equal((await editor.post("/api/editorial/bulk-publish", { consentConfirmed: true })).status, 403);
  assert.equal((await author.post("/api/editorial/bulk-publish", { consentConfirmed: true })).status, 403);

  const r = await chief.post("/api/editorial/bulk-publish", { consentConfirmed: true });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.data.published >= 1);
  const [row] = await q("SELECT status, consent_confirmed FROM news WHERE id = ?", [id]);
  assert.equal(row.status, "published");
  assert.equal(Number(row.consent_confirmed), 1);
  const logs = await q("SELECT action FROM audit_logs WHERE entity_type = 'news' AND entity_id = ? AND action = 'news.bulk_publish'", [id]);
  assert.equal(logs.length, 1);
  const pub = await chief.get("/api/news?q=Toplu");
  assert.ok(pub.body.data.rows.some((n) => n.id === id), "dərc edilmiş məqalə ictimai siyahıda olmalıdır");
});
