import { qrSvg } from "@akredit/anket/temel";
import type { Metadata } from "next";
import Link from "next/link";
import { Tablo } from "../../../bilesenler/tablo.tsx";
import { EksikIsareti, Kart, Rozet, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { ORNEK_ANKETLER, ornekIsyukuDenetimi } from "./ornek.ts";

export const metadata: Metadata = { title: "Anketler" };

const sayi = (x: number, b = 2) => x.toLocaleString("tr-TR", { maximumFractionDigits: b });
const yuzde = (x: number) => `%${sayi(x * 100, 0)}`;
const DURUM = { yayinda: "Yanıt alıyor", kapali: "Kapandı" } as const;

export default async function AnketlerSayfasi() {
  const ilk = ORNEK_ANKETLER[0];
  const acikAnket = ORNEK_ANKETLER.find((a) => a.erisim === "baglanti");
  const acikBaglanti = acikAnket ? `https://akredit.org/anket/ornek/${acikAnket.tanim.sablon}` : null;
  const qr = acikBaglanti ? await qrSvg(acikBaglanti) : null;
  const isyuku = ornekIsyukuDenetimi();
  return (
    <>
      <SayfaBasligi
        baslik="Anketler"
        aciklama="Öğrenci, mezun, işveren ve iç paydaş anketleri. Yanıtlar anonimdir; davetler ve hatırlatmalar takvime göre kendiliğinden gider. Bütün sayılar yanıtlardan hesaplanır."
      />
      <div className="space-y-6">
        <Tablo
          baslik="Anketler ve yanıt oranları"
          sutunlar={[
            { anahtar: "baslik", baslik: "Anket", siralanabilir: true, satirBasligi: true },
            { anahtar: "durum", baslik: "Durum", siralanabilir: true },
            { anahtar: "yanit", baslik: "Yanıt" },
            { anahtar: "oran", baslik: "Yanıt oranı", siralanabilir: true },
          ]}
          satirlar={ORNEK_ANKETLER.map((a) => ({
            anahtar: a.id,
            degerler: {
              baslik: a.baslik,
              durum: DURUM[a.durum],
              oran: a.sonuc.yanitOrani === null ? "" : String(a.sonuc.yanitOrani).padStart(8, "0"),
            },
            hucreler: {
              baslik: (
                <span>
                  <span className="font-semibold">{a.baslik}</span>
                  <span className="block text-sm text-soluk">
                    {a.erisim === "davet" ? "Kişiye özel bağlantı" : "Açık bağlantı ve QR"}
                  </span>
                </span>
              ),
              durum: <Rozet vurgulu={a.durum === "yayinda"}>{DURUM[a.durum]}</Rozet>,
              yanit: a.davetSayisi ? `${a.sonuc.yanitSayisi} / ${a.davetSayisi}` : String(a.sonuc.yanitSayisi),
              oran: a.sonuc.yanitOrani === null ? "Yok" : yuzde(a.sonuc.yanitOrani),
            },
          }))}
        />

        {ilk ? (
          <Kart baslik={`${ilk.baslik}: sonuçlar`}>
            <p className="mb-3 text-sm text-soluk">
              Ortalama 1–5 ölçeğindedir. {ilk.sonuc.esik} yanıtın altındaki sorularda sonuç gösterilmez.
            </p>
            <Tablo
              baslik="Soru bazında sonuçlar"
              sutunlar={[
                { anahtar: "soru", baslik: "Soru", satirBasligi: true },
                { anahtar: "n", baslik: "Yanıtlayan" },
                { anahtar: "ort", baslik: "Ortalama" },
                { anahtar: "katilan", baslik: "Katılıyorum ve üstü" },
              ]}
              satirlar={ilk.sonuc.sorular.map((s) => {
                const ust = s.dagilim ? s.dagilim.slice(3).reduce((t, d) => t + d.oran, 0) : null;
                return {
                  anahtar: s.kod,
                  hucreler: {
                    soru: s.metin,
                    n: String(s.n),
                    ort:
                      s.tur === "acik" ? (
                        "Açık uçlu"
                      ) : s.gizli ? (
                        <EksikIsareti aciklama="Yanıt sayısı eşiğin altında" />
                      ) : (
                        sayi(s.ozet?.ortalama ?? 0)
                      ),
                    katilan: ust === null || s.tur !== "likert" ? "Yok" : yuzde(ust),
                  },
                };
              })}
            />
          </Kart>
        ) : null}

        <Kart baslik="AKTS iş yükü denetimi (HUK101)">
          <p>
            Ders sayfasında beyan edilen iş yükü <strong>{isyuku.beyan ?? "belirtilmemiş"} saat</strong>, öğrencilerin
            bildirdiği (etkinlik başına ortanca) <strong>{sayi(isyuku.olculen)} saat</strong>, AKTS{" "}
            {isyuku.akts ?? "belirtilmemiş"}.
          </p>
          {isyuku.bulgular.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-6">
              {isyuku.bulgular.map((b) => (
                <li key={b.kural}>
                  <Rozet vurgulu={b.duzey === "hata"}>{b.duzey === "hata" ? "Hata" : "Uyarı"}</Rozet> {b.aciklama}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3">Öğrenci anketine göre iş yükü AKTS ile uyumlu.</p>
          )}
          <p className="mt-3 text-sm text-soluk">Bulgu, Bologna denetimine girer; düzeltme kararı komisyonundur.</p>
        </Kart>

        {acikBaglanti && qr ? (
          <Kart baslik={`${acikAnket?.baslik}: açık bağlantı`}>
            <div className="flex flex-wrap items-start gap-6">
              <div
                role="img"
                aria-label={`Anket bağlantısının QR kodu: ${acikBaglanti}`}
                className="size-40 rounded bg-white p-1"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG, sabit bağlantıdan qrcode kütüphanesiyle üretilir.
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <div className="space-y-2">
                <p>Bağlantıyı paylaşın ya da QR kodunu yazdırın. Aynı cihazdan ikinci yanıt alınmaz.</p>
                <Link className="font-semibold underline" href={`/anket/ornek/${acikAnket?.tanim.sablon}`}>
                  Örnek formu aç
                </Link>
              </div>
            </div>
          </Kart>
        ) : null}
      </div>
    </>
  );
}
