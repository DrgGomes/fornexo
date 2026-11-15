function tlv(id: string, value: string) {
  return id + value.length.toString().padStart(2, "0") + value;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function clean(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, max) || "NA";
}

export function normalizePixKey(key: string) {
  const k = key.trim();
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(k) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(k)) return k.replace(/\D/g, "");
  if (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(k)) return "+55" + k.replace(/\D/g, "");
  if (k.includes("@")) return k.toLowerCase();
  return k;
}

/** Gera o codigo PIX "copia e cola" (BR Code estatico) */
export function pixPayload(opts: { key: string; name: string; city: string; amountCents?: number; txid?: string }) {
  const mai = tlv("00", "br.gov.bcb.pix") + tlv("01", normalizePixKey(opts.key));
  const txid = (opts.txid || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";
  let p =
    tlv("00", "01") +
    tlv("26", mai) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (opts.amountCents && opts.amountCents > 0 ? tlv("54", (opts.amountCents / 100).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", clean(opts.name, 25)) +
    tlv("60", clean(opts.city, 15)) +
    tlv("62", tlv("05", txid)) +
    "6304";
  p += crc16(p);
  return p;
}
