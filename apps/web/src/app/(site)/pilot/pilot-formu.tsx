"use client";

// Pilot kurum başvuru formu (İP-42). Sunucu her alanı yeniden doğrular (src/pilot/basvuru.ts); buradaki denetim
// kolaylıktır. Bal küpü alanı gerçek kullanıcıya görünmez ve ekran okuyucudan gizlidir.

import { Send } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { IsaretKutusu, MetinAlani, Secim, UzunMetinAlani } from "../../../bilesenler/form.tsx";

type Alan = "kurum" | "birim" | "rol" | "eposta" | "surec" | "aciklama";
type Durum =
  | { tur: "bos" }
  | { tur: "gonderiliyor" }
  | { tur: "gonderildi" }
  | { tur: "hata"; ileti: string; alanlar: Partial<Record<Alan | "kvkk", string>> };

interface Secenek {
  deger: string;
  ad: string;
}

export function PilotFormu({ roller, surecler }: { roller: readonly Secenek[]; surecler: readonly Secenek[] }) {
  const [degerler, setDegerler] = useState<Record<Alan, string>>({
    kurum: "",
    birim: "",
    rol: "",
    eposta: "",
    surec: "",
    aciklama: "",
  });
  const [kvkk, setKvkk] = useState(false);
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
      const { aciklama, ...digerleri } = degerler;
      const y = await fetch("/api/pilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...digerleri,
          ...(aciklama.trim() ? { aciklama } : {}),
          kvkk,
          ...(bal ? { webSitesi: bal } : {}),
          acilis: acilis.current,
        }),
      });
      const v = (await y.json().catch(() => null)) as {
        hata?: string;
        alanlar?: { alan: string; ileti: string }[];
      } | null;
      if (y.ok) return setDurum({ tur: "gonderildi" });
      const alanlar: Partial<Record<Alan | "kvkk", string>> = {};
      for (const a of v?.alanlar ?? []) if (a.alan in degerler || a.alan === "kvkk") alanlar[a.alan as Alan] = a.ileti;
      setDurum({ tur: "hata", ileti: v?.hata ?? "Başvuru gönderilemedi. Yeniden deneyin.", alanlar });
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin.", alanlar: {} });
    }
  }

  if (durum.tur === "gonderildi")
    return (
      <div role="status" className="max-w-xl rounded-sm border border-cizgi bg-yuzey px-5 py-4">
        <p className="font-semibold">Başvurunuz alındı.</p>
        <p className="mt-2">Kurumsal e-posta adresinize dönüş yapılacak. Ayrıca bir şey yapmanız gerekmez.</p>
      </div>
    );

  const hata = durum.tur === "hata" ? durum : null;
  return (
    <form className="max-w-xl space-y-5" onSubmit={gonder}>
      <MetinAlani
        etiket="Kurumun adı"
        name="kurum"
        autoComplete="organization"
        required
        minLength={3}
        maxLength={200}
        value={degerler.kurum}
        onChange={degistir("kurum")}
        hata={hata?.alanlar.kurum ?? null}
      />
      <MetinAlani
        etiket="Birim"
        name="birim"
        ipucu="Örnek: Mühendislik Fakültesi, Kalite Koordinatörlüğü."
        required
        minLength={2}
        maxLength={200}
        value={degerler.birim}
        onChange={degistir("birim")}
        hata={hata?.alanlar.birim ?? null}
      />
      <Secim
        etiket="Rolünüz"
        name="rol"
        required
        value={degerler.rol}
        onChange={degistir("rol")}
        hata={hata?.alanlar.rol ?? null}
      >
        <option value="">Seçin</option>
        {roller.map((r) => (
          <option key={r.deger} value={r.deger}>
            {r.ad}
          </option>
        ))}
      </Secim>
      <MetinAlani
        etiket="Kurumsal e-posta"
        name="eposta"
        type="email"
        autoComplete="email"
        ipucu="Genel e-posta hizmetleri kabul edilmez."
        required
        value={degerler.eposta}
        onChange={degistir("eposta")}
        hata={hata?.alanlar.eposta ?? null}
      />
      <Secim
        etiket="Hangi süreçle başlamak istersiniz"
        name="surec"
        required
        value={degerler.surec}
        onChange={degistir("surec")}
        hata={hata?.alanlar.surec ?? null}
      >
        <option value="">Seçin</option>
        {surecler.map((s) => (
          <option key={s.deger} value={s.deger}>
            {s.ad}
          </option>
        ))}
      </Secim>
      <UzunMetinAlani
        etiket="Not (isteğe bağlı)"
        name="aciklama"
        maxLength={1000}
        rows={3}
        ipucu="Öğrenci ya da kişi bilgisi yazmayın."
        value={degerler.aciklama}
        onChange={degistir("aciklama")}
        hata={hata?.alanlar.aciklama ?? null}
      />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="pilot-web-sitesi">Bu alanı boş bırakın</label>
        <input
          id="pilot-web-sitesi"
          name="webSitesi"
          tabIndex={-1}
          autoComplete="off"
          value={bal}
          onChange={(e) => setBal(e.target.value)}
        />
      </div>
      <IsaretKutusu
        name="kvkk"
        required
        checked={kvkk}
        onChange={(e) => setKvkk(e.target.checked)}
        etiket="Bu bilgilerin pilot başvurusunu değerlendirmek ve bana dönmek için işlenmesini kabul ediyorum."
        ipucu={
          <>
            Bilgiler yalnız bu amaçla kullanılır. Ayrıntı:{" "}
            <Link href="/kvkk" className="underline underline-offset-4">
              Kişisel verilerin korunması
            </Link>
            .
          </>
        }
      />
      {hata?.alanlar.kvkk ? <p className="text-sm font-semibold text-risk-yuksek">{hata.alanlar.kvkk}</p> : null}
      <Dugme
        tur="birincil"
        type="submit"
        disabled={durum.tur === "gonderiliyor"}
        simge={<Send aria-hidden className="size-5" />}
      >
        Başvuruyu gönder
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
