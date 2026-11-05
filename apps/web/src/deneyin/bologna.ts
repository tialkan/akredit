// /deneyin Bologna denetleyicisinin saf mantığı. Tamamı tarayıcıda çalışır; ağ yok, model yok.
// Ayrıştırma ve denetim herkese açık MCP'nin araçlarıdır (apps/acik-mcp/src/bologna.ts, yalnız içe aktarılır);
// kurallar @akredit/cekirdek Bologna denetiminden gelir. İş yükü toplamı burada deterministik hesaplanır.
// İstem üretici öğrenci verisi içermez: yalnız ders alanlarının durumu, kurallar ve uydurma yasağı.

import {
  ALANLAR,
  type AlanKodu,
  ayristirOnAyikla,
  BOLOGNA_ARACLARI,
  bolognaDenetleAraci,
} from "../../../acik-mcp/src/bologna.ts";

export type AlanDurumu = "bos" | "zayif" | "tamam" | "bilinmiyor";

export interface AlanSatiri {
  no: number;
  alan: AlanKodu;
  ad: string;
  durum: AlanDurumu;
  nedenler: string[];
  kural: string;
}

export interface IsYuku {
  satirlar: { ad: string; sayi: number; sure: number; toplam: number }[];
  toplam: number;
  akts: number | null;
  /** AKTS × 30 (bölen 30, Bologna sayfa kuralının üst sınırı); AKTS yoksa null. */
  hedef: number | null;
  /** Saat / AKTS; AKTS yoksa null. */
  aktsBasinaSaat: number | null;
}

export interface BolognaSonucu {
  kod: string;
  ad: string | null;
  alanlar: AlanSatiri[];
  isYuku: IsYuku | null;
  /** Ayrıştırmada atılan bilgi (oturum ve parola alanları), yalnız adı. */
  atilan: string[];
}

export class BolognaHatasi extends Error {}

interface DersGirdisi {
  kod: string;
  ad?: string;
  akts?: number | null;
  isyuku?: { ad: string; sayi: number | null; sure: number | null }[];
}

const yuvarla = (n: number) => Math.round(n * 100) / 100;

/** İş yükü: satır toplamı sayı × süre; hedef AKTS × 30. */
export function isYukuHesabi(ders: DersGirdisi): IsYuku | null {
  const satirlar = (ders.isyuku ?? [])
    .filter((x) => x.sayi !== null && x.sure !== null)
    .map((x) => ({ ad: x.ad, sayi: x.sayi ?? 0, sure: x.sure ?? 0, toplam: yuvarla((x.sayi ?? 0) * (x.sure ?? 0)) }));
  if (!satirlar.length) return null;
  const toplam = yuvarla(satirlar.reduce((t, x) => t + x.toplam, 0));
  const akts = typeof ders.akts === "number" && ders.akts > 0 ? ders.akts : null;
  return {
    satirlar,
    toplam,
    akts,
    hedef: akts === null ? null : akts * 30,
    aktsBasinaSaat: akts === null ? null : yuvarla(toplam / akts),
  };
}

const ayristir = BOLOGNA_ARACLARI.find((a) => a.ad === "bologna_ayristir");

/** Yapıştırılan OBS ders sayfasını (HTML ya da düz metin) ayrıştırır ve denetler. */
export function bolognaDenetimi(yapistirilan: string): BolognaSonucu {
  const ham = yapistirilan.trim();
  if (ham.length < 20) throw new BolognaHatasi("Ders sayfasının tamamını yapıştırın.");
  if (!ayristir) throw new BolognaHatasi("Ayrıştırıcı yüklenemedi. Sayfayı yenileyin.");
  const htmlMi = /<\s*(table|tr|td|div|p|html|body)\b/iu.test(ham);
  const on = ayristirOnAyikla(htmlMi ? { html: ham } : { metin: ham });
  const girdi = ayristir.girdi.safeParse(on.girdi);
  if (!girdi.success) throw new BolognaHatasi("Sayfa okunamadı. Ders sayfasının tamamını yapıştırın.");
  let ayr: { sonuc: unknown };
  try {
    ayr = ayristir.calistir(girdi.data, { simdi: () => new Date(0) }) as { sonuc: unknown };
  } catch (e) {
    throw new BolognaHatasi(e instanceof Error ? e.message : "Sayfa okunamadı.");
  }
  const s = ayr.sonuc as { tur: string; bolognaDenetleGirdisi?: { ders: DersGirdisi } };
  if (s.tur !== "ders" || !s.bolognaDenetleGirdisi)
    throw new BolognaHatasi("Bu bir program çıktıları sayfası. Bir dersin bilgi paketi sayfasını yapıştırın.");
  const dg = bolognaDenetleAraci.girdi.safeParse(s.bolognaDenetleGirdisi);
  if (!dg.success) throw new BolognaHatasi("Sayfadaki bazı alanlar okunamadı. Sayfanın tamamını yapıştırın.");
  const d = bolognaDenetleAraci.calistir(dg.data, { simdi: () => new Date(0) }) as {
    sonuc: { alanlar: AlanSatiri[] };
  };
  const ders = s.bolognaDenetleGirdisi.ders;
  return {
    kod: ders.kod,
    ad: ders.ad ?? null,
    // Yetkililer kişi adı taşır; denetlenir ama istemde ve listede yer almaz.
    alanlar: d.sonuc.alanlar
      .filter((a) => a.alan !== "yetkililer")
      .map((a) => ({
        ...a,
        nedenler: a.nedenler.map((n) => (/gönderilmedi\.$/u.test(n) ? "Sayfada bulunamadı." : n)),
      })),
    isYuku: isYukuHesabi(ders),
    atilan: on.atilan,
  };
}

export const DURUM_ADI: Record<AlanDurumu, string> = {
  bos: "Boş",
  zayif: "Zayıf",
  tamam: "Tamam",
  bilinmiyor: "Okunamadı",
};

/** Hocaya sorulması gereken, yapay zekânın tahmin edemeyeceği alanlar. */
const HOCAYA_SOR: Partial<Record<AlanKodu, string>> = {
  degerlendirme: "Değerlendirme kalemleri ve yüzdeleri bana sorulacak; tahmin edilmeyecek.",
  kaynaklar:
    "Kaynakları bana sor. Kendin kaynak önerirsen yalnız gerçekten var olan, bağlantısını verebildiğin eserleri öner; bağlantısız kaynak önerme.",
  yontem: "Derste gerçekten hangi yöntemleri kullandığımı bana sor.",
  isyuku: "AKTS değerini değiştirme; yalnız saat dağılımını öner. Toplamı satırlardan hesapla ve göster.",
  katki: "Hangi ders çıktısının hangi program çıktısına katkı verdiğini bana sor.",
};

/** Yapay zekâya yapıştırılacak tek parça istem. MCP gerektirmez; öğrenci verisi içermez. */
export function istemUret(s: BolognaSonucu): string {
  const eksik = s.alanlar.filter((a) => a.durum !== "tamam");
  const satirlar: string[] = [
    `Ders bilgi paketimi (Bologna) birlikte düzeltmek istiyorum. Ders: ${s.kod}${s.ad ? ` ${s.ad}` : ""}.`,
    "Akredit denetimi aşağıdaki alanları boş ya da zayıf buldu. Her alan için önce bana kısa sorular sor, sonra yanıtlarıma dayanarak 2 seçenek yaz.",
    "",
    "Doldurulacak alanlar:",
  ];
  if (!eksik.length) satirlar.push("- Boş ya da zayıf alan bulunmadı. Yalnız dil ve tutarlılık önerisi ver.");
  eksik.forEach((a, i) => {
    satirlar.push(`${i + 1}) ${a.ad} (${DURUM_ADI[a.durum].toLocaleLowerCase("tr")})`);
    for (const n of a.nedenler) satirlar.push(`   Neden: ${n}`);
    // MCP araç adı geçen kurallar (ör. kaynak_bicimle) bu istemde anlamsızdır; atlanır.
    for (const k of ALANLAR[a.alan].kurallar.filter((x) => !/\b[a-z]+_[a-z_]+\b/u.test(x)))
      satirlar.push(`   Kural: ${k}`);
    const sor = HOCAYA_SOR[a.alan];
    if (sor) satirlar.push(`   Not: ${sor}`);
  });
  if (s.isYuku?.hedef != null)
    satirlar.push(
      "",
      `İş yükü: satırların toplamı ${s.isYuku.toplam} saat, hedef ${s.isYuku.akts} AKTS x 30 = ${s.isYuku.hedef} saat.`,
    );
  satirlar.push(
    "",
    "Kurallar:",
    "- Uydurma yok. Faaliyet, tarih, sayı, yüzde, kaynak ya da uygulama bilgisi uydurma; bilmediğini bana sor.",
    "- Değerlendirme yüzdelerini, kaynakları ve derste gerçekte ne yapıldığını yalnız benden al.",
    "- Bağlantısını veremediğin kaynağı önerme. Emin olmadığın künye bilgisini boş bırak ve EKSİK yaz.",
    "- Öğrenci adı, numara ya da not isteme.",
    "- Her alanı OBS'ye kopyalayabileceğim düz metin olarak ver. Kalın yazı ve tablo kullanma.",
    "- Bitince, değiştirdiğin her alanı ve hangi bilginin benden geldiğini kısa bir listeyle özetle.",
  );
  return satirlar.join("\n");
}
