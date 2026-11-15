const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function newId(size = 20): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < size; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
