"use client";

// Dönem devri ayarları (İP-38): kaynağa yazma izni ve tatil günleri. Gerçek kipte `/api/v1/bologna/...`
// uçlarına gider; izin ve tatil değişikliği sunucuda günlüğe kişinin adıyla yazılır. Örnek kipte kaydedilmez.

import { useEffect, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { useBildirim } from "../../../bilesenler/etkilesimli.tsx";
import { IsaretKutusu, MetinAlani, UzunMetinAlani } from "../../../bilesenler/form.tsx";
import { Kart } from "../../../bilesenler/temel.tsx";
import { GERCEK_VERI } from "../../../veri/kip.ts";
import { tarihYaz } from "../../../veri/yardimci.ts";

interface Izin {
  acik: boolean;
  gercekYazma: boolean;
  yaziSayisi: string;
  veren: string;
  zaman: string;
}

const GENEL_HATA = "Kaydedilemedi. Bağlantınızı denetleyip yeniden deneyin.";

async function iste<T>(
  yontem: string,
  yol: string,
  govde?: unknown,
): Promise<{ tamam: true; deger: T } | { tamam: false; hata: string }> {
  try {
    const y = await fetch(`/api/v1${yol}`, {
      method: yontem,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(govde === undefined ? {} : { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }),
      },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    });
    const v = (await y.json().catch(() => null)) as unknown;
    if (y.ok) return { tamam: true, deger: v as T };
    const h = (v as { hata?: unknown } | null)?.hata;
    return { tamam: false, hata: typeof h === "string" ? h : GENEL_HATA };
  } catch {
    return { tamam: false, hata: GENEL_HATA };
  }
}

/** Satır satır ya da virgülle yazılmış günleri ayırır. */
export function tatilleriAyir(metin: string): string[] {
  return metin
    .split(/[\s,;]+/u)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function DevirAyarlari() {
  const bildir = useBildirim();
  const [izin, setIzin] = useState<Izin | null>(null);
  const [form, setForm] = useState({ acik: false, gercekYazma: false, yaziSayisi: "", imzalayanAd: "" });
  const [tatil, setTatil] = useState("");
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!GERCEK_VERI) return;
    void iste<Izin | null>("GET", "/bologna/kaynaga-yazma-izni").then((s) => {
      if (s.tamam) {
        setIzin(s.deger);
        if (s.deger)
          setForm((f) => ({ ...f, acik: s.deger?.acik ?? false, gercekYazma: s.deger?.gercekYazma ?? false }));
      }
    });
    void iste<{ tatiller: string[] }>("GET", "/bologna/devir-ayarlari").then((s) => {
      if (s.tamam) setTatil(s.deger.tatiller.join("\n"));
    });
  }, []);

  const izinKaydet = async () => {
    if (!GERCEK_VERI) return bildir("Örnek veride izin kaydedilmez.", "bilgi");
    const s = await iste<Izin>("POST", "/bologna/kaynaga-yazma-izni", form);
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setIzin(s.deger);
    setForm((f) => ({ ...f, imzalayanAd: "" }));
    bildir("İzin kaydedildi ve günlüğe adınızla yazıldı.", "basari");
  };

  const tatilKaydet = async () => {
    if (!GERCEK_VERI) return bildir("Örnek veride tatil günleri kaydedilmez.", "bilgi");
    const s = await iste<{ tatiller: string[] }>("POST", "/bologna/devir-ayarlari", { tatiller: tatilleriAyir(tatil) });
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setTatil(s.deger.tatiller.join("\n"));
    bildir(`${s.deger.tatiller.length} tatil günü kaydedildi.`, "basari");
  };

  return (
    <Kart baslik="Dönem devri" className="xl:col-span-2">
      <div className="grid gap-6 md:grid-cols-2">
        <form
          className="space-y-3"
          aria-labelledby="yazma-izni"
          onSubmit={(e) => {
            e.preventDefault();
            void izinKaydet();
          }}
        >
          <h3 id="yazma-izni" className="text-lg font-semibold">
            Bilgi sistemine yazma izni
          </h3>
          <p className="text-sm text-soluk">
            {izin
              ? `Yürürlükteki kayıt: ${izin.acik ? "izin var" : "izin yok"}${izin.acik && !izin.gercekYazma ? " (yalnız deneme)" : ""}, yazı ${izin.yaziSayisi}, ${izin.veren}, ${tarihYaz(izin.zaman)}.`
              : "Kayıtlı izin yok. Onaylanan ders paketleri bilgi sistemine yazılmaz."}
          </p>
          <IsaretKutusu
            etiket="Kurumun yazılı izni var"
            checked={form.acik}
            onChange={(e) => setForm({ ...form, acik: e.currentTarget.checked })}
          />
          <IsaretKutusu
            etiket="Gerçekten yaz (kapalıyken yalnız neyin değişeceği raporlanır)"
            checked={form.gercekYazma}
            disabled={!form.acik}
            onChange={(e) => setForm({ ...form, gercekYazma: e.currentTarget.checked })}
          />
          <MetinAlani
            etiket="Yazılı iznin sayısı ve tarihi"
            value={form.yaziSayisi}
            onChange={(e) => setForm({ ...form, yaziSayisi: e.target.value })}
          />
          <MetinAlani
            etiket="Kaydetmek için adınızı yazın"
            value={form.imzalayanAd}
            onChange={(e) => setForm({ ...form, imzalayanAd: e.target.value })}
          />
          <Dugme type="submit" tur="birincil">
            İzni kaydet
          </Dugme>
        </form>
        <form
          className="space-y-3"
          aria-labelledby="tatil-gunleri"
          onSubmit={(e) => {
            e.preventDefault();
            void tatilKaydet();
          }}
        >
          <h3 id="tatil-gunleri" className="text-lg font-semibold">
            Tatil günleri
          </h3>
          <UzunMetinAlani
            etiket="Her satıra bir gün (YYYY-AA-GG)"
            ipucu="Bu günler itiraz süresinin iş günü hesabında sayılmaz. Resmî tatilleri sistem bilmez; siz girersiniz."
            value={tatil}
            onChange={(e) => setTatil(e.target.value)}
          />
          <Dugme type="submit" tur="birincil">
            Tatil günlerini kaydet
          </Dugme>
        </form>
      </div>
      {hata ? (
        <p role="alert" className="mt-3 font-semibold text-risk-yuksek">
          {hata}
        </p>
      ) : null}
    </Kart>
  );
}
