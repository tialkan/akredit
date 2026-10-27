// Çalışma klasörünü platforma taşımak için aktarım paketi (İP-24).
// Paket kayıpsızdır: kanıt dosyalarının baytları, bütün tablolar (kimlikleriyle), günlük ve rapor dosyaları.
// Adım günlüğü bir özet zinciriyle mühürlenir; zincir her satırı bir öncekine bağlar,
// tek bir kayıt değişir, silinir ya da araya girerse doğrulama başarısız olur.
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

export const PAKET_BICIMI = "akredit-aktarim/1";
const TABLOLAR = ["kanitlar", "adimlar", "ciktilar", "oneriler", "yazma_planlari", "bologna_aktarimlari"];
const DOSYA_KLASORLERI = ["gunluk", "raporlar"];
const SIFIR = "0".repeat(64);

const sha = (x) => createHash("sha256").update(x).digest("hex");

/** Anahtarları sıralı JSON: aynı veri her zaman aynı metni verir. */
export function kararliJson(v) {
  if (Array.isArray(v)) return `[${v.map(kararliJson).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${kararliJson(v[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

/** Adım günlüğünün özet zinciri. Her halka: sha256(önceki halka + satırın kararlı JSON'u). */
export function gunlukZinciri(adimlar) {
  let onceki = SIFIR;
  return adimlar.map((a) => (onceki = sha(onceki + kararliJson(a))));
}

function dosyalar(kok, alt) {
  const sonuc = [];
  const gez = (k) => {
    if (!existsSync(k)) return;
    for (const ad of readdirSync(k).sort()) {
      const y = join(k, ad);
      if (statSync(y).isDirectory()) gez(y);
      else sonuc.push(relative(kok, y).split(sep).join("/"));
    }
  };
  gez(join(kok, alt));
  return sonuc;
}

const duz = (satir) => Object.fromEntries(Object.entries(satir).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v]));

/** Klasörden paket üretir. `vt` açık bir yerel veritabanıdır. */
export function paketOlustur(klasor, vt, zaman) {
  const tablolar = {};
  for (const t of TABLOLAR) tablolar[t] = vt.prepare(`SELECT * FROM ${t} ORDER BY id`).all().map(duz);
  const kanitDosyalari = tablolar.kanitlar.map((k) => {
    const icerik = readFileSync(join(klasor, k.yol));
    return { yol: k.yol, ozet: sha(icerik), icerik: icerik.toString("base64") };
  });
  const ekDosyalar = DOSYA_KLASORLERI.flatMap((alt) => dosyalar(klasor, alt)).map((yol) => {
    const icerik = readFileSync(join(klasor, yol));
    return { yol, ozet: sha(icerik), icerik: icerik.toString("base64") };
  });
  const zincir = gunlukZinciri(tablolar.adimlar);
  const govde = {
    bicim: PAKET_BICIMI,
    olusturma: zaman,
    surum: Number(vt.prepare("PRAGMA user_version").get().user_version),
    tablolar,
    kanitDosyalari,
    ekDosyalar,
    gunlukZinciri: { halkalar: zincir, son: zincir.at(-1) ?? SIFIR },
  };
  return { ...govde, paketOzeti: sha(kararliJson(govde)) };
}

/** Paketi doğrular. Sorun yoksa boş dizi döner; her sorun kullanıcıya gösterilecek bir cümledir. */
export function paketDogrula(p) {
  const sorunlar = [];
  if (!p || p.bicim !== PAKET_BICIMI) return ["Bu dosya bir Akredit aktarım paketi değil."];
  const { paketOzeti, ...govde } = p;
  if (sha(kararliJson(govde)) !== paketOzeti) sorunlar.push("Paketin içeriği oluşturulduktan sonra değişmiş.");
  const zincir = gunlukZinciri(p.tablolar.adimlar);
  const halkalar = p.gunlukZinciri?.halkalar ?? [];
  if (zincir.length !== halkalar.length) sorunlar.push(`Günlükte ${zincir.length} adım var, zincirde ${halkalar.length} halka var.`);
  const ilkFark = zincir.findIndex((h, i) => h !== halkalar[i]);
  if (ilkFark >= 0) sorunlar.push(`Günlük zinciri ${ilkFark + 1}. adımda kırılıyor.`);
  if ((zincir.at(-1) ?? SIFIR) !== p.gunlukZinciri?.son) sorunlar.push("Günlük zincirinin son halkası tutmuyor.");
  const dosyaOzeti = new Map(p.kanitDosyalari.map((d) => [d.yol, d]));
  for (const k of p.tablolar.kanitlar) {
    const d = dosyaOzeti.get(k.yol);
    if (!d) { sorunlar.push(`Kanıt dosyası pakette yok: ${k.ozgun_ad}`); continue; }
    const gercek = sha(Buffer.from(d.icerik, "base64"));
    if (gercek !== k.ozet || gercek !== d.ozet) sorunlar.push(`Kanıt dosyasının özeti tutmuyor: ${k.ozgun_ad}`);
  }
  for (const d of p.ekDosyalar) if (sha(Buffer.from(d.icerik, "base64")) !== d.ozet) sorunlar.push(`Dosyanın özeti tutmuyor: ${d.yol}`);
  return sorunlar;
}

const guvenliYol = (yol) => !yol.startsWith("/") && !yol.split("/").includes("..") && !yol.includes("\\");

/**
 * Paketi boş bir çalışma klasörüne açar. `vtAc(klasor)` şemayı kurup veritabanını açar.
 * Satırlar kimlikleriyle aynen yazılır; kanıt dosyaları salt okunur kalır.
 */
export function paketAc(p, klasor, vtAc) {
  const sorunlar = paketDogrula(p);
  if (sorunlar.length) throw new Error(sorunlar.join(" "));
  for (const d of [...p.kanitDosyalari, ...p.ekDosyalar]) if (!guvenliYol(d.yol)) throw new Error(`Paketteki dosya yolu geçersiz: ${d.yol}`);
  const vt = vtAc(klasor);
  const dolu = TABLOLAR.some((t) => vt.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n > 0);
  if (dolu) { vt.close(); throw new Error("Hedef klasör boş değil. Paketi yeni bir klasöre aç."); }
  vt.exec("BEGIN IMMEDIATE");
  try {
    for (const t of TABLOLAR) {
      // Sütun adları paketten gelir: yalnız tablonun gerçek sütunları kabul edilir (SQL'e ad olarak girer).
      const sutunlar = new Set(vt.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name));
      const satirlar = p.tablolar[t];
      if (!Array.isArray(satirlar)) throw new Error(`Paketteki ${t} tablosu okunamadı.`);
      for (const satir of satirlar) {
        const s = Object.keys(satir);
        const yabanci = s.find((k) => !sutunlar.has(k));
        if (yabanci !== undefined || !s.length) throw new Error(`Paketteki ${t} tablosunda tanınmayan sütun var.`);
        vt.prepare(`INSERT INTO ${t} (${s.join(", ")}) VALUES (${s.map(() => "?").join(", ")})`).run(...s.map((k) => satir[k]));
      }
    }
    vt.exec("COMMIT");
  } catch (e) { vt.exec("ROLLBACK"); vt.close(); throw e; }
  vt.close();
  for (const d of p.kanitDosyalari) {
    const y = join(klasor, d.yol);
    mkdirSync(dirname(y), { recursive: true });
    if (!existsSync(y)) { writeFileSync(y, Buffer.from(d.icerik, "base64")); chmodSync(y, 0o444); }
  }
  for (const d of p.ekDosyalar) {
    const y = join(klasor, d.yol);
    mkdirSync(dirname(y), { recursive: true });
    writeFileSync(y, Buffer.from(d.icerik, "base64"));
  }
}

/** Paketi sunucuya gönderir. Ağ hatasında ya da sunucu kabul etmezse { tamam: false, neden } döner. */
export async function paketGonder(p, { sunucu, anahtar, fetchIslevi = fetch }) {
  const taban = String(sunucu).replace(/\/+$/, "");
  const basliklar = { authorization: `Bearer ${anahtar}`, "content-type": "application/json", "idempotency-key": p.paketOzeti };
  try {
    const ben = await fetchIslevi(`${taban}/api/v1/ben`, { headers: { authorization: basliklar.authorization } });
    if (ben.status === 401 || ben.status === 403) return { tamam: false, neden: "Anahtar kabul edilmedi. Panelden yeni bir anahtar al." };
    if (!ben.ok) return { tamam: false, neden: `Sunucu yanıt vermedi (${ben.status}). Daha sonra yeniden dene.` };
    const r = await fetchIslevi(`${taban}/api/v1/aktarim`, { method: "POST", headers: basliklar, body: JSON.stringify(p) });
    if (r.status === 404) return { tamam: false, neden: "Sunucu henüz klasör aktarımını kabul etmiyor. Paket bu bilgisayarda saklandı." };
    if (!r.ok) return { tamam: false, neden: `Sunucu paketi kabul etmedi (${r.status}).` };
    return { tamam: true };
  } catch {
    return { tamam: false, neden: "Sunucuya ulaşılamadı. Paket bu bilgisayarda saklandı; bağlantı gelince yeniden dene." };
  }
}
