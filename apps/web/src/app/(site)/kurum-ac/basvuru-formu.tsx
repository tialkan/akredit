"use client";

// "Kurumunuzu açın" başvuru formu (İP-35). Sunucu her alanı yeniden doğrular; buradaki denetim kolaylıktır.
// Bal küpü alanı gerçek kullanıcıya görünmez ve ekran okuyucudan gizlidir.

import { Building2 } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani } from "../../../bilesenler/form.tsx";

type Alan = "kurumAdi" | "alanAdi" | "yoneticiAdi" | "eposta";
type Durum =
  | { tur: "bos" }
  | { tur: "gonderiliyor" }
  | { tur: "gonderildi"; eposta: string }
  | { tur: "hata"; ileti: string; alanlar: Partial<Record<Alan, string>> };

export function BasvuruFormu() {
  const [degerler, setDegerler] = useState<Record<Alan, string>>({
    kurumAdi: "",
    alanAdi: "",
    yoneticiAdi: "",
    eposta: "",
  });
  const [bal, setBal] = useState("");
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });
  const acilis = useRef(0);
  useEffect(() => {
    acilis.current = Date.now();
  }, []);

  const degistir = (a: Alan) => (e: { target: { value: string } }) =>
    setDegerler((d) => ({ ...d, [a]: e.target.value }));

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setDurum({ tur: "gonderiliyor" });
    try {
      const y = await fetch("/api/kurum-acilisi", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...degerler, ...(bal ? { webSitesi: bal } : {}), acilis: acilis.current }),
      });
      const v = (await y.json().catch(() => null)) as {
        hata?: string;
        alanlar?: { alan: string; ileti: string }[];
      } | null;
      if (y.ok) return setDurum({ tur: "gonderildi", eposta: degerler.eposta.trim() });
      const alanlar: Partial<Record<Alan, string>> = {};
      for (const a of v?.alanlar ?? []) if (a.alan in degerler) alanlar[a.alan as Alan] = a.ileti;
      setDurum({ tur: "hata", ileti: v?.hata ?? "Başvuru gönderilemedi. Yeniden deneyin.", alanlar });
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin.", alanlar: {} });
    }
  }

  if (durum.tur === "gonderildi")
    return (
      <div role="status" className="rounded-sm border border-cizgi bg-zemin px-5 py-4">
        <p className="font-semibold">Doğrulama bağlantısı gönderildi.</p>
        <p className="mt-2">
          {durum.eposta} adresine gelen bağlantıyı 30 dakika içinde açın. Bağlantıyı açınca kurumunuz açılır ve giriş
          bağlantınız gönderilir.
        </p>
      </div>
    );

  const hata = durum.tur === "hata" ? durum : null;
  return (
    <form className="max-w-xl space-y-5" onSubmit={gonder} noValidate={false}>
      <MetinAlani
        etiket="Kurumun adı"
        name="kurumAdi"
        autoComplete="organization"
        required
        minLength={3}
        value={degerler.kurumAdi}
        onChange={degistir("kurumAdi")}
        hata={hata?.alanlar.kurumAdi ?? null}
      />
      <MetinAlani
        etiket="Kurumsal e-posta alan adı"
        name="alanAdi"
        ipucu="Örnek: ornek.edu.tr. Yönetici e-postası bu alan adında olmalı."
        required
        spellCheck={false}
        autoCapitalize="none"
        value={degerler.alanAdi}
        onChange={degistir("alanAdi")}
        hata={hata?.alanlar.alanAdi ?? null}
      />
      <MetinAlani
        etiket="İlk yöneticinin adı ve soyadı"
        name="yoneticiAdi"
        autoComplete="name"
        required
        minLength={3}
        value={degerler.yoneticiAdi}
        onChange={degistir("yoneticiAdi")}
        hata={hata?.alanlar.yoneticiAdi ?? null}
      />
      <MetinAlani
        etiket="İlk yöneticinin kurumsal e-postası"
        name="eposta"
        type="email"
        autoComplete="email"
        required
        value={degerler.eposta}
        onChange={degistir("eposta")}
        hata={hata?.alanlar.eposta ?? null}
      />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="web-sitesi">Bu alanı boş bırakın</label>
        <input
          id="web-sitesi"
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
        simge={<Building2 aria-hidden className="size-5" />}
      >
        Doğrulama bağlantısı gönder
      </Dugme>
      <p role="alert" className="text-sm font-semibold text-risk-yuksek">
        {hata ? hata.ileti : ""}
      </p>
      <p aria-live="polite" className="text-sm">
        {durum.tur === "gonderiliyor" ? "Gönderiliyor…" : ""}
      </p>
    </form>
  );
}
