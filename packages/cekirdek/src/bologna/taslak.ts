// Bologna ders sayfası taslağı denetimi (K1-K12 ve diğer kurallar).
// apps/cli/lib/bologna-taslak.mjs `taslakDenetle` işlevinin saf, tipli taşıması. Mesajlar aynen korunur:
// CLI'deki "K8: metin" dizesi burada { kural: "K8", aciklama: "metin" } olur.
//
// İki kural seti vardır (dış inceleme 2026-11-05):
// - "cli" (varsayılan): CLI ile birebir eşdeğer, eşdeğerlik testleri bunu sınar.
// - "guncel": açık MCP'nin kullandığı set. ÖÇ sayısı 4-10 geçerli (5-8 önerilir), "-ebilme/-abilme" kabul,
//   "sahip ol/farkında ol/haberdar ol/vakıf ol" ölçülemez, AKTS iş yükü 25-30 saat/AKTS aralığı (kurum değeri
//   verilirse tam o değer). Her bulgu kuralTuru ve dayanak taşır; resmî olduğu doğrulanamayan kural resmî sayılmaz.

import type { Bulgu, KuralTuru } from "../turler.ts";
import type { BolognaTaslagi } from "./turler.ts";

export interface TaslakDenetimSonucu {
  bulgular: Bulgu[];
  isToplam: number;
  hedef: number;
  /** "guncel" kural setinde iş yükünün kabul aralığı (saat). Kurum değeri verildiyse alt ve üst eşittir. */
  hedefAraligi?: [number, number];
}

export type TaslakKuralSeti = "cli" | "guncel";

export interface TaslakDenetimSecenekleri {
  /** "cli" kural setinde AKTS başına saat (varsayılan 30). */
  bolen?: number;
  kuralSeti?: TaslakKuralSeti;
  /** "guncel" sette kurumun AKTS başına saati; verilirse iş yükü tam AKTS × bu değer olmalı. */
  kurumBoleni?: number | undefined;
  /** "guncel" sette kurum değeri yoksa AKTS başına saat aralığı; varsayılan [25, 30]. */
  aktsSaat?: readonly [number, number];
}

/** Kuralların dayanak notları. Hiçbiri resmî belgeyle doğrulanmadı; bu yüzden hiçbiri "resmî" değildir. */
export const TASLAK_DAYANAK = {
  akredit: "Akredit iç kuralı (packages/cekirdek/src/bologna/taslak.ts); resmî dayanağı DOĞRULANMADI.",
  akts: "AKTS başına 25-30 saat yaygın uygulamadır; resmî metinle DOĞRULANMADI. Kurumun yönergesi önceliklidir.",
  kurum: "Kurumun verdiği AKTS başına saat değeri.",
} as const;

const ONERILEN_CIKTI: readonly [number, number] = [5, 8];
const GECERLI_CIKTI: readonly [number, number] = [4, 10];

const kelime = (s: unknown): number =>
  String(s ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
const bos = (s: unknown): boolean => /^\s*(-|\.|yok|)\s*$/i.test(String(s ?? ""));

// ASCII'ye düşürülmüş Türkçe kelimeler (talimat bölüm 6). CLI ile aynı ifade.
const ASCII_TURKCE =
  /\b(icin|haftalik|ogrenme|ogrenci|ciktilar[ıi]?|ciktisi|bilisim|kaynag[ıi]|devam[ıi]|uygulamali|notlar[ıi]n[ıi]|incelenmesi|gelistirme|yazilim|programlamanin|tasarim[ıi]?|olusturma|degerlendirme|sinav[ıi]?|calisma|donem|guvenlik|baglant[ıi])\b/i;
// Ölçülemeyen çıktı kalıpları (K4). "gösterebilir", "açıklayabilir" geçerlidir.
const OLCULEMEZ = /(bilgi sahibi olur|hakkında bilgi|fikir sahibi olur|(^|\s)(öğrenir|kavrar|anlar|bilir))\.?\s*$/i;
const ZAYIF = /farkındalık/i;
// Türkçe çekimli fiille biten çıktı: açıklar, uygular, tasarlar, geliştirebilir…
const FIILLE_BITER = /(ar|er|ır|ir|ur|ür)\.?\s*$/i;
// "guncel" set: "-ebilme/-abilme" kalıbı da kabul (tasarlayabilme, analiz edebilme).
const FIILLE_BITER_GUNCEL = /(ar|er|ır|ir|ur|ür|abilme|ebilme)\.?\s*$/iu;
// "guncel" set: "sahip olur", "farkında olur", "haberdar olur", "vakıf olur" (ve -abilir, -ma biçimleri) ölçülemez.
const OLCULEMEZ_GUNCEL = /(sahibi? ol|sahip ol|farkında ol|haberdar ol|vakıf ol)\p{L}*\.?\s*$/iu;

/** Kısmi ya da dışarıdan gelmiş taslak da denetlenebilir; eksik alanlar bulgu üretir. */
export type DenetlenecekTaslak = Partial<BolognaTaslagi>;

export function taslakDenetle(t: DenetlenecekTaslak, secenek: TaslakDenetimSecenekleri = {}): TaslakDenetimSonucu {
  const { bolen = 30 } = secenek;
  const guncel = secenek.kuralSeti === "guncel";
  const bulgular: Bulgu[] = [];
  const hata = (kural: string, aciklama: string) => bulgular.push({ duzey: "hata", kural, aciklama });
  const uyari = (kural: string, aciklama: string) => bulgular.push({ duzey: "uyari", kural, aciklama });

  for (const alan of ["kod", "ad", "akts", "tul"] as const) if (bos(t[alan])) hata("Temel", `"${alan}" alanı boş.`);
  const [teorik = 0, uygulama = 0, lab = 0] = String(t.tul || "")
    .split("+")
    .map(Number);

  // K2, K3: metin alanları.
  const sinirlar = {
    amac: [60, 120, "Amaç"],
    icerik: [120, 250, "İçerik"],
    yontem: [40, 90, "Yöntem ve teknikler"],
  } as const;
  for (const [alan, [en, boy, ad]] of Object.entries(sinirlar) as [
    keyof typeof sinirlar,
    readonly [number, number, string],
  ][]) {
    const tr = t[alan]?.tr;
    const n = kelime(tr);
    if (bos(tr)) hata("K3", `${ad} boş ya da "-", ".", "Yok" ile doldurulmuş.`);
    else if (n < en || n > boy) hata("K2", `${ad} ${n} kelime (beklenen ${en}-${boy}).`);
    const enMetin = t[alan]?.en;
    if (bos(enMetin)) hata("K3", `${ad} İngilizcesi boş.`);
    else if (n && kelime(enMetin) < n * 0.6)
      uyari("K2", `${ad} İngilizcesi Türkçesinden belirgin biçimde kısa, kısaltılmış çeviri olabilir.`);
  }
  if (bos(t.notlar?.tr)) hata("K3", "Ders notları boş.");

  // Değerlendirme.
  const deg = t.degerlendirme ?? [];
  const degToplam = deg.reduce((s, x) => s + Number(x.katki || 0), 0);
  if (degToplam !== 100) hata("Değerlendirme", `Katkılar toplamı %${degToplam}, tam %100 olmalı.`);
  if ((uygulama > 0 || lab > 0) && !deg.some((x) => /uygulama|proje|ödev|laboratuvar|lab/i.test(x.ad))) {
    hata("Değerlendirme", "Uygulamalı derste uygulama, proje, ödev ya da laboratuvar kalemi yok.");
  }

  // K8: iş yükü = AKTS × bölen, tam eşit.
  const isyuku = t.isyuku ?? [];
  const isToplam = isyuku.reduce((s, x) => s + Number(x.sayi || 0) * Number(x.sure || 0), 0);
  const carpan = t.bolen || bolen;
  let hedef = Number(t.akts) * carpan;
  let hedefAraligi: [number, number] | undefined;
  if (!guncel) {
    if (isToplam !== hedef)
      hata(
        "K8",
        `Toplam iş yükü ${isToplam} saat, AKTS ${t.akts} × ${carpan} = ${hedef} olmalı. AKTS'yi değil saat dağılımını değiştir.`,
      );
  } else {
    const kurum = secenek.kurumBoleni ?? t.bolen;
    const [alt, ust] = secenek.aktsSaat ?? [25, 30];
    const akts = Number(t.akts);
    hedefAraligi = kurum ? [akts * kurum, akts * kurum] : [akts * alt, akts * ust];
    hedef = kurum ? akts * kurum : akts * ust;
    if (kurum && isToplam !== hedef)
      bulgular.push({
        duzey: "hata",
        kural: "K8",
        aciklama: `Toplam iş yükü ${isToplam} saat, AKTS ${t.akts} × ${kurum} (kurum değeri) = ${hedef} olmalı. AKTS'yi değil saat dağılımını değiştir.`,
        kuralTuru: "kurum",
        dayanak: TASLAK_DAYANAK.kurum,
      });
    else if (!kurum && (isToplam < hedefAraligi[0] || isToplam > hedefAraligi[1]))
      bulgular.push({
        duzey: "hata",
        kural: "K8",
        aciklama: `Toplam iş yükü ${isToplam} saat, AKTS ${t.akts} için ${hedefAraligi[0]}-${hedefAraligi[1]} saat (AKTS başına ${alt}-${ust}) olmalı. AKTS'yi değil saat dağılımını değiştir.`,
        kuralTuru: "Akredit önerisi",
        dayanak: TASLAK_DAYANAK.akts,
      });
  }
  const dersSuresi = isyuku.find((x) => /ders süresi/i.test(x.ad));
  if (dersSuresi && Number(dersSuresi.sure) !== teorik + uygulama + lab) {
    uyari("K8", `Ders süresi satırı haftada ${dersSuresi.sure} saat, T+U+L toplamı ${teorik + uygulama + lab}.`);
  }

  // K6: ders yapısı.
  const yapiToplam = (t.dersYapisi ?? []).reduce((s, x) => s + Number(x.yuzde || 0), 0);
  if (yapiToplam !== 100) hata("K6", `Ders yapısı yüzdeleri toplamı %${yapiToplam}, tam %100 olmalı.`);

  // K4, K5: öğrenme çıktıları.
  const cik = t.ciktilar ?? [];
  if (!guncel) {
    if (cik.length < 8 || cik.length > 12) hata("K5", `${cik.length} öğrenme çıktısı var, 8-12 olmalı.`);
  } else if (cik.length < GECERLI_CIKTI[0] || cik.length > GECERLI_CIKTI[1])
    hata(
      "K5",
      `${cik.length} öğrenme çıktısı var, ${GECERLI_CIKTI[0]}-${GECERLI_CIKTI[1]} olmalı (${ONERILEN_CIKTI[0]}-${ONERILEN_CIKTI[1]} önerilir).`,
    );
  else if (cik.length < ONERILEN_CIKTI[0] || cik.length > ONERILEN_CIKTI[1])
    uyari("K5", `${cik.length} öğrenme çıktısı var; ${ONERILEN_CIKTI[0]}-${ONERILEN_CIKTI[1]} önerilir.`);
  const olculemez = (m: string) => OLCULEMEZ.test(m) || (guncel && OLCULEMEZ_GUNCEL.test(m));
  const fiilleBiter = (m: string) => (guncel ? FIILLE_BITER_GUNCEL : FIILLE_BITER).test(m);
  cik.forEach((c, i) => {
    if (c.kod !== `Ö${i + 1}`) hata("K5", `Çıktı numaralandırması kesintili: ${i + 1}. sırada "${c.kod}" var.`);
    if (bos(c.tr)) hata("K3", `${c.kod} boş.`);
    else if (olculemez(c.tr) || !fiilleBiter(c.tr.trim()))
      hata("K4", `${c.kod} ölçülebilir bir eylem fiiliyle bitmiyor: "${c.tr}"`);
    else if (ZAYIF.test(c.tr))
      uyari("K4", `${c.kod} "farkındalık" ifadesi ölçmesi zor. Gözlenebilir bir eylemle yazmayı düşün.`);
    if (bos(c.en)) hata("K3", `${c.kod} İngilizcesi boş.`);
    if (!["Bilgi", "Beceri", "Yetkinlik"].includes(c.tur))
      hata("K5", `${c.kod} türü Bilgi, Beceri ya da Yetkinlik olmalı.`);
  });
  if (cik.length && !cik.some((c) => c.tur === "Yetkinlik")) hata("K5", "En az bir çıktı Yetkinlik olmalı.");
  if (cik.length && cik.filter((c) => c.tur === "Beceri").length < cik.length / 2)
    uyari("K5", "Çıktıların çoğunluğu Beceri olmalı.");

  // K9: haftalık akış.
  const haftalar = t.haftalar ?? [];
  if (haftalar.length < 14 || haftalar.length > 16) hata("Ders akışı", `${haftalar.length} hafta var, 14-16 olmalı.`);
  for (const h of haftalar) {
    if (kelime(h.konu?.tr) < 8) hata("Ders akışı", `${h.hafta}. hafta konusu 8 kelimeden kısa.`);
    if (bos(h.konu?.en)) hata("K3", `${h.hafta}. hafta İngilizcesi boş.`);
    if (bos(h.onHazirlik)) hata("K9", `${h.hafta}. hafta ön hazırlık boş.`);
    if (bos(h.dokuman)) hata("K9", `${h.hafta}. hafta dokümanlar boş.`);
  }
  if (haftalar.length && !haftalar.some((h) => /ara sınav/i.test(h.konu?.tr ?? "undefined")))
    uyari("Ders akışı", "Ara sınav haftası görünmüyor.");
  if (haftalar.length && !/yarıyıl sonu|final/i.test(haftalar.at(-1)?.konu?.tr ?? "undefined"))
    uyari("Ders akışı", "Son hafta yarıyıl sonu sınavı görünmüyor.");

  // Kaynaklar.
  const kaynaklar = (t.kaynaklar ?? []).filter((k) => !bos(k.yazar) && !bos(k.eser));
  if (kaynaklar.length < 2)
    hata("Kaynaklar", `${kaynaklar.length} geçerli kaynak var, en az 2 olmalı (yazar ve eser adı).`);

  // K12: çıktı katkı matrisi.
  const pler = t.programCiktilari ?? [];
  if (!pler.length) hata("K12", "Programın resmî çıktıları (programCiktilari) verilmedi. Önce bologna-al ile oku.");
  let toplamHucre = 0;
  let besler = 0;
  for (const c of cik) {
    const satir = t.katki?.[c.kod];
    if (!satir) {
      hata("K12", `${c.kod} için katkı satırı yok.`);
      continue;
    }
    const degerler = Object.entries(satir);
    for (const [p, v] of degerler) {
      if (pler.length && !pler.includes(p)) hata("K12", `${c.kod} satırında programda olmayan sütun: ${p}.`);
      if (v !== null && v !== "" && !(Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5))
        hata("K12", `${c.kod}/${p} değeri 1-5 ya da boş olmalı, "${v}" verilmiş.`);
      if (v) {
        toplamHucre += 1;
        if (Number(v) === 5) besler += 1;
      }
    }
    if (!degerler.some(([, v]) => v)) hata("K12", `${c.kod} satırı tamamen boş.`);
  }
  if (toplamHucre >= 10 && besler / toplamHucre > 0.6)
    hata(
      "K12",
      `Dolu hücrelerin %${Math.round((100 * besler) / toplamHucre)}'i 5. Matris şişirilmiş görünüyor, ayrıştır.`,
    );

  // K7: SKA.
  const ska = t.ska ?? [];
  if (ska.length < 2 || ska.length > 4 || ska.some((x) => !(x >= 1 && x <= 17)))
    hata("K7", "2-4 arası, 1-17 numaralı Sürdürülebilir Kalkınma Amacı seçilmeli.");

  // K10: yetkililer.
  const yetkili = t.yetkililer ?? [];
  if (!yetkili.some((y) => /koordinat/i.test(y.rol) && !bos(y.ad) && !bos(y.eposta)))
    hata("K10", "Ders koordinatörü adı ve e-postası yok.");
  if (!yetkili.some((y) => /veren/i.test(y.rol) && !bos(y.ad) && !bos(y.eposta)))
    hata("K10", "Dersi veren adı ve e-postası yok.");

  // Bölüm 6: ASCII Türkçe.
  const trMetinler = [
    t.amac?.tr,
    t.icerik?.tr,
    t.yontem?.tr,
    t.notlar?.tr,
    ...cik.map((c) => c.tr),
    ...haftalar.flatMap((h) => [h.konu?.tr, h.onHazirlik, h.dokuman]),
  ].filter(Boolean);
  const tumu = new RegExp(ASCII_TURKCE, "gi");
  const ascii = [...new Set(trMetinler.flatMap((m) => [...String(m).matchAll(tumu)].map((x) => x[0])))];
  if (ascii.length) hata("Türkçe", `Türkçe karakteri düşürülmüş kelimeler: ${ascii.slice(0, 10).join(", ")}.`);

  // CLI hataları önce, uyarıları sonra listeler; sıra korunur.
  const etiketli: Bulgu[] = guncel
    ? bulgular.map((b) => ({
        ...b,
        kuralTuru: b.kuralTuru ?? ("Akredit önerisi" satisfies KuralTuru),
        dayanak: b.dayanak ?? TASLAK_DAYANAK.akredit,
      }))
    : bulgular;
  const sirali = [...etiketli.filter((b) => b.duzey === "hata"), ...etiketli.filter((b) => b.duzey !== "hata")];
  return { bulgular: sirali, isToplam, hedef, ...(hedefAraligi ? { hedefAraligi } : {}) };
}
