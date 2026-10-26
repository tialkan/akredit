// Yapılandırılmış çıktı: zod şeması → JSON şema; yerel destek yoksa istem + ayrıştırma.
// Geçersiz çıktıda hata iletisiyle en çok 2 onarım denemesi, sonra InsanGerekliHatasi.
import { z } from "zod";
import { InsanGerekliHatasi, type Mesaj, type Saglayici, type SohbetYaniti } from "./saglayici.ts";

export const ONARIM_SINIRI = 2;

export interface YapilandirilmisIstek<T extends z.ZodType> {
  saglayici: Saglayici;
  mesajlar: Mesaj[];
  sema: T;
  /** Şema adı (ASCII). */
  ad: string;
  sicaklik?: number;
  sinyal?: AbortSignal;
  /** Her model çağrısından sonra (ölçüm için). */
  cagriSonrasi?: (yanit: SohbetYaniti, sureMs: number) => void;
  simdi?: () => number;
}

export interface YapilandirilmisSonuc<T> {
  veri: T;
  onarimSayisi: number;
}

export function jsonSemaOlustur(sema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(sema) as Record<string, unknown>;
}

/** Model metninden JSON'u çıkarır: kod çiti, baştaki/sondaki açıklamalar. */
export function jsonAyikla(metin: string): unknown {
  const cit = metin.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const aday = (cit?.[1] ?? metin).trim();
  try {
    return JSON.parse(aday);
  } catch {
    const bas = aday.search(/[{[]/u);
    const son = Math.max(aday.lastIndexOf("}"), aday.lastIndexOf("]"));
    if (bas >= 0 && son > bas) return JSON.parse(aday.slice(bas, son + 1));
    throw new SyntaxError("Yanıtta JSON bulunamadı.");
  }
}

function hataOzeti(e: unknown): string {
  if (e instanceof z.ZodError)
    return e.issues
      .slice(0, 10)
      .map((i) => `${i.path.join(".") || "(kök)"}: ${i.message}`)
      .join("; ");
  return e instanceof Error ? e.message : String(e);
}

export async function yapilandirilmisCagri<T extends z.ZodType>(
  istek: YapilandirilmisIstek<T>,
): Promise<YapilandirilmisSonuc<z.infer<T>>> {
  const jsonSema = jsonSemaOlustur(istek.sema);
  const simdi = istek.simdi ?? Date.now;
  const mesajlar: Mesaj[] = [...istek.mesajlar];
  if (!istek.saglayici.yapilandirilmisCikti)
    mesajlar.push({
      rol: "sistem",
      icerik: `Yanıtını yalnız şu JSON şemasına uyan tek bir JSON nesnesi olarak ver, başka metin ekleme:\n${JSON.stringify(jsonSema)}`,
    });
  let sonHata = "";
  for (let deneme = 0; deneme <= ONARIM_SINIRI; deneme++) {
    const bas = simdi();
    const yanit = await istek.saglayici.sohbet({
      mesajlar,
      jsonSema: { ad: istek.ad, sema: jsonSema },
      sicaklik: istek.sicaklik ?? 0,
      ...(istek.sinyal ? { sinyal: istek.sinyal } : {}),
    });
    istek.cagriSonrasi?.(yanit, simdi() - bas);
    try {
      const veri = istek.sema.parse(jsonAyikla(yanit.icerik)) as z.infer<T>;
      return { veri, onarimSayisi: deneme };
    } catch (e) {
      sonHata = hataOzeti(e);
      mesajlar.push(
        { rol: "asistan", icerik: yanit.icerik },
        {
          rol: "kullanici",
          icerik: `Yanıtın şemaya uymuyor: ${sonHata}\nYalnız şemaya uyan düzeltilmiş JSON nesnesini ver.`,
        },
      );
    }
  }
  throw new InsanGerekliHatasi(
    "Yapay zekâ bu iş için güvenilir bir sonuç üretemedi. Bir kişinin incelemesi gerekiyor.",
    sonHata,
  );
}
