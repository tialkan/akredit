// Kimliksiz katılım belirteci. Davetli ankette belirteç HMAC(kurum gizli anahtarı, anket + e-posta) ile
// üretilir: hatırlatmada aynı bağlantı yeniden kurulabilir, eşleme hiçbir yerde saklanmaz. Veritabanında
// yalnız belirtecin SHA-256 özeti ve "kullanıldı" bayrağı durur; yanıt satırı belirtece bağlanmaz.
// Açık bağlantılı ankette belirteç tarayıcıda rastgele üretilir (tekrar yanıt engeli).

import { createHash, createHmac } from "node:crypto";

const BICIM = /^[A-Za-z0-9_-]{22,64}$/u;

export function belirtecGecerliMi(b: unknown): b is string {
  return typeof b === "string" && BICIM.test(b);
}

export function davetBelirteci(gizli: string, anketId: string, eposta: string): string {
  if (gizli.length < 16) throw new RangeError("Anket gizli anahtarı en az 16 karakter olmalı.");
  return createHmac("sha256", gizli).update(`${anketId}\n${eposta.trim().toLowerCase()}`).digest("base64url");
}

/** Rastgele baytlardan (en az 16) belirteç; rastgelelik parametre olarak verilir. */
export function rastgeleBelirtec(rastgele: Uint8Array): string {
  if (rastgele.length < 16) throw new RangeError("En az 16 bayt rastgelelik gerekli.");
  return Buffer.from(rastgele).toString("base64url");
}

export function belirtecOzeti(belirtec: string): string {
  return createHash("sha256").update(belirtec).digest("hex");
}
