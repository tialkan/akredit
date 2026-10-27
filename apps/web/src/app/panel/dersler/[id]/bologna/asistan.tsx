"use client";

// Bologna asistanı: hoca birkaç cümle yazar, taslak üretilir ve onay kutusuna düşer. Onaylanan taslaktan OBS
// yazma planı açılır; plan da onaylanınca alanlar alan alan kopyalanabilir ya da tarayıcı ajanına verilir.
// Kaydet ve son gönderim her zaman hocadadır.

import Link from "next/link";
import { useId, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { Kart } from "../../../../../bilesenler/temel.tsx";
import { bolognaIstegi, ORNEK_KIP_ILETISI } from "../../_bologna/istemci.ts";

interface Bulgu {
  duzey: string;
  kural: string;
  aciklama: string;
}
interface TaslakYaniti {
  oneriId: string;
  denetim: { bulgular: Bulgu[]; hata: number; uyari: number };
  fark: { alan: string; neden: string[] }[];
  tur: number;
}
interface PlanYaniti {
  oneriId: string;
  alanSayisi: number;
}
interface OnayliPlan {
  kopyalanabilir: string;
  onaylayan: string;
  gecerlilikSonu: string;
  sonAdim: string;
}

export interface OnayliTaslak {
  oneriId: string;
  yazmaPlaniId: string | null;
}

const ALAN_ADI: Record<string, string> = {
  amac: "Amaç",
  icerik: "İçerik",
  yontem: "Yöntem",
  notlar: "Ders notları",
  degerlendirme: "Değerlendirme",
  isyuku: "İş yükü",
  dersYapisi: "Ders yapısı",
  ciktilar: "Öğrenme çıktıları",
  haftalar: "Haftalık akış",
  kaynaklar: "Kaynaklar",
  katki: "Katkı matrisi",
  ska: "Sürdürülebilir kalkınma amaçları",
  yetkililer: "Yetkililer",
};

export function BolognaAsistani({
  dersId,
  gercek,
  onayliTaslaklar,
}: {
  dersId: string;
  gercek: boolean;
  onayliTaslaklar: OnayliTaslak[];
}) {
  const kimlik = useId();
  const [beyan, setBeyan] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [ileti, setIleti] = useState<string | null>(null);
  const [taslak, setTaslak] = useState<TaslakYaniti | null>(null);
  const [adres, setAdres] = useState("");
  const [plan, setPlan] = useState<OnayliPlan | null>(null);

  async function uret() {
    if (!gercek) return setIleti(ORNEK_KIP_ILETISI);
    setBekliyor(true);
    setIleti("Taslak hazırlanıyor. Bu bir dakika kadar sürebilir.");
    const s = await bolognaIstegi<TaslakYaniti>("POST", "/taslaklar", { dersId, ...(beyan.trim() ? { beyan } : {}) });
    setBekliyor(false);
    if (!s.tamam) return setIleti(s.hata);
    setTaslak(s.deger);
    setIleti(
      s.deger.denetim.hata === 0
        ? "Taslak hazır ve kurallardan hatasız geçti. Onay kutusunda inceleyip onaylayın."
        : `Taslakta ${s.deger.denetim.hata} hata kaldı. Onay kutusunda düzeltebilir ya da yeniden üretebilirsiniz.`,
    );
  }

  async function planAc(taslakId: string) {
    if (!gercek) return setIleti(ORNEK_KIP_ILETISI);
    const s = await bolognaIstegi<PlanYaniti>("POST", `/taslaklar/${taslakId}/yazma-plani`, { adres });
    setIleti(
      s.tamam
        ? `Yazma planı açıldı (${s.deger.alanSayisi} alan). Onay kutusunda onaylayınca alanları alabilirsiniz.`
        : s.hata,
    );
  }

  async function planAl(planId: string) {
    if (!gercek) return setIleti(ORNEK_KIP_ILETISI);
    const s = await bolognaIstegi<OnayliPlan>("POST", `/yazma-planlari/${planId}/baslat`, {});
    if (!s.tamam) return setIleti(s.hata);
    setPlan(s.deger);
    setIleti(s.deger.sonAdim);
  }

  return (
    <div className="space-y-6">
      <Kart baslik="1. Birkaç cümle yazın">
        <label htmlFor={`${kimlik}-beyan`} className="block font-semibold">
          Bu derste neyi, nasıl anlatıyorsunuz? (isteğe bağlı)
        </label>
        <p id={`${kimlik}-ipucu`} className="text-soluk">
          Örnek: "Flutter kullanıyorum, dönem projesi var, ara sınav uygulamalı." Kişisel bilgi yazmayın.
        </p>
        <textarea
          id={`${kimlik}-beyan`}
          aria-describedby={`${kimlik}-ipucu`}
          className="mt-2 w-full rounded-md border border-cizgi-guclu bg-zemin p-2"
          rows={4}
          maxLength={4000}
          value={beyan}
          onChange={(e) => setBeyan(e.target.value)}
        />
        <Dugme tur="birincil" className="mt-3" onClick={uret} disabled={bekliyor} aria-busy={bekliyor}>
          Taslağı hazırla
        </Dugme>
      </Kart>

      <p aria-live="polite" role="status" className="font-semibold">
        {ileti}
      </p>

      {taslak ? (
        <Kart baslik="Denetim sonucu">
          <p>
            {taslak.denetim.hata} hata, {taslak.denetim.uyari} uyarı · {taslak.tur} turda hazırlandı.{" "}
            <Link className="underline" href="/panel/onaylar">
              Onay kutusunda incele
            </Link>
          </p>
          {taslak.denetim.bulgular.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {taslak.denetim.bulgular.map((b) => (
                <li key={`${b.kural}-${b.aciklama}`}>
                  <span className="font-semibold">{b.duzey === "hata" ? "Hata" : "Uyarı"}</span> ({b.kural}):{" "}
                  {b.aciklama}
                </li>
              ))}
            </ul>
          ) : null}
          <h3 className="mt-3 font-semibold">Değişen alanlar</h3>
          <ul className="list-disc pl-6">
            {taslak.fark.map((f) => (
              <li key={f.alan}>
                {ALAN_ADI[f.alan] ?? f.alan}: {f.neden.join(" ")}
              </li>
            ))}
          </ul>
        </Kart>
      ) : null}

      <Kart baslik="2. Onaylı taslağı OBS'ye aktarın">
        {onayliTaslaklar.length === 0 ? (
          <p>Onaylanmış taslak yok. Önce taslağı onay kutusunda onaylayın.</p>
        ) : (
          <>
            <label htmlFor={`${kimlik}-adres`} className="block font-semibold">
              OBS'de dersin düzenleme sayfasının adresi
            </label>
            <input
              id={`${kimlik}-adres`}
              type="url"
              className="mt-1 w-full rounded-md border border-cizgi-guclu bg-zemin p-2"
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
            />
            <ul className="mt-3 space-y-2">
              {onayliTaslaklar.map((t) => (
                <li key={t.oneriId} className="flex flex-wrap gap-2">
                  {t.yazmaPlaniId ? (
                    <Dugme onClick={() => planAl(t.yazmaPlaniId as string)}>Onaylı planın alanlarını al</Dugme>
                  ) : (
                    <Dugme onClick={() => planAc(t.oneriId)} disabled={!adres}>
                      Yazma planı aç
                    </Dugme>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-soluk">
              Plan da onay kutusunda ayrıca onaylanır ve onaydan sonra 90 dakika geçerlidir. Parola gibi giriş bilgileri
              hiçbir zaman plana girmez. Her sekmede Kaydet'e siz basarsınız.
            </p>
          </>
        )}
        {plan ? (
          <div className="mt-4">
            <label htmlFor={`${kimlik}-cikti`} className="block font-semibold">
              Alan alan aktarım metni (onaylayan: {plan.onaylayan})
            </label>
            <textarea
              id={`${kimlik}-cikti`}
              readOnly
              rows={14}
              className="mt-1 w-full rounded-md border border-cizgi-guclu bg-zemin p-2 font-mono text-sm"
              value={plan.kopyalanabilir}
            />
            <Dugme className="mt-2" onClick={() => navigator.clipboard?.writeText(plan.kopyalanabilir)}>
              Panoya kopyala
            </Dugme>
          </div>
        ) : null}
      </Kart>
    </div>
  );
}
