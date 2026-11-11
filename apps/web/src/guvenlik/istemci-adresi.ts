// İstemci adresi (inceleme, kurucu kararı madde 6). Hız sınırları ve günlük için tek kaynak; sıra
// `apps/acik-mcp/src/http.ts` `istemciAdresi` ile aynıdır:
//   1. `cf-connecting-ip`: Cloudflare yazar. Köken yalnız Cloudflare'a açıksa güvenilir
//      (docs/tasarim/yayin-kilavuzu.md §10.1); köken doğrudan erişilebiliyorsa istemci bu başlığı yazabilir.
//   2. `x-real-ip`: güvenilir vekil (Coolify/nginx) yazar.
//   3. `x-forwarded-for`: sondan `guvenilenVekil`. öğe (vekiller gerçek adresi sona ekler). İlk öğe asla
//      kullanılmaz; onu istemci yazabilir ve hız sınırını boşa çıkarır.
// acik-mcp'deki işlev paketin dışa açık arayüzünde değil ve bulunamayınca "bilinmeyen" döner; burada `null`.

export function istemciAdresi(basliklar: Headers | undefined | null, guvenilenVekil = 1): string | null {
  if (!basliklar) return null;
  const cf = basliklar.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  const gercek = basliklar.get("x-real-ip")?.trim();
  if (gercek) return gercek.slice(0, 64);
  const liste = (basliklar.get("x-forwarded-for") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const n = Math.max(1, Math.floor(guvenilenVekil));
  // Yalnız bir öğe varsa ve n=1 ise o öğe vekilin eklediği son öğedir; daha kısa listede adres yoktur.
  const adres = liste.length >= n ? liste[liste.length - n] : undefined;
  return adres ? adres.slice(0, 64) : null;
}
