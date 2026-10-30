"use client";

// Hesapsız belge yükleme formu (İP-45). Sunucu her şeyi yeniden denetler (api/istek/_ortak.ts); buradaki boyut
// denetimi kolaylıktır. Bal küpü alanı gerçek kullanıcıya görünmez ve ekran okuyucudan gizlidir.

import { Upload } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani, UzunMetinAlani } from "../../../bilesenler/form.tsx";

type Durum =
  | { tur: "bos" }
  | { tur: "gonderiliyor" }
  | { tur: "gonderildi"; ornek: boolean }
  | { tur: "hata"; ileti: string };

export function YuklemeFormu({ jeton, kabul, enBuyukMb }: { jeton: string; kabul: string; enBuyukMb: number }) {
  const [dosya, setDosya] = useState<File | null>(null);
  const [aciklama, setAciklama] = useState("");
  const [bal, setBal] = useState("");
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });
  const acilis = useRef(0);
  useEffect(() => {
    acilis.current = Date.now();
  }, []);

  async function gonder(e: FormEvent) {
    e.preventDefault();
    if (!dosya) return setDurum({ tur: "hata", ileti: "Yüklenecek dosyayı seçin." });
    if (dosya.size > enBuyukMb * 1048576)
      return setDurum({ tur: "hata", ileti: `Dosya çok büyük. En çok ${enBuyukMb} MB yüklenebilir.` });
    setDurum({ tur: "gonderiliyor" });
    const f = new FormData();
    f.set("j", jeton);
    f.set("dosya", dosya);
    if (aciklama.trim()) f.set("aciklama", aciklama);
    if (bal) f.set("webSitesi", bal);
    f.set("acilis", String(acilis.current));
    try {
      const y = await fetch("/api/istek/yukle", { method: "POST", credentials: "omit", body: f });
      const v = (await y.json().catch(() => null)) as { hata?: string; ornek?: boolean } | null;
      if (y.ok) return setDurum({ tur: "gonderildi", ornek: Boolean(v?.ornek) });
      setDurum({ tur: "hata", ileti: v?.hata ?? "Belge gönderilemedi. Yeniden deneyin." });
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." });
    }
  }

  if (durum.tur === "gonderildi")
    return (
      <div role="status" className="rounded-sm border border-cizgi bg-yuzey px-4 py-4">
        <p className="font-semibold">{durum.ornek ? "Örnek gönderim tamam." : "Belgeniz alındı."}</p>
        <p className="mt-2">
          {durum.ornek
            ? "Bu bir örnek sayfa olduğu için dosya kaydedilmedi."
            : "Kalite komisyonu belgeyi inceleyecek. Ayrıca bir şey yapmanız gerekmez; bu sayfayı kapatabilirsiniz."}
        </p>
      </div>
    );

  return (
    <form className="space-y-5" onSubmit={gonder}>
      <MetinAlani
        etiket="Dosya"
        name="dosya"
        type="file"
        required
        accept={kabul}
        ipucu={`Kabul edilen türler: ${kabul}. En çok ${enBuyukMb} MB.`}
        onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
      />
      <UzunMetinAlani
        etiket="Kısa not (isteğe bağlı)"
        name="aciklama"
        maxLength={1000}
        rows={3}
        ipucu="Belgeyle ilgili açıklama. Öğrenci ya da kişi bilgisi yazmayın."
        value={aciklama}
        onChange={(e) => setAciklama(e.target.value)}
      />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="istek-web-sitesi">Bu alanı boş bırakın</label>
        <input
          id="istek-web-sitesi"
          name="webSitesi"
          tabIndex={-1}
          autoComplete="off"
          value={bal}
          onChange={(e) => setBal(e.target.value)}
        />
      </div>
      <Dugme
        tur="birincil"
        type="submit"
        disabled={durum.tur === "gonderiliyor"}
        simge={<Upload aria-hidden className="size-5" />}
      >
        Belgeyi gönder
      </Dugme>
      <p role="alert" className="text-sm font-semibold text-risk-yuksek">
        {durum.tur === "hata" ? durum.ileti : ""}
      </p>
      <p aria-live="polite" className="text-sm">
        {durum.tur === "gonderiliyor" ? "Gönderiliyor…" : ""}
      </p>
    </form>
  );
}
