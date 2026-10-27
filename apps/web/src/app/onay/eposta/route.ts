// E-postadaki onay bağlantısı (İP-13). Oturum gerekmez: bağlantı kişiye bağlı, tek kullanımlık ve sürelidir
// (`@akredit/servis` onay modülü). GET yalnız gösterir (e-posta istemcilerinin ön izlemesi kararı tüketmesin);
// karar, kişinin düğmeye basmasıyla gelen POST'ta verilir. Yüksek riskli öneri bu yoldan karara bağlanamaz.
//
// Ortam: AKREDIT_ONAY_GIZLI (en az 32 bayt) imza anahtarıdır; yoksa bağlantılar çalışmaz.

import { onay, ServisHatasi } from "@akredit/servis";
import { tekiller } from "../../api/_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

const kacis = (x: string) =>
  x.replace(/[&<>"']/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function sayfa(baslik: string, govde: string, durum = 200): Response {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${kacis(baslik)} · Akredit</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#1a1a1a;background:#fff}
@media (prefers-color-scheme:dark){body{color:#eee;background:#141414}}button{font:inherit;padding:.6rem 1.2rem;border-radius:.4rem;border:0;background:#1d4ed8;color:#fff;cursor:pointer}
button:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}a{color:inherit}</style></head>
<body><main><h1>${kacis(baslik)}</h1>${govde}<p><a href="/panel/onaylar">Onay kutusuna git</a></p></main></body></html>`;
  return new Response(html, {
    status: durum,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}

const SONUC_ADI = { onaylandi: "onaylamak", reddedildi: "reddetmek" } as const;

function gizli(): string | null {
  const g = process.env.AKREDIT_ONAY_GIZLI;
  return g && Buffer.byteLength(g) >= 32 ? g : null;
}

const kapali = () =>
  sayfa("Bağlantı kullanılamıyor", "<p>E-postayla karar şu an kapalı. Kararı panelden verebilirsiniz.</p>", 503);

function hataSayfasi(e: unknown): Response {
  if (e instanceof ServisHatasi) return sayfa("Karar verilemedi", `<p>${kacis(e.message)}</p>`, e.durum);
  return sayfa("Karar verilemedi", "<p>Beklenmeyen bir sorun oldu. Kararı panelden verebilirsiniz.</p>", 500);
}

export async function GET(istek: Request): Promise<Response> {
  const g = gizli();
  if (!g) return kapali();
  const jeton = new URL(istek.url).searchParams.get("jeton") ?? "";
  try {
    const { db } = await tekiller();
    const o = await onay.baglantiOnizle(db, g, jeton, new Date());
    const ust = `<p><strong>${kacis(o.baslik)}</strong></p><p>Bu bağlantı ${kacis(o.kisiAd)} adına.</p>`;
    if (!o.durum.gecerli) return sayfa("Bağlantı kullanılamıyor", `${ust}<p>${kacis(o.durum.neden)}</p>`, 410);
    const son = new Date(o.son).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
    return sayfa(
      o.sonuc === "onaylandi" ? "Öneriyi onayla" : "Öneriyi reddet",
      `${ust}<p>Bu öneriyi ${SONUC_ADI[o.sonuc]} üzeresiniz. Karar adınızla ve bugünün tarihiyle kaydedilir; geri alınamaz.</p>
<p>Bağlantı ${kacis(son)} saatine kadar ve yalnız bir kez kullanılabilir.</p>
<form method="post"><input type="hidden" name="jeton" value="${kacis(jeton)}"><button type="submit">${
        o.sonuc === "onaylandi" ? "Onaylıyorum" : "Reddediyorum"
      }</button></form>`,
    );
  } catch (e) {
    return hataSayfasi(e);
  }
}

export async function POST(istek: Request): Promise<Response> {
  const g = gizli();
  if (!g) return kapali();
  let jeton = "";
  try {
    const f = await istek.formData();
    const j = f.get("jeton");
    jeton = typeof j === "string" ? j : "";
  } catch {
    jeton = "";
  }
  try {
    const { db } = await tekiller();
    const k = await onay.baglantiKullan(db, g, jeton, new Date());
    return sayfa(
      k.sonuc === "onaylandi" ? "Onaylandı" : "Reddedildi",
      "<p>Kararınız adınızla kaydedildi. Teşekkürler.</p>",
    );
  } catch (e) {
    return hataSayfasi(e);
  }
}
