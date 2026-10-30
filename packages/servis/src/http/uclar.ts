// `/api/v1` uçlarının tek tanımı. İşleyici ve OpenAPI belgesi bu listeden üretilir; bir uç eklemek için
// yalnız buraya satır eklenir.

import type { Eylem } from "@akredit/yetki";
import { z } from "zod";
import * as akademik from "../akademik.ts";
import * as arastirma from "../arastirma/index.ts";
import type { ServisBaglami } from "../baglam.ts";
import * as bologna from "../bologna/index.ts";
import * as dersDosyasi from "../ders-dosyasi/index.ts";
import * as kanit from "../kanit.ts";
import * as kurulum from "../kurulum/index.ts";
import * as odr from "../odr/index.ts";
import * as onay from "../onay/index.ts";
import * as oneri from "../oneri.ts";
import * as panel from "../panel.ts";
import * as politika from "../politika.ts";
import * as puko from "../puko/index.ts";
import * as yoneticiOzeti from "../puko/yonetici-ozeti.ts";
import * as rapor from "../rapor.ts";
import * as s from "../semalar.ts";
import * as wordPaketi from "../word-paketi/index.ts";

export type Yontem = "GET" | "POST" | "PATCH";

export interface Uc {
  ad: string;
  yontem: Yontem;
  /** `{id}` biçiminde yol parametreli, `/api/v1` önekisiz yol. */
  yol: string;
  ozet: string;
  /** Denetlenen yetki (belge için; denetimi servis yapar). */
  eylem: Eylem | "oturum";
  sorgu?: z.ZodType;
  govde?: z.ZodType;
  cikti: z.ZodType;
  basariDurumu?: 200 | 201;
  /** Durum değiştiren uçlar `Idempotency-Key` başlığını kabul eder. */
  isle: (b: ServisBaglami, g: { yol: Record<string, string>; sorgu: unknown; govde: unknown }) => Promise<unknown>;
}

const Bos = z.object({}).strict();

export const UCLAR: Uc[] = [
  {
    ad: "ben",
    yontem: "GET",
    yol: "/ben",
    ozet: "Oturumdaki kişi",
    eylem: "oturum",
    cikti: s.Kullanici,
    isle: (b) => panel.kullanici(b),
  },
  {
    ad: "panelOzeti",
    yontem: "GET",
    yol: "/panel",
    ozet: "Panel özeti: bekleyen öneriler, yaklaşan görevler, ölçüt kapsaması, karar sayısı",
    eylem: "oneri.oku",
    cikti: s.PanelOzeti,
    isle: (b) => panel.panelOzeti(b),
  },
  {
    ad: "kanitlar",
    yontem: "GET",
    yol: "/kanitlar",
    ozet: "Kanıt listesi (süzgeç ve sayfalama)",
    eylem: "kanit.oku",
    sorgu: s.KanitFiltresi,
    cikti: s.sayfaSemasi(s.KanitGorunumu),
    isle: (b, g) => kanit.kanitlar(b, g.sorgu as z.input<typeof s.KanitFiltresi>),
  },
  {
    ad: "kanit",
    yontem: "GET",
    yol: "/kanitlar/{id}",
    ozet: "Kanıt ve parçaları",
    eylem: "kanit.oku",
    cikti: s.KanitAyrintisi,
    isle: (b, g) => kanit.kanit(b, g.yol.id as string),
  },
  {
    ad: "kanitHatti",
    yontem: "GET",
    yol: "/kanit-hatti",
    ozet: "Kanıt hattı iş durumu sayaçları",
    eylem: "kanit.oku",
    cikti: s.KanitHattiOzeti,
    isle: (b) => kanit.kanitHattiOzeti(b),
  },
  {
    ad: "bekleyenOneriler",
    yontem: "GET",
    yol: "/oneriler",
    ozet: "Karar bekleyen öneriler",
    eylem: "oneri.oku",
    sorgu: s.SayfaGirdisi,
    cikti: s.sayfaSemasi(s.OneriGorunumu),
    isle: (b, g) => oneri.bekleyenOneriler(b, g.sorgu as s.SayfaGirdisi),
  },
  {
    ad: "bekleyenSayisi",
    yontem: "GET",
    yol: "/oneriler/sayac",
    ozet: "Karar bekleyen öneri sayısı (etkin riske göre)",
    eylem: "oneri.oku",
    cikti: z.object({
      toplam: z.number(),
      risk: z.object({ dusuk: z.number(), orta: z.number(), yuksek: z.number() }),
    }),
    isle: (b) => onay.bekleyenSayisi(b),
  },
  {
    ad: "insanDakikasi",
    yontem: "GET",
    yol: "/olcum/insan-dakikasi",
    ozet: "İnsan dakikası ve karar oranları (kişi ve süreç bazında; pilot raporu için)",
    eylem: "gunluk.oku",
    sorgu: onay.OlcumGirdisi,
    cikti: onay.OlcumRaporu,
    isle: (b, g) => onay.insanDakikasiRaporu(b, g.sorgu),
  },
  {
    ad: "kararlar",
    yontem: "GET",
    yol: "/kararlar",
    ozet: "Verilmiş kararlar",
    eylem: "oneri.oku",
    sorgu: s.SayfaGirdisi,
    cikti: s.sayfaSemasi(s.Karar),
    isle: (b, g) => oneri.kararlar(b, g.sorgu as s.SayfaGirdisi),
  },
  {
    ad: "kararVer",
    yontem: "POST",
    yol: "/kararlar",
    ozet: "Öneriye karar ver (onay, düzeltme, ret). Yalnız oturumla; API anahtarıyla verilemez.",
    eylem: "karar.ver",
    govde: s.KararGirdisi,
    cikti: s.Karar,
    basariDurumu: 201,
    isle: (b, g) => oneri.kararVer(b, g.govde),
  },
  {
    ad: "yoneticiOzeti",
    yontem: "GET",
    yol: "/oneriler/{id}/yonetici-ozeti",
    ozet: "Dış gönderim kararından önce gösterilen yönetici özeti (sayılar hesaptan)",
    eylem: "rapor.gonder",
    cikti: z.object({ imza: z.string() }).passthrough(),
    isle: (b, g) => yoneticiOzeti.oneriYoneticiOzeti(b, g.yol.id as string),
  },
  {
    ad: "yoneticiOzetiGoruldu",
    yontem: "POST",
    yol: "/oneriler/{id}/ozet-goruldu",
    ozet: "Yönetici özetinin görüldüğünü özetin imzasıyla günlüğe yazar. Yalnız oturumla.",
    eylem: "rapor.gonder",
    govde: z.object({ imza: z.string().min(1).max(200) }).strict(),
    cikti: z.object({ imza: z.string(), zaman: z.string() }),
    isle: (b, g) =>
      yoneticiOzeti.yoneticiOzetiGoruldu(b, { oneriId: g.yol.id, imza: (g.govde as { imza: string }).imza }),
  },
  {
    ad: "topluKararVer",
    yontem: "POST",
    yol: "/kararlar/toplu",
    ozet: "Toplu onay. Seçimde yüksek riskli öneri varsa hiçbiri onaylanmaz.",
    eylem: "karar.ver",
    govde: s.TopluKararGirdisi,
    cikti: z.array(s.Karar),
    basariDurumu: 201,
    isle: (b, g) => oneri.topluKararVer(b, g.govde),
  },
  {
    ad: "programlar",
    yontem: "GET",
    yol: "/programlar",
    ozet: "Programlar, çıktılar ve matris",
    eylem: "olcme.oku",
    cikti: z.array(s.Program),
    isle: (b) => akademik.programlar(b),
  },
  {
    ad: "program",
    yontem: "GET",
    yol: "/programlar/{id}",
    ozet: "Tek program",
    eylem: "olcme.oku",
    cikti: s.Program,
    isle: (b, g) => akademik.program(b, g.yol.id as string),
  },
  {
    ad: "dersler",
    yontem: "GET",
    yol: "/dersler",
    ozet: "Dersler",
    eylem: "olcme.oku",
    cikti: z.array(s.Ders),
    isle: (b) => akademik.dersler(b),
  },
  {
    ad: "ders",
    yontem: "GET",
    yol: "/dersler/{id}",
    ozet: "Tek ders",
    eylem: "olcme.oku",
    cikti: s.Ders,
    isle: (b, g) => akademik.ders(b, g.yol.id as string),
  },
  {
    ad: "dersinDosyalari",
    yontem: "GET",
    yol: "/dersler/{id}/ders-dosyasi",
    ozet: "Dersin dönemlere göre ders dosyası durumu ve hocanın etkileşimi",
    eylem: "olcme.oku",
    cikti: z.array(dersDosyasi.DersDosyasiDurumu),
    isle: (b, g) => dersDosyasi.dersinDosyalari(b, g.yol.id as string),
  },
  {
    ad: "dokumAktar",
    yontem: "POST",
    yol: "/ders-dosyasi/dokum",
    ozet: "OBS not dökümlerini (soru bazlı) aktar ve soru-çıktı eşleme önerisini aç",
    eylem: "olcme.veri_gir",
    govde: dersDosyasi.DokumGirdisi,
    cikti: dersDosyasi.DokumSonucu,
    basariDurumu: 201,
    isle: (b, g) => dersDosyasi.dokumAktar(b, g.govde, process.env.AKREDIT_TAKMA_AD_ANAHTARI ?? ""),
  },
  {
    ad: "dersDosyasiDurumu",
    yontem: "GET",
    yol: "/ders-dosyasi/{id}",
    ozet: "Bir ders açılışının ders dosyası durumu",
    eylem: "olcme.oku",
    cikti: dersDosyasi.DersDosyasiDurumu,
    isle: (b, g) => dersDosyasi.durum(b, g.yol.id as string),
  },
  {
    ad: "dersDosyasiOlustur",
    yontem: "POST",
    yol: "/ders-dosyasi/{id}/olustur",
    ozet: "Onaylı eşlemeyle ölçmeyi yap, ders dosyasını ve onay önerisini oluştur",
    eylem: "olcme.veri_gir",
    govde: Bos,
    cikti: dersDosyasi.DersDosyasiDurumu,
    isle: (b, g) => dersDosyasi.olustur(b, g.yol.id as string),
  },
  {
    ad: "dersDosyasiBelgesi",
    yontem: "GET",
    yol: "/ders-dosyasi/{id}/belge",
    ozet: "Ders dosyası (DOCX) ya da ölçme raporu (XLSX), base64",
    eylem: "rapor.oku",
    sorgu: z.object({ bicim: dersDosyasi.BelgeBicimi }).strict(),
    cikti: dersDosyasi.DosyaCiktisi,
    isle: (b, g) => dersDosyasi.belge(b, g.yol.id as string, (g.sorgu as { bicim: string }).bicim),
  },
  {
    ad: "odrOlustur",
    yontem: "POST",
    yol: "/odr",
    ozet: "Programın öz değerlendirme raporu taslağını çerçeveye göre kur (yeni sürüm)",
    eylem: "rapor.duzenle",
    govde: odr.OdrGirdisi,
    cikti: odr.OdrDurumu,
    basariDurumu: 201,
    isle: (b, g) => odr.olustur(b, g.govde),
  },
  {
    ad: "programinOdrleri",
    yontem: "GET",
    yol: "/programlar/{id}/odr",
    ozet: "Programın öz değerlendirme raporları",
    eylem: "rapor.oku",
    cikti: z.array(odr.OdrDurumu),
    isle: (b, g) => odr.programinRaporlari(b, g.yol.id as string),
  },
  {
    ad: "odrDurumu",
    yontem: "GET",
    yol: "/odr/{id}",
    ozet: "Öz değerlendirme raporunun durumu, kapsaması, eksikleri ve sürüm geçmişi",
    eylem: "rapor.oku",
    cikti: odr.OdrDurumu,
    isle: (b, g) => odr.durum(b, g.yol.id as string),
  },
  {
    ad: "odrEksikleri",
    yontem: "POST",
    yol: "/odr/{id}/eksikler",
    ozet: "Raporun eksikleri için görev aç",
    eylem: "rapor.duzenle",
    govde: Bos,
    cikti: odr.EksikGorevleri,
    isle: (b, g) => odr.eksikleriBaslat(b, g.yol.id as string),
  },
  {
    ad: "odrBelgesi",
    yontem: "GET",
    yol: "/odr/{id}/belge",
    ozet: "Öz değerlendirme raporu (DOCX) ya da ziyaret hazırlık paketi (XLSX), base64",
    eylem: "rapor.oku",
    sorgu: z.object({ bicim: odr.OdrBicimi }).strict(),
    cikti: odr.OdrDosyasi,
    isle: (b, g) => odr.belge(b, g.yol.id as string, (g.sorgu as { bicim: string }).bicim),
  },
  {
    ad: "raporlar",
    yontem: "GET",
    yol: "/raporlar",
    ozet: "Raporlar",
    eylem: "rapor.oku",
    cikti: z.array(s.Rapor),
    isle: (b) => rapor.raporlar(b),
  },
  {
    ad: "rapor",
    yontem: "GET",
    yol: "/raporlar/{id}",
    ozet: "Tek rapor (geçerli bölüm sürümleri)",
    eylem: "rapor.oku",
    cikti: s.Rapor,
    isle: (b, g) => rapor.rapor(b, g.yol.id as string),
  },
  {
    ad: "surecler",
    yontem: "GET",
    yol: "/surecler",
    ozet: "Süreç görevleri",
    eylem: "oturum",
    cikti: z.array(s.SurecGorevi),
    isle: (b) => rapor.surecler(b),
  },
  {
    ad: "ayarlar",
    yontem: "GET",
    yol: "/ayarlar",
    ozet: "Kurum ayarları ve yetki devri politikaları",
    eylem: "oneri.oku",
    cikti: s.Ayarlar,
    isle: (b) => politika.ayarlar(b),
  },
  {
    ad: "ayarlariGuncelle",
    yontem: "PATCH",
    yol: "/ayarlar",
    ozet: "Kurum ayarlarını güncelle",
    eylem: "kurum.ayar_yonet",
    govde: s.AyarDegisikligi,
    cikti: s.Ayarlar,
    isle: (b, g) => politika.ayarlariGuncelle(b, g.govde),
  },
  {
    ad: "yurtDisiMetni",
    yontem: "GET",
    yol: "/ayarlar/yurt-disi-metni",
    ozet: "Yurt dışı aktarım kararının güncel metni, sürümü ve özeti",
    eylem: "kurum.ayar_yonet",
    cikti: z.object({ metin: z.string(), surum: z.string(), ozet: z.string() }),
    isle: async () => ({
      metin: kurulum.YURT_DISI_METNI,
      surum: kurulum.YURT_DISI_METNI_SURUMU,
      ozet: kurulum.YURT_DISI_METNI_OZETI,
    }),
  },
  {
    ad: "yurtDisiIzniImzala",
    yontem: "POST",
    yol: "/ayarlar/yurt-disi-karari",
    ozet: "Yurt dışı yapay zekâ iznini yöneticinin adıyla imzalanan kararla ver (tek açma yolu)",
    eylem: "kurum.ayar_yonet",
    govde: kurulum.YurtDisiKarariGirdisi.omit({ izin: true }),
    cikti: s.Ayarlar,
    isle: async (b, g) => {
      await kurulum.yurtDisiKarariImzala(b, { ...(g.govde as object), izin: true });
      return politika.ayarlar(b);
    },
  },
  {
    ad: "yzAnahtariKaydet",
    yontem: "POST",
    yol: "/ayarlar/yz-anahtari",
    ozet: "Kurumun OpenRouter anahtarını şifreli kaydet (anahtar yanıtta dönmez)",
    eylem: "kurum.ayar_yonet",
    govde: s.YzAnahtarGirdisi,
    cikti: s.Ayarlar,
    isle: (b, g) => politika.yzAnahtariKaydet(b, g.govde),
  },
  {
    ad: "yzAnahtariKaldir",
    yontem: "POST",
    yol: "/ayarlar/yz-anahtari/kaldir",
    ozet: "Kayıtlı yapay zekâ anahtarını kaldır",
    eylem: "kurum.ayar_yonet",
    govde: Bos,
    cikti: s.Ayarlar,
    isle: (b) => politika.yzAnahtariKaldir(b),
  },
  {
    ad: "yzBaglantiDene",
    yontem: "POST",
    yol: "/ayarlar/yz-anahtari/dene",
    ozet: "Kayıtlı anahtarla kısa bir bağlantı denemesi yap",
    eylem: "kurum.ayar_yonet",
    govde: Bos,
    cikti: s.BaglantiSonucu,
    isle: (b) => politika.yzBaglantiDene(b),
  },
  {
    ad: "politikalar",
    yontem: "GET",
    yol: "/politikalar",
    ozet: "Yetki devri politikaları",
    eylem: "oneri.oku",
    cikti: z.array(s.PolitikaKaydi),
    isle: (b) => politika.politikalar(b),
  },
  {
    ad: "politikaTaslagiOlustur",
    yontem: "POST",
    yol: "/politikalar",
    ozet: "İmza bekleyen politika taslağı oluştur",
    eylem: "politika.imzala",
    govde: s.PolitikaGirdisi,
    cikti: s.PolitikaKaydi,
    basariDurumu: 201,
    isle: (b, g) => politika.politikaTaslagiOlustur(b, g.govde),
  },
  {
    ad: "politikaImzala",
    yontem: "POST",
    yol: "/politikalar/{id}/imza",
    ozet: "Politikayı adınızla imzalayın. Yalnız oturumla.",
    eylem: "politika.imzala",
    govde: s.ImzaGirdisi,
    cikti: s.PolitikaKaydi,
    isle: (b, g) => politika.politikaImzala(b, g.yol.id as string, g.govde),
  },
  {
    ad: "politikaIptal",
    yontem: "POST",
    yol: "/politikalar/{id}/iptal",
    ozet: "Politikayı iptal et (yeni kayıtla). Yalnız oturumla.",
    eylem: "politika.imzala",
    govde: Bos,
    cikti: s.PolitikaKaydi,
    isle: (b, g) => politika.politikaIptal(b, g.yol.id as string),
  },
  {
    ad: "bolognaOku",
    yontem: "POST",
    yol: "/bologna/programlar/{id}/okumalar",
    ozet: "Programın Bologna sayfalarını oku (ya da okunmuş veriyi yükle) ve kanıt olarak kaydet",
    eylem: "kanit.yukle",
    govde: bologna.OkumaGirdisi,
    cikti: bologna.OkumaSonucu,
    basariDurumu: 201,
    isle: (b, g) => bologna.okumaKaydet(b, g.yol.id as string, g.govde),
  },
  {
    ad: "bolognaDenetimi",
    yontem: "GET",
    yol: "/bologna/programlar/{id}/denetim",
    ozet: "Programdaki derslerin toplu Bologna denetimi ve önceki okumayla karşılaştırma",
    eylem: "olcme.oku",
    cikti: bologna.ProgramDenetimi,
    isle: (b, g) => bologna.programDenetimi(b, g.yol.id as string),
  },
  {
    ad: "bolognaTaslagiUret",
    yontem: "POST",
    yol: "/bologna/taslaklar",
    ozet: "Hocanın beyanı ve Bologna okumasından atıflı ders paketi taslağı üret (onay kutusuna öneri düşer)",
    eylem: "olcme.veri_gir",
    govde: bologna.TaslakGirdisi,
    cikti: bologna.TaslakSonucu,
    basariDurumu: 201,
    isle: (b, g) => bologna.taslakUret(b, g.govde),
  },
  {
    ad: "bolognaGecmisi",
    yontem: "GET",
    yol: "/bologna/dersler/{id}/gecmis",
    ozet: "Dersin taslak geçmişi: kararlar, değişen alanlar ve nedenleri",
    eylem: "oneri.oku",
    cikti: z.array(bologna.GecmisKaydi),
    isle: (b, g) => bologna.taslakGecmisi(b, g.yol.id as string),
  },
  {
    ad: "bolognaYazmaPlani",
    yontem: "POST",
    yol: "/bologna/taslaklar/{id}/yazma-plani",
    ozet: "Onaylı ve hatasız taslaktan OBS yazma planı önerisi aç (ayrıca insan onayı ister)",
    eylem: "olcme.veri_gir",
    govde: bologna.YazmaPlaniGirdisi,
    cikti: bologna.YazmaPlaniSonucu,
    basariDurumu: 201,
    isle: (b, g) => bologna.yazmaPlaniOner(b, g.yol.id as string, g.govde),
  },
  {
    ad: "bolognaDevirDurumu",
    yontem: "GET",
    yol: "/bologna/dersler/{id}/devir",
    ozet: "Dersin dönem devri: fark özeti, itiraz süresi, karar ve kaynağa yazma durumu (İP-38)",
    eylem: "oneri.oku",
    cikti: bologna.DevirDurumu.nullable(),
    isle: (b, g) => bologna.devirDurumu(b, g.yol.id as string),
  },
  {
    ad: "bolognaDevirKarari",
    yontem: "POST",
    yol: "/bologna/dersler/{id}/devir/karar",
    ozet: "Dönem devri taslağını onayla ya da reddet (yalnız oturumla; öğretim elemanının kararı süre dolumunun önüne geçer)",
    eylem: "karar.ver",
    govde: bologna.DevirKarariGirdisi,
    cikti: s.Karar,
    isle: (b, g) => bologna.devirKarari(b, g.yol.id as string, g.govde),
  },
  {
    ad: "bolognaKaynagaYazmaIzni",
    yontem: "GET",
    yol: "/bologna/kaynaga-yazma-izni",
    ozet: "Kurumun Bologna/OBS'ye geri yazma için yazılı izni",
    eylem: "oneri.oku",
    cikti: bologna.YazmaIzni,
    isle: (b) => bologna.kaynagaYazmaIzni(b),
  },
  {
    ad: "bolognaKaynagaYazmaIzniVer",
    yontem: "POST",
    yol: "/bologna/kaynaga-yazma-izni",
    ozet: "Kurumun yazılı iznini kaydet ya da geri al (yeni kayıtla; yalnız oturumdaki kurum yöneticisi)",
    eylem: "kurum.ayar_yonet",
    govde: bologna.YazmaIzniGirdisi,
    cikti: bologna.YazmaIzni,
    isle: (b, g) => bologna.kaynagaYazmaIzniVer(b, g.govde),
  },
  {
    ad: "bolognaEksikGiderme",
    yontem: "POST",
    yol: "/bologna/dersler/{id}/eksik-giderme",
    ozet: "Son Bologna okumasının bulgularından dersin düzeltme taslağını üret (onay kutusuna öneri düşer)",
    eylem: "olcme.veri_gir",
    govde: z.object({ beyan: z.string().trim().max(4000).optional() }).strict(),
    cikti: bologna.EksikGidermeSonucu,
    basariDurumu: 201,
    isle: (b, g) => bologna.eksikleriGider(b, { ...(g.govde as object), dersId: g.yol.id }),
  },
  {
    ad: "kanitAra",
    yontem: "POST",
    yol: "/arastirma/kanit-ara",
    ozet: "Ölçüt için kurum içi kanıt adayı (onay bekler) ve istenirse başka kurum örneği (kanıt değildir) ara",
    eylem: "kanit.oku",
    govde: arastirma.KanitAramaGirdisi,
    cikti: arastirma.KanitAramaSonucu,
    basariDurumu: 201,
    isle: (b, g) => arastirma.kanitAra(b, g.govde),
  },
  {
    ad: "siteTaramasi",
    yontem: "POST",
    yol: "/arastirma/site-tarama",
    ozet: "Kurumun kendi sitesini tara (robots.txt'ye uyar); bulunan belgeleri kanıt olarak ekle",
    eylem: "kanit.yukle",
    govde: arastirma.SiteTaramaGirdisi,
    cikti: arastirma.SiteTaramaSonucu,
    basariDurumu: 201,
    isle: (b, g) => arastirma.siteTaramasi(b, g.govde),
  },
  {
    ad: "disOrnekleri",
    yontem: "GET",
    yol: "/dersler/{id}/dis-ornekler",
    ozet: "Dersin başka kurum örnekleri (kanıt değildir; yalnız kaynak)",
    eylem: "oneri.oku",
    cikti: z.array(arastirma.DisOrnekGorunumu),
    isle: (b, g) => arastirma.disOrnekleri(b, g.yol.id as string),
  },
  {
    ad: "wordPaketi",
    yontem: "GET",
    yol: "/dersler/{id}/word-paketi",
    ozet: "Dersin Word paketi: düzeltilmiş ders bilgi paketi, bulgular, kaynakça (+ ders dosyası; birden çoksa zip)",
    eylem: "oneri.oku",
    cikti: wordPaketi.DosyaCiktisi,
    isle: (b, g) => wordPaketi.wordPaketi(b, g.yol.id as string),
  },
  {
    ad: "wordYukle",
    yontem: "POST",
    yol: "/dersler/{id}/word-paketi",
    ozet: "Düzenlenmiş Word dosyasını yükle: alan farkı öğretim elemanının kararı olarak kaydedilir",
    eylem: "olcme.veri_gir",
    govde: wordPaketi.YuklemeGirdisi,
    cikti: wordPaketi.YuklemeSonucu,
    basariDurumu: 201,
    isle: (b, g) => wordPaketi.wordYukle(b, g.yol.id as string, g.govde),
  },
  {
    ad: "bolognaYazmaBaslat",
    yontem: "POST",
    yol: "/bologna/yazma-planlari/{id}/baslat",
    ozet: "Onaylı yazma planını al (alan alan ve kopyalanabilir). Onaysız ya da süresi dolmuş planla çalışmaz.",
    eylem: "olcme.veri_gir",
    govde: Bos,
    cikti: bologna.OnayliPlan,
    isle: (b, g) => bologna.yazmaPlaniAl(b, g.yol.id as string),
  },
  {
    ad: "bolognaYazmaBitir",
    yontem: "POST",
    yol: "/bologna/yazma-planlari/{id}/bitir",
    ozet: "Yazmanın sonucunu günlüğe yaz",
    eylem: "olcme.veri_gir",
    govde: bologna.YazmaBitisGirdisi,
    cikti: z.object({ tamam: z.literal(true) }),
    isle: (b, g) => bologna.yazmaBitir(b, g.yol.id as string, g.govde),
  },
  {
    ad: "gunluk",
    yontem: "GET",
    yol: "/gunluk",
    ozet: "Değiştirilemez günlük",
    eylem: "gunluk.oku",
    sorgu: s.SayfaGirdisi,
    cikti: s.sayfaSemasi(s.GunlukKaydi),
    isle: (b, g) => panel.gunluk(b, g.sorgu as s.SayfaGirdisi),
  },
  {
    ad: "pukoKartlari",
    yontem: "GET",
    yol: "/puko/kartlar",
    ozet: "Karar bekleyen PÜKÖ kartları (katman 2), otomatik kayıt sayısı ve onay yorgunluğu",
    eylem: "olcme.oku",
    cikti: z.object({
      kartlar: z.array(
        z.object({ id: z.string(), pukoId: z.string(), hedefDonem: z.string().nullable() }).passthrough(),
      ),
      otomatikSayisi: z.number().int(),
      yorgunluk: z.object({}).passthrough(),
    }),
    isle: (b) => puko.pukoPaneli(b),
  },
  {
    ad: "pukoOnlemSec",
    yontem: "POST",
    yol: "/puko/onlem",
    ozet: "Karar kartında önlem seç. Yalnız oturumla; karar veren oturumdaki kişidir.",
    eylem: "karar.ver",
    govde: puko.OnlemSecimi,
    cikti: z.object({
      devir: z.array(z.object({ dersKodu: z.string(), hedefDonem: z.string() }).passthrough()),
      eylem: z.object({ pukoId: z.string(), baslik: z.string() }).passthrough(),
      eylemIdleri: z.array(z.string()),
      sorumsuzDersler: z.array(z.string()),
    }),
    isle: (b, g) => puko.pukoOnlemSec(b, g.govde),
  },
  {
    ad: "pukoOlcumleri",
    yontem: "POST",
    yol: "/puko/olcumler",
    ozet: "Dönem ölçümlerini işle: değerler kayıtlı veriden hesaplanır; gövde yalnız ders, dönem ve çıktıyı seçer. Yalnız oturumla.",
    eylem: "olcme.veri_gir",
    govde: puko.PukoOlcumGirdisi,
    cikti: z.object({ otomatik: z.number().int(), acilan: z.number().int(), kapanan: z.number().int() }),
    isle: (b, g) => puko.pukoOlcumleriIsle(b, g.govde),
  },
];

/** Yolu uçla eşleştirir; parametreleri döndürür. */
export function ucBul(yontem: string, yol: string): { uc: Uc; yol: Record<string, string> } | "yontem" | null {
  const parcalar = yol.replace(/\/+$/u, "").split("/");
  let yolEslesti = false;
  for (const uc of UCLAR) {
    const kalip = uc.yol.split("/");
    if (kalip.length !== parcalar.length) continue;
    const p: Record<string, string> = {};
    const tamam = kalip.every((k, i) => {
      const v = parcalar[i] ?? "";
      if (k.startsWith("{") && k.endsWith("}")) {
        if (!v) return false;
        p[k.slice(1, -1)] = decodeURIComponent(v);
        return true;
      }
      return k === v;
    });
    if (!tamam) continue;
    yolEslesti = true;
    if (uc.yontem === yontem) return { uc, yol: p };
  }
  return yolEslesti ? "yontem" : null;
}
