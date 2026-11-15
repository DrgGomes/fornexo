/** Converte links comuns (Google Drive, Dropbox) em links diretos de imagem. */
export function normalizeImageUrl(raw: string): string | null {
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  if (/dropbox\.com/.test(url)) return url.replace(/[?&]dl=0/, "").replace(/\?$/, "") + (url.includes("?") && !/[?&]dl=0/.test(url) ? "&raw=1" : "?raw=1");
  return url;
}

export function parseImageList(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[\s,;]+/)) {
    const n = normalizeImageUrl(part);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}
