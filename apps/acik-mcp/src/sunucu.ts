// Açık MCP sunucusu: resmî TypeScript SDK'nın McpServer'ı üzerine kurulur. Her araç salt okuma ve
// deterministiktir; araç açıklamaları ve yanıtlar Türkçedir. Gelen veride kişisel veri deseni görülürse
// çağrı hesap yapılmadan reddedilir. Her yanıt kaynak listesi ve "YÖKAK ile bağı yoktur" notu taşır.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ACIK_ARACLAR, type AcikArac, AKREDIT_NOTU, type AracBaglami, AracHatasi, DEPO } from "./araclar.ts";
import { kisiselVeriIletisi, kisiselVeriTurleri } from "./kisisel-veri.ts";
import { ACIK_ISTEMLER, type AcikIstem, istemSemasi } from "./promptlar.ts";

export const SUNUCU_ADI = "akredit-acik";
export const SUNUCU_SURUMU = "0.2.0";

export const SUNUCU_TALIMATI = [
  "Akredit açık araçları öğretim elemanlarına kalite ve akreditasyon işlerinde yardım eder: Bologna ders paketi denetimi ve doldurma, öğrenme çıktısı yazma, ÇK/PÇ hesabı, YÖKAK ve program akreditasyonu (MÜDEK, FEDEK, SABAK, EPDAD) ölçüt ve kanıt rehberi, rapor dil denetimi.",
  "Hoca ne yapacağını söylemediyse 'baslangic' istemindeki odak menüsünü göster. Her adımda kısa bir soru ve 2-3 numaralı seçenek ver; hoca tek rakam ya da harfle seçer; 'hepsi 1' gibi toplu onayı kabul et. Her yanıttaki sonrakiAdim önerisine uy.",
  "Sunucu model çağırmaz ve metin üretmez: seçenekleri sen yazarsın, sunucu kural ve kalıp verir, denetler ve sayıları hesaplar. Sayıları yalnız araç sonucundan al.",
  "Kişisel veri (ad, numara, e-posta, telefon) göndermeyin; görülürse çağrı reddedilir. Ölçüt metnini yalnız olcut_getir sonucundan alıntılayın; DOĞRULANMADI ya da 'Belgeden okunamadı' işaretli metni tahminle doldurmayın. Programın disiplinini kurum seçer. Kanıtı olmayan cümle EKSİK kalır. Kitap, kişi, tarih uydurmayın.",
  "Sunucu adres çekmez: Bologna sayfasını hoca yapıştırır ya da siz kendi web aracınızla okursunuz. Kayıt, onay ve gönderim hocadadır. Akredit'in YÖKAK ile bağı yoktur.",
].join(" ");

export interface AcikSunucuSecenekleri {
  simdi?: () => Date;
  araclar?: readonly AcikArac[];
  istemler?: readonly AcikIstem[];
}

const metinSonuc = (veri: Record<string, unknown>, isError = false) => ({
  content: [{ type: "text" as const, text: JSON.stringify(veri, null, 2) }],
  structuredContent: veri,
  ...(isError ? { isError: true } : {}),
});

/** Bir aracı doğrudan çalıştırır (MCP katmanı dışında da kullanılabilir: test, belge). */
export function aracCalistir(
  a: AcikArac,
  girdi: unknown,
  b: AracBaglami,
): { veri: Record<string, unknown>; hata: boolean } {
  const turler = kisiselVeriTurleri(girdi);
  if (turler.length)
    return {
      veri: {
        hata: [kisiselVeriIletisi(turler), a.kisiselVeriIpucu].filter(Boolean).join(" "),
        kod: "kisisel_veri",
        not: AKREDIT_NOTU,
      },
      hata: true,
    };
  const g = a.girdi.safeParse(girdi);
  if (!g.success) {
    const alanlar = g.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "girdi"}: ${i.message}`);
    return {
      veri: {
        hata: "Girdi geçersiz. Aşağıdaki alanları düzeltip yeniden deneyin.",
        kod: "gecersiz_girdi",
        alanlar,
        not: AKREDIT_NOTU,
      },
      hata: true,
    };
  }
  try {
    const s = a.calistir(g.data, b);
    return {
      veri: {
        sonuc: s.sonuc,
        sonrakiAdim: s.sonrakiAdim ?? a.sonrakiAdim,
        kaynak: s.kaynak,
        not: AKREDIT_NOTU,
        kod_deposu: DEPO,
      },
      hata: false,
    };
  } catch (e) {
    const ileti =
      e instanceof AracHatasi ? e.message : "Beklenmeyen bir sorun oluştu. Girdiyi denetleyip yeniden deneyin.";
    return {
      veri: { hata: ileti, kod: e instanceof AracHatasi ? "arac_hatasi" : "beklenmeyen", not: AKREDIT_NOTU },
      hata: true,
    };
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
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async (girdi: unknown) => {
        const r = aracCalistir(a, girdi, { simdi });
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
