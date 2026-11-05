"use client";
/**
 * Excel (.xlsx) faylının ilk iş vərəqini brauzerdə CSV mətninə çevirir — əlavə kitabxana olmadan.
 * .xlsx ZIP arxividir: mərkəzi kataloq oxunur, lazım olan XML-lər DecompressionStream("deflate-raw") ilə açılır.
 * Nəticə serverə adi CSV kimi göndərilir və orada eyni yoxlamalardan keçir (brauzer heç nəyi "təsdiqləmir").
 */

type Entry = { name: string; method: number; compSize: number; localOffset: number };

function readEntries(buf: Uint8Array): Map<string, Entry> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Fayl Excel (.xlsx) formatında deyil.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, Entry>();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("Excel faylı zədələnib.");
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    out.set(name, { name, method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function readText(buf: Uint8Array, e: Entry): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = e.localOffset + 30 + dv.getUint16(e.localOffset + 26, true) + dv.getUint16(e.localOffset + 28, true);
  const data = buf.slice(start, start + e.compSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error("Excel faylının sıxılma üsulu dəstəklənmir.");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const byTag = (n: Document | Element, tag: string) => Array.from(n.getElementsByTagNameNS("*", tag));

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function csvCell(v: string): string {
  return /[",;\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function xlsxToCsv(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const entries = readEntries(buf);
  const get = async (name: string) => {
    const e = entries.get(name);
    return e ? readText(buf, e) : null;
  };

  // İlk vərəq: workbook.xml-dəki birinci <sheet> → rels-dəki hədəf fayl
  let sheetPath = "xl/worksheets/sheet1.xml";
  const wb = await get("xl/workbook.xml");
  const rels = await get("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const first = byTag(xml(wb), "sheet")[0];
    const rid = first?.getAttribute("r:id") ?? first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rel = byTag(xml(rels), "Relationship").find((r) => r.getAttribute("Id") === rid);
    const target = rel?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = await get(sheetPath);
  if (!sheet) throw new Error("Excel faylında iş vərəqi tapılmadı.");

  const sstXml = await get("xl/sharedStrings.xml");
  const shared = sstXml
    ? byTag(xml(sstXml), "si").map((si) => byTag(si, "t").filter((t) => t.parentElement?.localName !== "rPh").map((t) => t.textContent ?? "").join(""))
    : [];

  const rows: string[][] = [];
  for (const row of byTag(xml(sheet), "row")) {
    const cells: string[] = [];
    for (const c of byTag(row, "c")) {
      const ref = c.getAttribute("r");
      const idx = ref ? colIndex(ref) : cells.length;
      const t = c.getAttribute("t");
      const v = byTag(c, "v")[0]?.textContent ?? "";
      let value = v;
      if (t === "s") value = shared[Number(v)] ?? "";
      else if (t === "inlineStr") value = byTag(c, "t").map((x) => x.textContent ?? "").join("");
      else if (t === "b") value = v === "1" ? "TRUE" : "FALSE";
      while (cells.length < idx) cells.push("");
      cells[idx] = value.trim();
    }
    if (cells.some((x) => x !== "")) rows.push(cells);
  }
  if (rows.length > 5001) throw new Error("Faylda 5000-dən çox sətir var.");
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
