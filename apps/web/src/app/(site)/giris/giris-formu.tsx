"use client";

// Giriş formu: e-postaya tek kullanımlık bağlantı ya da kurumsal tek oturum (OIDC/SAML). Parola yoktur.
// Örnek veri kipinde (gerçek veritabanı bağlı değilken) düğmeler kapalıdır.

import { Building2, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani } from "../../../bilesenler/form.tsx";

const ACIK = process.env.NEXT_PUBLIC_AKREDIT_VERI === "gercek";

type Durum = { tur: "bos" } | { tur: "gonderiliyor" } | { tur: "gonderildi" } | { tur: "hata"; ileti: string };

async function gonder(yol: string, eposta: string): Promise<Response> {
  return fetch(`/api/kimlik${yol}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: eposta, callbackURL: "/panel" }),
  });
}

export function GirisFormu() {
  const [eposta, setEposta] = useState("");
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });

  async function baglantiIste(e: FormEvent) {
    e.preventDefault();
    setDurum({ tur: "gonderiliyor" });
    try {
      const y = await gonder("/sign-in/magic-link", eposta.trim());
      setDurum(
        y.ok
          ? { tur: "gonderildi" }
          : { tur: "hata", ileti: "Bağlantı gönderilemedi. Adresi denetleyin ya da kurum yöneticinizden davet isteyin." },
      );
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." });
    }
  }

  async function kurumsal() {
    if (!eposta.trim()) {
      setDurum({ tur: "hata", ileti: "Kurum hesabınızı bulmak için önce e-posta adresinizi yazın." });
      return;
    }
    setDurum({ tur: "gonderiliyor" });
    try {
      const y = await gonder("/sign-in/sso", eposta.trim());
      const v = (await y.json().catch(() => null)) as { url?: unknown } | null;
      if (y.ok && typeof v?.url === "string") {
        window.location.assign(v.url);
        return;
      }
      setDurum({ tur: "hata", ileti: "Kurumunuz için tek oturum tanımlı değil. E-posta bağlantısıyla giriş yapın." });
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." });
    }
  }

  const mesgul = durum.tur === "gonderiliyor";
  return (
    <>
      {ACIK ? null : (
        <p
          role="note"
          className="mt-4 rounded-md border border-risk-orta bg-risk-orta-zemin px-3 py-2 text-sm text-risk-orta"
        >
          Giriş bu kurulumda açık değil. Bu ekran önizlemedir.
        </p>
      )}
      <form className="mt-6 space-y-4" aria-describedby="giris-not" onSubmit={baglantiIste}>
        <MetinAlani
          etiket="Kurum e-posta adresiniz"
          type="email"
          name="eposta"
          autoComplete="email"
          required
          value={eposta}
          onChange={(e) => setEposta(e.target.value)}
          {...(durum.tur === "hata" ? { hata: durum.ileti } : {})}
        />
        <Dugme
          tur="birincil"
          type="submit"
          className="w-full"
          disabled={!ACIK || mesgul}
          simge={<Mail aria-hidden className="size-5" />}
        >
          Giriş bağlantısı gönder
        </Dugme>
      </form>
      <p role="status" aria-live="polite" className="mt-3 text-sm">
        {durum.tur === "gonderildi"
          ? "Bağlantı gönderildi. E-postanızdaki bağlantı 10 dakika geçerlidir ve bir kez kullanılabilir."
          : mesgul
            ? "Gönderiliyor…"
            : ""}
      </p>
      <div className="my-6 flex items-center gap-3 text-sm text-soluk">
        <span className="h-px flex-1 bg-cizgi" />
        ya da
        <span className="h-px flex-1 bg-cizgi" />
      </div>
      <Dugme
        className="w-full"
        disabled={!ACIK || mesgul}
        onClick={kurumsal}
        simge={<Building2 aria-hidden className="size-5" />}
      >
        Kurum hesabıyla giriş yap
      </Dugme>
    </>
  );
}
