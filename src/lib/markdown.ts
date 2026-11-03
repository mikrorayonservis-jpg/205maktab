/**
 * Təhlükəsiz, minimal Markdown renderer (xarici asılılıq olmadan).
 * Bütün mətn ƏVVƏLCƏ HTML-escape edilir, sonra yalnız ağ siyahıdakı formatlar HTML-ə çevrilir.
 * Dəstəklənir: ## və ### başlıqlar, paraqraflar, - / 1. siyahılar, > sitat, ---, **qalın**, *kursiv*,
 * `kod`, [mətn](https://...), ![alt](/media/...) — yalnız yerli /media/ şəkilləri.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return url;
  if (/^mailto:[^\s"'<>]+$/i.test(url)) return url;
  if (/^\/(?!\/)[^\s"'<>]*$/.test(url)) return url;
  return null;
}

function inline(text: string): string {
  // text artıq escape edilib
  let out = text;
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/!\[([^\]]*)\]\((\/media\/[A-Za-z0-9/_\-.]+)\)/g, (_m, alt: string, src: string) =>
    `<img src="${src}" alt="${alt}" loading="lazy" decoding="async">`
  );
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const decoded = href.replace(/&amp;/g, "&");
    const safe = safeHref(decoded);
    if (!safe) return label;
    const external = /^https?:/i.test(safe);
    return `<a href="${escapeHtml(safe)}"${external ? ' target="_blank" rel="noopener noreferrer nofollow"' : ""}>${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return "";
  const lines = escapeHtml(source.replace(/\r\n?/g, "\n")).split("\n");
  const html: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^(#{2,3})\s+(.+)$/.exec(line))) {
      flushAll();
      const level = m[1].length;
      html.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^-{3,}$/.test(line.trim())) {
      flushAll();
      html.push("<hr>");
    } else if ((m = /^\s*[-*]\s+(.+)$/.exec(line))) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = /^\s*\d+[.)]\s+(.+)$/.exec(line))) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = /^&gt;\s?(.*)$/.exec(line))) {
      flushPara();
      flushList();
      quote.push(m[1]);
    } else {
      flushList();
      flushQuote();
      para.push(line.trim());
    }
  }
  flushAll();
  return html.join("\n");
}

/** Önizləmə üçün düz mətn (meta description və s.) */
export function plainText(source: string | null | undefined, max = 200): string {
  if (!source) return "";
  const t = source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*`_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
