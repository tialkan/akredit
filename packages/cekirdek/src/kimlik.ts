// UUID v7 (RFC 9562): ilk 48 bit Unix milisaniyesi, sonra sürüm ve varyant bitleri, kalan rastgele.
// Zaman ve rastgelelik dışarıdan verilir; böylece işlev saf ve test edilebilir kalır.

/**
 * @param simdiMs Unix zamanı (milisaniye)
 * @param rastgele En az 10 baytlık rastgele dizi (ör. crypto.getRandomValues(new Uint8Array(10)))
 */
export function uuidv7(simdiMs: number, rastgele: Uint8Array): string {
  if (!Number.isInteger(simdiMs) || simdiMs < 0 || simdiMs > 0xffff_ffff_ffff) {
    throw new RangeError("Zaman 0 ile 2^48-1 arasında tam sayı (milisaniye) olmalı.");
  }
  if (rastgele.length < 10) throw new RangeError("En az 10 rastgele bayt gerekli.");
  const b = new Uint8Array(16);
  let t = simdiMs;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = 0x70 | ((rastgele[0] ?? 0) & 0x0f);
  b[7] = rastgele[1] ?? 0;
  b[8] = 0x80 | ((rastgele[2] ?? 0) & 0x3f);
  for (let i = 9; i < 16; i++) b[i] = rastgele[i - 6] ?? 0;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** UUID v7'den Unix milisaniyesini okur. */
export function uuidv7Zamani(uuid: string): number {
  const h = uuid.replace(/-/gu, "");
  if (!/^[0-9a-f]{32}$/iu.test(h) || h[12] !== "7") throw new TypeError("UUID v7 değil.");
  return Number.parseInt(h.slice(0, 12), 16);
}
