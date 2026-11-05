// Tarayıcı derlemesinde "node:crypto" yerine geçen küçük modül (next.config.ts, turbopack.resolveAlias).
// @akredit/cekirdek ölçme sonucunun girdi özetini createHash("sha256") ile alır (ozet.ts). Tarayıcıda Node'un
// crypto modülünün genel öykünmesi ~145 KB'tır; burada yalnız eşzamanlı SHA-256 (FIPS 180-4) vardır.
// Başka algoritma ya da işlev istenirse sessizce geçmez, hata verir. Doğruluğu crypto-tarayici.test.ts sınar.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
  0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
  0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-256 özeti; çıktı küçük harfli onaltılık. */
export function sha256Hex(veri: Uint8Array): string {
  const bitUzunluk = veri.length * 8;
  const dolu = new Uint8Array((((veri.length + 9 + 63) >> 6) << 6) >>> 0);
  dolu.set(veri);
  dolu[veri.length] = 0x80;
  const g = new DataView(dolu.buffer);
  g.setUint32(dolu.length - 8, Math.floor(bitUzunluk / 2 ** 32));
  g.setUint32(dolu.length - 4, bitUzunluk >>> 0);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  for (let i = 0; i < dolu.length; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = g.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const a = w[t - 15] ?? 0;
      const b = w[t - 2] ?? 0;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[t] = ((w[t - 16] ?? 0) + s0 + (w[t - 7] ?? 0) + s1) >>> 0;
    }
    let [a, b, c, d, e, f, gg, hh] = [
      h[0] ?? 0,
      h[1] ?? 0,
      h[2] ?? 0,
      h[3] ?? 0,
      h[4] ?? 0,
      h[5] ?? 0,
      h[6] ?? 0,
      h[7] ?? 0,
    ];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & gg);
      const t1 = (hh + S1 + ch + (K[t] ?? 0) + (w[t] ?? 0)) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = gg;
      gg = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    const yeni = [a, b, c, d, e, f, gg, hh];
    for (let j = 0; j < 8; j++) h[j] = ((h[j] ?? 0) + (yeni[j] ?? 0)) >>> 0;
  }
  return [...h].map((x) => x.toString(16).padStart(8, "0")).join("");
}

class Sha256 {
  private parcalar: Uint8Array[] = [];
  update(veri: string | Uint8Array): this {
    this.parcalar.push(typeof veri === "string" ? new TextEncoder().encode(veri) : veri);
    return this;
  }
  digest(kodlama: string): string {
    if (kodlama !== "hex") throw new Error("Tarayıcıda yalnız onaltılık özet desteklenir.");
    const toplam = new Uint8Array(this.parcalar.reduce((t, p) => t + p.length, 0));
    let k = 0;
    for (const p of this.parcalar) {
      toplam.set(p, k);
      k += p.length;
    }
    return sha256Hex(toplam);
  }
}

export function createHash(algoritma: string): Sha256 {
  if (algoritma !== "sha256") throw new Error("Tarayıcıda yalnız SHA-256 desteklenir.");
  return new Sha256();
}

// Açık MCP'nin kaynak doğrulama imzası (kaynak-dogrula.ts) bu işlevleri içe aktarır; tarayıcı araçları imza
// üretmez ve doğrulamaz. Paket derlensin diye adları vardır; çağrılırsa sessizce geçmez, hata verir.
function yalnizSunucu(ad: string): never {
  throw new Error(`${ad} tarayıcıda kullanılamaz (yalnız sunucu).`);
}
export function createHmac(): never {
  return yalnizSunucu("createHmac");
}
export function randomBytes(): never {
  return yalnizSunucu("randomBytes");
}
export function timingSafeEqual(): never {
  return yalnizSunucu("timingSafeEqual");
}
