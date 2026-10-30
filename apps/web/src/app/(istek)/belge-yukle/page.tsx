// Hesapsız belge yükleme sayfası (İP-45). Giriş, parola ya da çerez istemez: bağlantı tek kullanımlık, süreli ve
// imzalıdır. Sayfa yalnız ne istendiğini gösterir; GET hiçbir şey kaydetmez (e-posta ön izlemesi bağlantıyı
// tüketmesin). Örnek: /belge-yukle?j=ornek (hiçbir şey kaydedilmez).

import { belgeIstegi } from "@akredit/servis";
import type { Metadata } from "next";
import { gercekVeriMi, tekiller } from "../../api/_ortak/sunucu.ts";
import { istekGizlisi, ORNEK_JETON } from "../../api/istek/_ortak.ts";
import { YuklemeFormu } from "./form.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Belge yükleme",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Onizleme = belgeIstegi.IstekOnizlemesi;

const ORNEK: Onizleme = {
  istenen: "2025 yılı personel hizmet içi eğitim planı ve katılım listesi",
  isteyenAd: "Örnek Kalite Komisyonu Üyesi",
  kurumAdi: "Örnek Üniversitesi",
  birimAdi: "Personel Daire Başkanlığı",
  son: "2026-11-15T21:00:00.000Z",
  durum: { gecerli: true },
};

async function onizle(j: string): Promise<Onizleme | { hata: string }> {
  if (j === ORNEK_JETON) return ORNEK;
  const gizli = istekGizlisi();
  if (!gercekVeriMi() || !gizli) return { hata: "Belge yükleme şu an kullanılamıyor. Belgeyi isteyen kişiye yazın." };
  try {
    const { db } = await tekiller();
    return await belgeIstegi.istekOnizle(db, gizli, j, new Date());
  } catch (e) {
    return {
      hata: e instanceof Error && "kod" in e ? e.message : "Bu bağlantı açılamadı. Belgeyi isteyen kişiye yazın.",
    };
  }
}

function Kutu({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <main id="icerik" className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm text-soluk">Akredit</p>
      <h1 className="mt-1 text-2xl font-bold">{baslik}</h1>
      {children}
    </main>
  );
}

export default async function BelgeYukleSayfasi({ searchParams }: { searchParams: Promise<{ j?: string }> }) {
  const { j = "" } = await searchParams;
  const o = await onizle(j);
  if ("hata" in o)
    return (
      <Kutu baslik="Bağlantı açılamadı">
        <p className="mt-4">{o.hata}</p>
      </Kutu>
    );
  const son = new Date(o.son).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "long" });
  return (
    <Kutu baslik="Belge yükleme">
      <dl className="mt-6 space-y-3 rounded-sm border border-cizgi bg-yuzey px-4 py-4">
        <div>
          <dt className="text-sm text-soluk">İstenen belge</dt>
          <dd className="font-semibold">{o.istenen}</dd>
        </div>
        <div>
          <dt className="text-sm text-soluk">İsteyen</dt>
          <dd>
            {o.isteyenAd}
            {o.kurumAdi ? `, ${o.kurumAdi}` : ""}
          </dd>
        </div>
        {o.birimAdi ? (
          <div>
            <dt className="text-sm text-soluk">İstenen birim</dt>
            <dd>{o.birimAdi}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-sm text-soluk">Son tarih</dt>
          <dd>{son}</dd>
        </div>
      </dl>
      {o.durum.gecerli ? (
        <>
          <p className="mt-6 text-sm">
            Hesap ya da parola gerekmez. Bağlantı yalnız bir kez kullanılabilir. Yüklediğiniz belge, kalite komisyonu
            inceleyip kabul edene kadar kanıt sayılmaz.
          </p>
          {j === ORNEK_JETON ? (
            <p className="mt-2 text-sm font-semibold">Bu bir örnek sayfadır; yüklenen dosya kaydedilmez.</p>
          ) : null}
          <div className="mt-6">
            <YuklemeFormu jeton={j} kabul={belgeIstegi.KABUL_EDILEN} enBuyukMb={belgeIstegi.EN_BUYUK_DOSYA / 1048576} />
          </div>
        </>
      ) : (
        <p role="alert" className="mt-6 font-semibold">
          {o.durum.neden}
        </p>
      )}
    </Kutu>
  );
}
