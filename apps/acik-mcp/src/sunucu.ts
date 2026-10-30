// Açık MCP sunucusu: resmî TypeScript SDK'nın McpServer'ı üzerine kurulur. Her araç salt okuma ve
// deterministiktir; araç açıklamaları ve yanıtlar Türkçedir. Gelen veride kişisel veri deseni görülürse
// çağrı hesap yapılmadan reddedilir. Her yanıt kaynak listesi ve "YÖKAK ile bağı yoktur" notu taşır.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ACIK_ARACLAR, type AcikArac, AKREDIT_NOTU, type AracBaglami, AracHatasi, DEPO } from "./araclar.ts";
import { kisiselVeriIletisi, kisiselVeriTurleri } from "./kisisel-veri.ts";

export const SUNUCU_ADI = "akredit-acik";
export const SUNUCU_SURUMU = "0.1.0";

export const SUNUCU_TALIMATI =
  "Akredit açık araçları: YÖKAK ölçüt metni ve olgunluk düzeyleri, Bologna ders bilgisi denetimi, ÇK/PÇ sağlanma hesabı, öz değerlendirme iskeleti, rapor dil denetimi. Araçlar salt okumadır, kurum verisine erişmez, model çağırmaz. Kişisel veri (ad, numara, e-posta, telefon) göndermeyin; görülürse çağrı reddedilir. Ölçüt metnini yalnız olcut_getir sonucundan alıntılayın; DOĞRULANMADI işaretli metni tahminle doldurmayın. Sayıları yalnız araç sonucundan alın. Öz değerlendirme iskeleti metin içermez: kanıtı olmayan cümleyi EKSİK bırakın. Akredit'in YÖKAK ile bağı yoktur.";

export interface AcikSunucuSecenekleri {
  simdi?: () => Date;
  araclar?: readonly AcikArac[];
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
    return { veri: { hata: kisiselVeriIletisi(turler), kod: "kisisel_veri", not: AKREDIT_NOTU }, hata: true };
  const g = a.girdi.safeParse(girdi);
  if (!g.success) {
    const alanlar = g.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "girdi"}: ${i.message}`);
    return {
      veri: {
        hata: "Girdi geçersiz. Alanları düzeltip yeniden deneyin.",
        kod: "gecersiz_girdi",
        alanlar,
        not: AKREDIT_NOTU,
      },
      hata: true,
    };
  }
  try {
    const s = a.calistir(g.data, b);
    return { veri: { sonuc: s.sonuc, kaynak: s.kaynak, not: AKREDIT_NOTU, kod_deposu: DEPO }, hata: false };
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
    { instructions: SUNUCU_TALIMATI, capabilities: { tools: { listChanged: false } } },
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
  return sunucu;
}
