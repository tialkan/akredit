"use client";

// Ders sayfası eylemleri (İP-37): Eksikleri gider, Kanıt ara, Word olarak indir / yükle. Hepsi öneri üretir;
// karar hocanın onay kutusundadır. Başka kurum örnekleri kanıt değildir ve öyle gösterilmez.

import { useId, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../../../veri/istemci.ts";

type Sonuc<T> = { tamam: true; deger: T } | { tamam: false; hata: string };

async function iste<T>(yol: string, yontem = "GET", govde?: unknown): Promise<Sonuc<T>> {
  try {
    const y = await fetch(`/api/v1${yol}`, {
      method: yontem,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(govde === undefined ? {} : { "content-type": "application/json" }),
        ...(yontem === "GET" ? {} : { "idempotency-key": crypto.randomUUID() }),
      },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    });
    const v = (await y.json().catch(() => null)) as { hata?: string } | null;
    return y.ok
      ? { tamam: true, deger: v as T }
      : { tamam: false, hata: v?.hata ?? "İşlem yapılamadı. Yeniden deneyin." };
  } catch {
    return { tamam: false, hata: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." };
  }
}

function base64(dosya: File): Promise<string> {
  return new Promise((coz, red) => {
    const r = new FileReader();
    r.onload = () => coz(String(r.result).split(",")[1] ?? "");
    r.onerror = () => red(r.error);
    r.readAsDataURL(dosya);
  });
}

interface EksikSonucu {
  taslak: { oneriId: string; hata: number; uyari: number };
  giderilecek: { kural: string; aciklama: string }[];
  hesaplar: { ad: string; deger: string }[];
  kaynakca: { adres: string; baslik: string }[];
}

interface AramaSonucu {
  kurumIci: { oneriId: string; dosyaAdi: string; adres: string | null; alinti: string }[];
  disOrnekler: { oneriId: string; adres: string; baslik: string; alinti: string }[];
  webArama: { yapildi: boolean; neden: string | null };
  yontem: "yz" | "kural";
}

interface YuklemeSonucu {
  degisen: { kod: string; alan: string }[];
  reddedilen: { kod: string; alan: string; neden: string }[];
  denetim: { hata: number; uyari: number };
}

const ONAY_KUTUSU = "/panel/onaylar";

export function ArastirmaPaneli({ dersId }: { dersId: string }) {
  const kimlik = useId();
  const [mesgul, setMesgul] = useState<"" | "eksik" | "ara" | "indir" | "yukle">("");
  const [ileti, setIleti] = useState("");
  const [eksik, setEksik] = useState<EksikSonucu | null>(null);
  const [arama, setArama] = useState<AramaSonucu | null>(null);
  const [yukleme, setYukleme] = useState<YuklemeSonucu | null>(null);
  const [olcut, setOlcut] = useState("B.1.5");
  const [web, setWeb] = useState(false);
  const [dosya, setDosya] = useState<File | null>(null);
  const d = encodeURIComponent(dersId);

  if (!GERCEK_VERI)
    return (
      <p className="text-soluk">
        Eksik giderme, kanıt arama ve Word paketi örnek veri kipinde kapalıdır; gerçek kurum verisiyle çalışır.
      </p>
    );

  async function eksikleriGider() {
    setMesgul("eksik");
    setIleti("");
    const s = await iste<EksikSonucu>(`/bologna/dersler/${d}/eksik-giderme`, "POST", {});
    setMesgul("");
    if (!s.tamam) return setIleti(s.hata);
    setEksik(s.deger);
    setIleti("Düzeltme taslağı onay kutunuza düştü.");
  }

  async function kanitAra(e: React.FormEvent) {
    e.preventDefault();
    setMesgul("ara");
    setIleti("");
    const s = await iste<AramaSonucu>("/arastirma/kanit-ara", "POST", {
      olcutKod: olcut.trim(),
      dersId,
      webArama: web,
    });
    setMesgul("");
    if (!s.tamam) return setIleti(s.hata);
    setArama(s.deger);
    setIleti(
      `${s.deger.kurumIci.length} kanıt adayı onay kutunuza düştü${web ? `, ${s.deger.disOrnekler.length} başka kurum örneği bulundu` : ""}.`,
    );
  }

  async function indir() {
    setMesgul("indir");
    setIleti("");
    const s = await iste<{ dosyaAdi: string; mime: string; icerikBase64: string }>(`/dersler/${d}/word-paketi`);
    setMesgul("");
    if (!s.tamam) return setIleti(s.hata);
    const ikili = Uint8Array.from(atob(s.deger.icerikBase64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([ikili], { type: s.deger.mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = s.deger.dosyaAdi;
    a.click();
    URL.revokeObjectURL(url);
    setIleti(`${s.deger.dosyaAdi} indirildi.`);
  }

  async function yukle(e: React.FormEvent) {
    e.preventDefault();
    if (!dosya) return;
    setMesgul("yukle");
    setIleti("");
    const s = await iste<YuklemeSonucu>(`/dersler/${d}/word-paketi`, "POST", {
      dosyaAdi: dosya.name,
      icerikBase64: await base64(dosya),
    });
    setMesgul("");
    if (!s.tamam) return setIleti(s.hata);
    setYukleme(s.deger);
    setIleti(
      s.deger.degisen.length
        ? `${s.deger.degisen.length} alandaki değişikliğiniz kararınız olarak kaydedildi.`
        : "Dosyada değişiklik bulunmadı; kayıt açılmadı.",
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section aria-labelledby={`${kimlik}-eksik`} className="space-y-2">
        <h3 id={`${kimlik}-eksik`} className="font-semibold">
          Eksikleri gider
        </h3>
        <p className="text-sm">
          Son Bologna okumasındaki eksiklerden düzeltme taslağı hazırlanır. Saatler ve toplamlar sistemin hesabıdır;
          taslak onayınızı bekler.
        </p>
        <Dugme tur="birincil" onClick={eksikleriGider} disabled={mesgul !== ""}>
          {mesgul === "eksik" ? "Hazırlanıyor…" : "Eksikleri gider"}
        </Dugme>
        {eksik && (
          <div className="space-y-2 text-sm">
            <p>
              Giderilecek {eksik.giderilecek.length} bulgu; taslakta {eksik.taslak.hata} hata, {eksik.taslak.uyari}{" "}
              uyarı kaldı.{" "}
              <a className="text-vurgu underline underline-offset-2" href={ONAY_KUTUSU}>
                Onay kutusuna git
              </a>
            </p>
            <ul className="list-disc pl-5">
              {eksik.giderilecek.slice(0, 8).map((b) => (
                <li key={`${b.kural}-${b.aciklama}`}>{b.aciklama}</li>
              ))}
            </ul>
            {eksik.kaynakca.length > 0 && (
              <p className="text-soluk">
                Başka kurum örnekleri yalnız kaynak olarak listelendi; metinleri kullanılmadı.
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby={`${kimlik}-ara`} className="space-y-2">
        <h3 id={`${kimlik}-ara`} className="font-semibold">
          Kanıt ara
        </h3>
        <form onSubmit={kanitAra} className="space-y-2" aria-label="Kanıt ara">
          <label className="flex flex-col text-sm" htmlFor={`${kimlik}-olcut`}>
            Ölçüt kodu
            <input
              id={`${kimlik}-olcut`}
              className="rounded border border-cizgi-guclu p-2"
              value={olcut}
              onChange={(e) => setOlcut(e.target.value)}
              required
              aria-describedby={`${kimlik}-olcut-ipucu`}
            />
          </label>
          <p id={`${kimlik}-olcut-ipucu`} className="text-sm text-soluk">
            Örnek: B.1.5 (AKTS iş yükü). Kurumunuzun belgelerinde ve sitesinde aranır.
          </p>
          <label className="flex items-start gap-2 text-sm" htmlFor={`${kimlik}-web`}>
            <input id={`${kimlik}-web`} type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} />
            <span>Başka kurumların örneklerini de ara. Bunlar kanıt sayılmaz, yalnız fikir verir.</span>
          </label>
          <Dugme type="submit" disabled={mesgul !== ""}>
            {mesgul === "ara" ? "Aranıyor…" : "Kanıt ara"}
          </Dugme>
        </form>
        {arama && (
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold">Kurumunuzdaki adaylar (onay bekler)</h4>
              {arama.kurumIci.length === 0 ? (
                <p>Yeni aday bulunmadı.</p>
              ) : (
                <ul className="divide-y divide-cizgi">
                  {arama.kurumIci.map((k) => (
                    <li key={k.oneriId} className="py-1.5">
                      <span className="font-semibold">{k.dosyaAdi}</span>
                      <q className="block">{k.alinti}</q>
                      {k.adres && <span className="block break-all text-soluk">{k.adres}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {web && (
              <div>
                <h4 className="font-semibold">Başka kurumlardan örnekler (kanıt değildir)</h4>
                {!arama.webArama.yapildi && arama.webArama.neden && <p>{arama.webArama.neden}</p>}
                <ul className="divide-y divide-cizgi">
                  {arama.disOrnekler.map((x) => (
                    <li key={x.oneriId} className="py-1.5">
                      <a
                        className="text-vurgu underline underline-offset-2"
                        href={x.adres}
                        rel="noopener noreferrer nofollow"
                        target="_blank"
                      >
                        {x.baslik}
                      </a>
                      {x.alinti && <q className="block text-soluk">{x.alinti}</q>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby={`${kimlik}-word`} className="space-y-2">
        <h3 id={`${kimlik}-word`} className="font-semibold">
          Word paketi
        </h3>
        <p className="text-sm">
          Düzeltilmiş ders bilgi paketi, bulgular ve kaynakça; varsa ders dosyası da (birden çok belge zip olur).
          Akredit önerileri belgede sarı zeminle işaretlidir.
        </p>
        <Dugme onClick={indir} disabled={mesgul !== ""}>
          {mesgul === "indir" ? "Hazırlanıyor…" : "Word olarak indir"}
        </Dugme>
        <form onSubmit={yukle} className="space-y-2" aria-label="Word dosyasını yükle">
          <label className="flex flex-col text-sm" htmlFor={`${kimlik}-docx`}>
            Düzenlediğiniz Word dosyası
            <input
              id={`${kimlik}-docx`}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
              required
            />
          </label>
          <Dugme type="submit" disabled={mesgul !== "" || !dosya}>
            {mesgul === "yukle" ? "Yükleniyor…" : "Word dosyasını yükle"}
          </Dugme>
        </form>
        {yukleme && (
          <div className="space-y-1 text-sm">
            {yukleme.degisen.length > 0 && <p>Değişen alanlar: {yukleme.degisen.map((x) => x.alan).join(", ")}.</p>}
            {yukleme.reddedilen.length > 0 && (
              <ul className="list-disc pl-5 text-risk-yuksek">
                {yukleme.reddedilen.map((x) => (
                  <li key={x.kod}>
                    {x.alan}: {x.neden}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <p role="status" aria-live="polite" className="text-sm lg:col-span-3">
        {ileti}
      </p>
    </div>
  );
}
