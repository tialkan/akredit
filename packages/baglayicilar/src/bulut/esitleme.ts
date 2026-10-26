// Google Drive ve OneDrive klasör eşitleme (salt okuma).
// Klasördeki (ve alt klasörlerdeki) yeni ya da değişmiş dosyalar kanıt girdisi olur. Değişen dosya yeni kanıttır;
// eski kanıt silinmez (değiştirilemez kayıt). Bulutta silinen dosya yalnız durumdan düşer, kanıt kalır.
// Yanıt şekilleri sağlayıcıların herkese açık API belgelerine göre yazıldı; kayıtlı örnekler kurgudur ve
// canlı hesaptan alınmadı. DOĞRULANMADI. Kapsamlar: Drive "drive.readonly", Graph "Files.Read".

import { z } from "zod";
import type { DisBaglam, Kaynak } from "../baglayici.ts";
import { BaglayiciHatasi, istek, type KullanimKosulu, sinirlayici } from "../avesis/istek.ts";
import type { BaglayiciKanitGirdisi } from "../ebys/kanit.ts";
import type { OAuthSaglayici } from "./belirtec.ts";

export const BULUT_KOSULU: Record<OAuthSaglayici, KullanimKosulu> = {
  google: {
    kaynak: "Google Drive API",
    durum: "DOĞRULANMADI",
    not: "Kullanıcının OAuth onayıyla yalnız okuma kapsamı. Google API Hizmet Koşulları, kota ve uygulama doğrulama gereksinimleri DOĞRULANMADI.",
    enAzAralikMs: 200,
  },
  microsoft: {
    kaynak: "Microsoft Graph (OneDrive)",
    durum: "DOĞRULANMADI",
    not: "Kullanıcının OAuth onayıyla Files.Read kapsamı. Microsoft API Kullanım Koşulları ve kısıtlama (throttling) sınırları DOĞRULANMADI.",
    enAzAralikMs: 200,
  },
};

const GDRIVE = "https://www.googleapis.com/drive/v3";
const GRAPH = "https://graph.microsoft.com/v1.0";
const KLASOR_MIME = "application/vnd.google-apps.folder";
/** Google'ın kendi biçimleri dışa aktarılarak alınır. */
const GOOGLE_DISA: Record<string, { mime: string; uzanti: string }> = {
  "application/vnd.google-apps.document": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    uzanti: "docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    uzanti: "xlsx",
  },
  "application/vnd.google-apps.presentation": { mime: "application/pdf", uzanti: "pdf" },
};

const DriveListesi = z.object({
  nextPageToken: z.string().optional(),
  files: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      mimeType: z.string(),
      md5Checksum: z.string().optional(),
      modifiedTime: z.string().optional(),
      size: z.string().optional(),
    }),
  ),
});

const GraphListesi = z.object({
  "@odata.nextLink": z.string().optional(),
  value: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      eTag: z.string().optional(),
      cTag: z.string().optional(),
      size: z.number().optional(),
      lastModifiedDateTime: z.string().optional(),
      folder: z.object({}).passthrough().optional(),
      file: z.object({ mimeType: z.string().optional() }).passthrough().optional(),
    }),
  ),
});

/** Önceki eşitlemenin durumu: dosya kimliği → sürüm imi. Kurum ayarında saklanır. */
export type EsitlemeDurumu = Record<string, string>;

export interface EsitlemeSecenegi {
  enBuyukDosya?: number;
  enCokDosya?: number;
  enDerin?: number;
}

export interface EsitlemeSonucu {
  girdiler: BaglayiciKanitGirdisi[];
  durum: EsitlemeDurumu;
  kaynaklar: Kaynak[];
  uyarilar: string[];
  /** Bulutta artık bulunmayan dosyalar (kanıt silinmez). */
  kaybolan: string[];
}

interface Oge {
  id: string;
  ad: string;
  yol: string;
  surum: string;
  boyut: number | null;
  mime: string | null;
  indir: string;
  disaMime?: string;
}

const temizAd = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 200) || "adsiz";

async function json<T>(y: Response, sema: z.ZodType<T>): Promise<T> {
  const d = sema.safeParse(await y.json().catch(() => null));
  if (!d.success) throw new BaglayiciHatasi("Bulut hizmetinin yanıtı beklenen biçimde değil; daha sonra yeniden deneyin.");
  return d.data;
}

/** Klasörü eşitler. `erisim` geçerli erişim belirtecidir (gecerliBelirtec ile alınır); günlüğe yazılmaz. */
export async function klasorEsitle(
  saglayici: OAuthSaglayici,
  klasorId: string,
  erisim: string,
  onceki: EsitlemeDurumu,
  baglam: DisBaglam,
  secenek: EsitlemeSecenegi = {},
): Promise<EsitlemeSonucu> {
  if (!/^[A-Za-z0-9!_.-]{1,200}$/.test(klasorId)) throw new BaglayiciHatasi("Klasör kimliği geçersiz.");
  const enBuyuk = secenek.enBuyukDosya ?? 50 * 1024 * 1024;
  const enCok = secenek.enCokDosya ?? 1000;
  const enDerin = secenek.enDerin ?? 5;
  const sinir = sinirlayici(baglam, BULUT_KOSULU[saglayici].enAzAralikMs);
  const basliklar = { authorization: `Bearer ${erisim}` };
  const al = async (adres: string) => {
    try {
      return await istek(baglam, sinir, adres, { basliklar });
    } catch (e) {
      if (e instanceof BaglayiciHatasi && /HTTP 401|HTTP 403/.test(e.message))
        throw new BaglayiciHatasi("Bulut hesabına erişim izni yok ya da süresi doldu; hesabı yeniden bağlayın.");
      throw e;
    }
  };

  const ogeler: Oge[] = [];
  const uyarilar: string[] = [];
  const kuyruk: { id: string; yol: string; derinlik: number }[] = [{ id: klasorId, yol: "", derinlik: 0 }];
  while (kuyruk.length) {
    const k = kuyruk.shift() as { id: string; yol: string; derinlik: number };
    if (saglayici === "google") {
      let sayfa: string | undefined;
      do {
        const q = new URLSearchParams({
          q: `'${k.id}' in parents and trashed = false`,
          fields: "nextPageToken,files(id,name,mimeType,md5Checksum,modifiedTime,size)",
          pageSize: "100",
          ...(sayfa ? { pageToken: sayfa } : {}),
        });
        const l = await json(await al(`${GDRIVE}/files?${q}`), DriveListesi);
        for (const f of l.files) {
          const yol = `${k.yol}${temizAd(f.name)}`;
          if (f.mimeType === KLASOR_MIME) {
            if (k.derinlik + 1 <= enDerin) kuyruk.push({ id: f.id, yol: `${yol}/`, derinlik: k.derinlik + 1 });
            else uyarilar.push(`${yol}: klasör çok derinde, atlandı.`);
            continue;
          }
          const disa = GOOGLE_DISA[f.mimeType];
          if (f.mimeType.startsWith("application/vnd.google-apps.") && !disa) {
            uyarilar.push(`${yol}: bu Google dosya türü alınamıyor.`);
            continue;
          }
          const id = encodeURIComponent(f.id);
          ogeler.push({
            id: f.id,
            ad: disa ? `${temizAd(f.name)}.${disa.uzanti}` : temizAd(f.name),
            yol: disa ? `${yol}.${disa.uzanti}` : yol,
            surum: f.md5Checksum ?? f.modifiedTime ?? "",
            boyut: f.size ? Number(f.size) : null,
            mime: disa?.mime ?? f.mimeType,
            indir: disa
              ? `${GDRIVE}/files/${id}/export?mimeType=${encodeURIComponent(disa.mime)}`
              : `${GDRIVE}/files/${id}?alt=media`,
          });
        }
        sayfa = l.nextPageToken;
      } while (sayfa);
    } else {
      let adres: string | undefined =
        `${GRAPH}/me/drive/items/${encodeURIComponent(k.id)}/children?$select=id,name,eTag,cTag,size,lastModifiedDateTime,folder,file&$top=200`;
      while (adres) {
        if (!adres.startsWith(`${GRAPH}/`)) throw new BaglayiciHatasi("Bulut hizmetinin yanıtı beklenen biçimde değil.");
        const l: z.infer<typeof GraphListesi> = await json(await al(adres), GraphListesi);
        for (const f of l.value) {
          const yol = `${k.yol}${temizAd(f.name)}`;
          if (f.folder) {
            if (k.derinlik + 1 <= enDerin) kuyruk.push({ id: f.id, yol: `${yol}/`, derinlik: k.derinlik + 1 });
            else uyarilar.push(`${yol}: klasör çok derinde, atlandı.`);
            continue;
          }
          if (!f.file) continue;
          ogeler.push({
            id: f.id,
            ad: temizAd(f.name),
            yol,
            surum: f.cTag ?? f.eTag ?? f.lastModifiedDateTime ?? "",
            boyut: f.size ?? null,
            mime: f.file.mimeType ?? null,
            indir: `${GRAPH}/me/drive/items/${encodeURIComponent(f.id)}/content`,
          });
        }
        adres = l["@odata.nextLink"];
      }
    }
  }

  const durum: EsitlemeDurumu = {};
  const girdiler: BaglayiciKanitGirdisi[] = [];
  const kaynaklar: Kaynak[] = [];
  let alinan = 0;
  for (const o of ogeler) {
    durum[o.id] = o.surum;
    if (o.surum && onceki[o.id] === o.surum) continue;
    if (o.boyut !== null && o.boyut > enBuyuk) {
      uyarilar.push(`${o.yol}: dosya çok büyük, alınmadı.`);
      delete durum[o.id]; // sonraki eşitlemede yeniden denensin
      continue;
    }
    if (alinan >= enCok) {
      uyarilar.push("Dosya sayısı sınırına ulaşıldı; kalanlar sonraki eşitlemede alınacak.");
      delete durum[o.id];
      continue;
    }
    const veri = new Uint8Array(await (await al(o.indir)).arrayBuffer());
    if (veri.byteLength > enBuyuk) {
      uyarilar.push(`${o.yol}: dosya çok büyük, alınmadı.`);
      delete durum[o.id];
      continue;
    }
    alinan++;
    const g: BaglayiciKanitGirdisi = {
      veri,
      dosyaAdi: o.ad,
      kaynakTuru: "baglayici",
      kaynakAyrinti: { baglayici: saglayici === "google" ? "google-drive" : "onedrive", dosyaId: o.id, yol: o.yol.slice(0, 400), surum: o.surum.slice(0, 200) },
    };
    if (o.mime) g.mime = o.mime;
    girdiler.push(g);
    kaynaklar.push({ adres: o.indir, okunma: baglam.simdi().toISOString(), aciklama: o.yol });
  }
  const kaybolan = Object.keys(onceki).filter((id) => !(id in durum) && !ogeler.some((o) => o.id === id));
  return { girdiler, durum, kaynaklar, uyarilar, kaybolan };
}
