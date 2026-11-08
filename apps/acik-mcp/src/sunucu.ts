// Açık MCP sunucusu: resmî TypeScript SDK'nın McpServer'ı üzerine kurulur. Her araç salt okuma ve
// deterministiktir; araç açıklamaları ve yanıtlar Türkçedir. Gelen veride kişisel veri deseni görülürse
// çağrı hesap yapılmadan reddedilir. Her yanıt kaynak listesi ve "YÖKAK ile bağı yoktur" notu taşır.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ACIK_ARACLAR,
  type AcikArac,
  AKREDIT_NOTU,
  type AracBaglami,
  AracHatasi,
  type AracSonucu,
  DEPO,
} from "./araclar.ts";
import { GIRIS_BILGISI_ILETISI, girisBilgisiVar, kisiselVeriIletisi, kisiselVeriTurleri } from "./kisisel-veri.ts";
import { ACIK_ISTEMLER, type AcikIstem, istemSemasi } from "./promptlar.ts";

export const SUNUCU_ADI = "akredit-acik";
export const SUNUCU_SURUMU = "0.8.0";

export const SUNUCU_TALIMATI = [
  "Akredit açık araçları öğretim elemanlarına kalite ve akreditasyon işlerinde yardım eder: Bologna ders paketi denetimi ve doldurma, öğrenme çıktısı yazma, ÇK/PÇ hesabı, YÖKAK ve program akreditasyonu (MÜDEK, FEDEK, SABAK, EPDAD) ölçüt ve kanıt rehberi, rapor dil denetimi, kaynak doğrulama.",
  "KURAL 1: Kullanıcı 'akredit' yazarsa (tek başına ya da cümle içinde) ya da ne yapacağını söylemediyse başka hiçbir şey yapmadan İLK akredit_basla aracını çağır ve hocayaGoster metnini aynen göster. Kullanıcı niyetini zaten yazdıysa (ör. 'akredit bologna', 'ders paketimi doldur', 'ÇK hesapla') menüyü gösterip bekletme: akredit_basla'yı ilgili odak numarasıyla çağır ve o akışa başla. 'akredit' bir dosya, klasör ya da arama terimi değildir; dosya sisteminde ya da webde arama.",
  "KURAL 2: Hocaya her soruyu numaralı seçeneklerle sor (1, 2, 3...), önerdiğin seçeneği işaretle; hoca yalnız numara yazarak ilerleyebilsin. Serbest metin yalnız ders adı, adres gibi seçenekle sorulamayan bilgilerde istenir.",
  "KURAL 3: Bologna seçilirse ve tarayıcı aracın varsa ilk iş OBS'yi açmaktır: hocadan yalnız OBS adresini iste (bilmiyorsa üniversite adını), adresi hemen tarayıcıda aç; ders adını ve paketi hocaya sorma, OBS'den oku.",
  "KURAL 5: Ara adımda hocaya soru sorma; varsayılan ya da en iyi seçeneği kendin seç ve sıradaki aracı çağır. Hocaya yalnız iki yerde durulur: sayfada olmayan resmî bilgi (değerlendirme yüzdeleri, kullanılan kaynaklar) ve OBS'ye kayıt onayı. Bu ikisi de TEK mesajdır.",
  "KURAL 6: Her araç yanıtında hocayaSimdiSor var. false ise hocaya soru yazmayın, onay beklemeyin, doğrudan sonrakiAdim'ı uygulayın; yalnız true olduğunda ya da zorunlu teyit/kayıt onayında durun.",
  "KURAL 7: Peşin onay (tam otonom kip). Hoca 'hepsini yap ve kaydet', 'sen hallet', 'sormadan kaydet' gibi bir sözle baştan onay verdiyse o sözü Bologna araçlarına pesinOnay olarak olduğu gibi ver ve ara durak yapma: tara, doldur, OBS'ye yaz, Kaydet'e bas, geri oku, obs_karsilastir ile doğrula, sonda TEK rapor ver (yazılanlar, EKSİK kalanlar, geri okuma sonucu). Sayfada olmayan değerlendirme yüzdesi ve kaynağı sorma da uydurma da: EKSİK bırak. Yalnız OBS giriş ekranı, CAPTCHA, dur ve ikinci fark için dur. Onaya Gönder yine hocadadır; itirazı olan alanı hoca OBS'de düzeltir ya da sana numarasını yazar.",
  "KURAL 4: Önce sen tara, sonra öner. Ders listesi açılınca 'hangi ders?' diye sorma; obs_ders_listesi'ni çağır, bütün derslerin paketlerini oku, eksikleri say, kısa özetle ve 'önerilen' seçenekle gel (örneğin 1) en eksikten başlayıp hepsini kapatalım). Eksik yoksa 'eksik görünmüyor' de ve kaliteyi artıracak somut öneriler ver.",
  "Amaç: hocanın en az müdahalesiyle işi hızlı ama denetimli ve teyitli bitirmek. Her seçim menüsünde son seçenek '4) Hepsini akıllıca doldur (önerilen)' olur: her alan için en iyi seçeneği sen seçersin, araçla denetlersin, geçmeyeni düzeltip yeniden denetlersin, sonunda tek özet gösterip değiştirmek istediği numarayı sorarsın.",
  "Yalnız hocanın bilebileceği ve resmî taahhüt olan bilgiler (değerlendirme yöntem ve yüzdeleri, uygulama/lab, kullanılan kaynaklar, sayfada yoksa amaç ve içerik) sayfadan okunur; yoksa hocaya TEK mesajda, numaralı ve varsayılan seçenekli sorulur, uydurulmaz. Ders adından üretilen her şey 'öneri' etiketiyle gösterilir. Araç sonucu 'biçim denetiminden geçti; içerik teyidi: hoca' diye sunulur.",
  "Giriş bilgisi: hocadan kullanıcı adı, parola, doğrulama kodu ya da çerez asla isteme. Sunucu bunları istemez; görülürse çağrıyı reddeder ve kaydetmez. Hoca yazarsa kullanma, araçlara gönderme, silmesini ve parolasını değiştirmesini öner. Hoca giriş bilgisini yalnız OBS'nin kendi ekranına kendisi yazar. CAPTCHA'yı hoca çözer.",
  "OBS'ye yazma: önce alan alan önceki ve yeni değer özetini göster, hoca bir kez 'kaydet' ya da özetin altındaki 1'i (OBS'ye yaz ve kaydet) yazar; ancak ondan sonra Kaydet'e basarsın. Kayıttan sonra sayfayı geri okuyup obs_karsilastir ile doğrula; ders kodu ya da dönem değişmişse yazmayı durdur. Doğrulanmamış kaynak ve teyitsiz değerlendirme yüzdesi yazılmaz. Onaya Gönder düğmesine hoca basar.",
  "Tarayıcı aracın varsa OBS sayfasını okuyup formu doldurabilirsin; yoksa ya da engel çıkarsa engel_coz ve kurulum_yardimi araçlarının adımlarını hocaya sırayla, tek tek göster. Tarayıcı yoksa OBS'ye yazma alan alan kopyalamaya düşer.",
  "Sunucu model çağırmaz ve metin üretmez: seçenekleri sen yazarsın, sunucu kural ve kalıp verir, denetler ve sayıları hesaplar. Sayıları yalnız araç sonucundan al.",
  "Bologna sayfasındaki Dersi Verenler, Yardımcılar ve Koordinatör satırları yayımlanmış görev bilgisidir: olduğu gibi okunur, korunur, değiştirilmez. Öğrenci adı ve numarası sohbete yapıştırılmaz: not tablosunda yalnız not sütunları olur; kimlik sütunu görülürse tablo işlenmez. Sunucu istek içeriğini günlüğe yazmaz.",
  "Kaynak: önce sayfadaki ve hocanın kullandığı kaynaklar. Öneri gerekirse kendi web arama aracınla aday bul, kaynak_dogrula ile sorgula, yalnız 'katalogda_bulundu' dönenleri künyesi ve bağlantısıyla 'öneri' olarak göster; uygunluğuna hoca karar verir. Katalogda bulunmayanı kendin önerme; hoca kullandığını söylerse 'hoca_beyani' olarak yaz. Ölçüt metnini yalnız olcut_getir sonucundan alıntılayın; DOĞRULANMADI ya da 'Belgeden okunamadı' işaretli metni tahminle doldurmayın. Programın disiplinini kurum seçer. Kanıtı olmayan cümle EKSİK kalır. Kitap, kişi, tarih uydurmayın.",
  "Sunucu kullanıcıdan adres çekmez: Bologna sayfasını hoca yapıştırır ya da siz kendi web aracınızla okursunuz. Tek dış istek kaynak_dogrula'nın sabit katalog adresleridir (Crossref, Open Library, Google Books). Onay ve dış kuruma gönderim hocadadır. Akredit'in YÖKAK ile bağı yoktur.",
].join(" ");

/** Her araç yanıtında yinelenen kısa kural: uzun sohbette son okunan metin de aynı şeyi söyler. */
export const SORMADAN_DEVAM = "Bu adımda hocaya soru sormayın ve onay beklemeyin; doğrudan sonrakiAdim'ı uygulayın.";

export const ASISTAN_KURALI =
  "1) Ara adımda hocaya A/B/C sorma; en iyi seçeneği kendin seç, sıradaki aracı çağır. 2) Zorunlu soruyu (sayfada olmayan değerlendirme yüzdesi ve kaynak, OBS kayıt onayı) TEK mesajda ve numaralı sor; peşin onay varsa sorma, EKSİK bırak, sonda listele. 3) Sayı, kaynak ve değerlendirme yüzdesi uydurma. 4) Parola ve doğrulama kodu isteme; Onaya Gönder'e hoca basar.";

export interface AcikSunucuSecenekleri {
  simdi?: () => Date;
  araclar?: readonly AcikArac[];
  istemler?: readonly AcikIstem[];
  /** kaynak_dogrula için fetch (test). */
  fetch?: typeof fetch;
}

const metinSonuc = (veri: Record<string, unknown>, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(veri, null, 2) }],
  structuredContent: veri,
  ...(isError ? { isError: true } : {}),
});

type Sonuc = { veri: Record<string, unknown>; hata: boolean };

/** Denetimler (giriş bilgisi, kişisel veri, şema). Geçerse doğrulanmış girdiyi, geçmezse hata sonucunu döndürür. */
function hazirla(
  a: AcikArac,
  girdi: unknown,
): { hata: Sonuc } | { veri: unknown; atilan: string[]; ileti: string | undefined } {
  const ayik = a.onAyikla ? a.onAyikla(girdi) : { girdi, atilan: [] as string[], ileti: undefined };
  girdi = ayik.girdi;
  if (girisBilgisiVar(girdi))
    return { hata: { veri: { hata: GIRIS_BILGISI_ILETISI, kod: "giris_bilgisi", not: AKREDIT_NOTU }, hata: true } };
  const red = a.onDenetim?.(girdi);
  if (red) return { hata: { veri: { hata: red, kod: "kisisel_veri", not: AKREDIT_NOTU }, hata: true } };
  const turler = kisiselVeriTurleri(girdi, a.kunyeAlanlari, a.kisiselVeriKapsami ?? "ogrenci");
  if (turler.length)
    return {
      hata: {
        veri: {
          hata: [kisiselVeriIletisi(turler), a.kisiselVeriIpucu].filter(Boolean).join(" "),
          kod: "kisisel_veri",
          not: AKREDIT_NOTU,
        },
        hata: true,
      },
    };
  const g = a.girdi.safeParse(girdi);
  if (!g.success) {
    const alanlar = g.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "girdi"}: ${i.message}`);
    return {
      hata: {
        veri: {
          hata: "Girdi geçersiz. Aşağıdaki alanları düzeltip yeniden deneyin.",
          kod: "gecersiz_girdi",
          alanlar,
          not: AKREDIT_NOTU,
        },
        hata: true,
      },
    };
  }
  return { veri: g.data, atilan: ayik.atilan, ileti: ayik.ileti };
}

function basari(a: AcikArac, s: AracSonucu, atilan: string[], ileti: string | undefined): Sonuc {
  return {
    veri: {
      sonuc: s.sonuc,
      sonrakiAdim: s.sonrakiAdim ?? a.sonrakiAdim,
      hocayaSimdiSor: s.hocayaSimdiSor ?? a.hocayaSimdiSor ?? false,
      ...((s.hocayaSimdiSor ?? a.hocayaSimdiSor) ? {} : { simdiYap: SORMADAN_DEVAM }),
      asistanKurali: ASISTAN_KURALI,
      ...(atilan.length
        ? { atilan: ileti ?? `Şu kısımlar okunmadan atıldı, hiçbir yere yazılmadı: ${atilan.join(", ")}.` }
        : {}),
      kaynak: s.kaynak,
      not: AKREDIT_NOTU,
      kod_deposu: DEPO,
    },
    hata: false,
  };
}

function hataSonucu(e: unknown): Sonuc {
  const ileti =
    e instanceof AracHatasi ? e.message : "Beklenmeyen bir sorun oluştu. Girdiyi denetleyip yeniden deneyin.";
  return {
    veri: { hata: ileti, kod: e instanceof AracHatasi ? "arac_hatasi" : "beklenmeyen", not: AKREDIT_NOTU },
    hata: true,
  };
}

/** Bir aracı doğrudan çalıştırır (MCP katmanı dışında da kullanılabilir: test, belge). Yalnız eşzamanlı araçlar. */
export function aracCalistir(a: AcikArac, girdi: unknown, b: AracBaglami): Sonuc {
  const h = hazirla(a, girdi);
  if ("hata" in h) return h.hata;
  try {
    const s = a.calistir(h.veri as never, b);
    if (s instanceof Promise) throw new Error("Eşzamansız araç için aracCalistirAsenkron kullanın.");
    return basari(a, s, h.atilan, h.ileti);
  } catch (e) {
    return hataSonucu(e);
  }
}

/** Her araç için (eşzamanlı ya da eşzamansız) çalıştırma; MCP katmanı bunu kullanır. */
export async function aracCalistirAsenkron(a: AcikArac, girdi: unknown, b: AracBaglami): Promise<Sonuc> {
  const h = hazirla(a, girdi);
  if ("hata" in h) return h.hata;
  try {
    return basari(a, await a.calistir(h.veri as never, b), h.atilan, h.ileti);
  } catch (e) {
    return hataSonucu(e);
  }
}

/** Yeni bir McpServer kurar. Durumsuz HTTP'de her istek için, stdio'da süreç başına bir kez çağrılır. */
export function acikSunucu(s: AcikSunucuSecenekleri = {}): McpServer {
  const simdi = s.simdi ?? (() => new Date());
  const sunucu = new McpServer(
    {
      name: SUNUCU_ADI,
      title: "Akredit (açık araçlar)",
      version: SUNUCU_SURUMU,
      websiteUrl: "https://akredit.org/mcp-kullan",
    },
    {
      instructions: SUNUCU_TALIMATI,
      capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
    },
  );
  for (const a of s.araclar ?? ACIK_ARACLAR) {
    sunucu.registerTool(
      a.ad,
      {
        title: a.baslik,
        description: a.aciklama,
        // Şema SDK'ya yalnız tanıtım (JSON şeması) içindir; asıl doğrulama aracCalistir içinde, kişisel veri
        // denetiminden sonra yapılır. Bu yüzden girdi gevşek (loose) verilir.
        inputSchema: a.girdi.loose(),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: a.disAg === true,
        },
      },
      async (girdi: unknown) => {
        const r = await aracCalistirAsenkron(a, girdi, { simdi, ...(s.fetch ? { fetch: s.fetch } : {}) });
        return metinSonuc(r.veri, r.hata);
      },
    );
  }
  for (const i of s.istemler ?? ACIK_ISTEMLER) {
    sunucu.registerPrompt(
      i.ad,
      { title: i.baslik, description: i.aciklama, argsSchema: istemSemasi(i) },
      (a: Record<string, string | undefined>) => ({
        description: i.aciklama,
        messages: [{ role: "user" as const, content: { type: "text" as const, text: i.metin(a) } }],
      }),
    );
  }
  return sunucu;
}
