"use client";

// Belge isteği formu (İP-45). E-posta gönderilemezse bağlantı bir kez gösterilir; kullanıcı elle iletir.

import { Send } from "lucide-react";
import { useActionState } from "react";
import { Dugme } from "../../../../bilesenler/dugme.tsx";
import { MetinAlani, UzunMetinAlani } from "../../../../bilesenler/form.tsx";
import { type IstekEylemDurumu, istekOlusturEylem } from "./eylem.ts";

export function IstekFormu({ varsayilanGun, enUzunGun }: { varsayilanGun: number; enUzunGun: number }) {
  const [d, eylem, bekliyor] = useActionState<IstekEylemDurumu, FormData>(istekOlusturEylem, { durum: "bos" });
  const alan = (a: string) => (d.durum === "hata" ? (d.alanlar[a] ?? null) : null);
  return (
    <form action={eylem} className="max-w-xl space-y-5">
      <UzunMetinAlani
        etiket="İstenen belge"
        name="istenen"
        required
        minLength={3}
        maxLength={2000}
        rows={3}
        ipucu="Birimin anlayacağı biçimde yazın. Örnek: 2025 yılı hizmet içi eğitim planı ve katılım listesi."
        hata={alan("istenen")}
      />
      <MetinAlani etiket="Birim (isteğe bağlı)" name="birimAdi" maxLength={200} hata={alan("birimAdi")} />
      <MetinAlani
        etiket="Alıcı e-posta (isteğe bağlı)"
        name="aliciEposta"
        type="email"
        autoComplete="off"
        ipucu="Boş bırakırsanız istek oluşturulur, bağlantıyı birime kendiniz iletirsiniz."
        hata={alan("aliciEposta")}
      />
      <MetinAlani
        etiket="Kaç gün içinde"
        name="sonGun"
        type="number"
        min={1}
        max={enUzunGun}
        defaultValue={varsayilanGun}
        ipucu={`En çok ${enUzunGun} gün. Bağlantı bu sürenin sonunda geçersiz olur.`}
        hata={alan("sonGun")}
      />
      <Dugme tur="birincil" type="submit" disabled={bekliyor} simge={<Send aria-hidden className="size-5" />}>
        İsteği oluştur
      </Dugme>
      <p role="alert" className="text-sm font-semibold text-risk-yuksek">
        {d.durum === "hata" ? d.ileti : ""}
      </p>
      {d.durum === "tamam" ? (
        <div role="status" className="rounded-sm border border-cizgi bg-yuzey px-4 py-4">
          <p className="font-semibold">
            {d.gonderildi ? "İstek oluşturuldu ve e-postayla gönderildi." : "İstek oluşturuldu ama gönderilmedi."}
          </p>
          {d.neden ? <p className="mt-1">{d.neden}</p> : null}
          {!d.gonderildi ? (
            <MetinAlani
              className="mt-3"
              etiket="Yükleme bağlantısı"
              readOnly
              value={d.baglanti}
              onFocus={(e) => e.currentTarget.select()}
              ipucu="Bu bağlantı yalnız şimdi gösterilir ve bir kez kullanılabilir. Yalnız ilgili kişiye iletin."
            />
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
