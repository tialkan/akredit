"use client";

// Kurumun OpenRouter anahtarı (BYOK). Anahtar yalnız gönderilir; sunucu onu şifreleyip saklar ve hiçbir
// yanıtta geri vermez. Ekranda yalnız son dört karakter görünür. Alan gönderimden sonra hemen boşaltılır.

import { useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { useBildirim } from "../../../bilesenler/etkilesimli.tsx";
import { MetinAlani } from "../../../bilesenler/form.tsx";
import { istemciVeriKaynagi } from "../../../veri/istemci.ts";
import type { Ayarlar, BaglantiSonucu } from "../../../veri/kaynak.ts";
import { tarihYaz } from "../../../veri/yardimci.ts";

export function YzAnahtari({ ayarlar, degisti }: { ayarlar: Ayarlar; degisti: (a: Ayarlar) => void }) {
  const kaynak = istemciVeriKaynagi();
  const bildir = useBildirim();
  const [anahtar, setAnahtar] = useState("");
  const [model, setModel] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [deneme, setDeneme] = useState<BaglantiSonucu | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const kayit = ayarlar.yzAnahtar;

  const kaydet = async () => {
    setBekliyor(true);
    const s = await kaynak.yzAnahtariKaydet(anahtar, model.trim() || undefined);
    setBekliyor(false);
    setAnahtar("");
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setDeneme(null);
    degisti(s.deger);
    bildir("Anahtar şifrelenerek kaydedildi.", "basari");
  };

  const dene = async () => {
    setBekliyor(true);
    const s = await kaynak.yzBaglantiDene();
    setBekliyor(false);
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setDeneme(s.deger);
  };

  const kaldir = async () => {
    const s = await kaynak.yzAnahtariKaldir();
    if (!s.tamam) return setHata(s.hata);
    setDeneme(null);
    degisti(s.deger);
    bildir("Anahtar kaldırıldı.", "basari");
  };

  return (
    <div className="mt-6 border-t border-cizgi pt-5">
      <h3 className="text-lg font-semibold">OpenRouter anahtarı</h3>
      <p className="mt-1 max-w-prose text-sm text-soluk">
        Kurumunuz kendi anahtarını getirir; kullanım ücreti OpenRouter hesabınıza yansır. Anahtar sunucuda şifreli
        saklanır, bu ekrana bir daha gelmez. Hesabınızda bir harcama sınırı koymanızı öneririz.
      </p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">Durum</dt>
        <dd>{kayit ? `Kayıtlı, sonu ${kayit.son4}` : "Anahtar girilmedi"}</dd>
        {kayit ? (
          <>
            <dt className="font-semibold">Model</dt>
            <dd>{kayit.model}</dd>
            <dt className="font-semibold">Kaydeden</dt>
            <dd>
              {kayit.kaydeden}, {tarihYaz(kayit.kayitZamani)}
            </dd>
          </>
        ) : null}
      </dl>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void kaydet();
        }}
      >
        <MetinAlani
          etiket={kayit ? "Yeni anahtar (eskisinin yerine geçer)" : "Anahtar"}
          type="password"
          autoComplete="off"
          spellCheck={false}
          ipucu="sk-or- ile başlar. openrouter.ai adresinde Keys bölümünden alınır."
          hata={hata}
          value={anahtar}
          onChange={(e) => setAnahtar(e.target.value)}
          required
        />
        <MetinAlani
          etiket="Model (isteğe bağlı)"
          ipucu="Boş bırakılırsa openrouter/auto kullanılır."
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Dugme type="submit" tur="birincil" disabled={bekliyor || !anahtar}>
            Anahtarı kaydet
          </Dugme>
          <Dugme tur="ikincil" disabled={bekliyor || !kayit} onClick={() => void dene()}>
            Bağlantıyı dene
          </Dugme>
          {kayit ? (
            <Dugme tur="tehlike" disabled={bekliyor} onClick={() => void kaldir()}>
              Anahtarı kaldır
            </Dugme>
          ) : null}
        </div>
      </form>
      <p aria-live="polite" className="mt-3 text-sm font-semibold">
        {deneme ? `${deneme.tamam ? "Başarılı" : "Olmadı"}: ${deneme.ileti}` : ""}
      </p>
    </div>
  );
}
