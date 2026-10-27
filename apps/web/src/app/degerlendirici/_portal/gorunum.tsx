// Değerlendirici portalının görünüm bileşenleri: yalnız veri alır, veritabanına ve oturuma dokunmaz.
// Sayfalar veriyi `portal.ts` ile okuyup buraya verir; erişilebilirlik testleri (e2e) aynı bileşenleri
// uydurma veriyle çizer, böylece portalın dolu hâli de denetlenir.

import Link from "next/link";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani } from "../../../bilesenler/form.tsx";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";

export function tarihYaz(d: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date(d));
}

/** Ekran okuyucu için ISO tarih; görünen metin Türkçe uzun tarih. */
function Tarih({ d }: { d: Date | string }) {
  return <time dateTime={new Date(d).toISOString()}>{tarihYaz(d)}</time>;
}

export interface OdaKanitGorunumu {
  id: string;
  baslik: string;
  dosyaAdi: string;
  belgeTarihi: string | null;
}

export interface KanitOdasiOzellikleri {
  erisimBitis: Date | string;
  program: { tarih: string; saat?: string | undefined; etkinlik: string; yer?: string | undefined }[];
  filtre: { arama?: string | undefined; olcut?: string | undefined };
  gruplar: { olcut: string | null; kanitlar: OdaKanitGorunumu[] }[];
}

export function KanitOdasiGorunumu({ erisimBitis, program, filtre, gruplar }: KanitOdasiOzellikleri) {
  const toplam = new Set(gruplar.flatMap((g) => g.kanitlar.map((k) => k.id))).size;
  return (
    <>
      <SayfaBasligi
        baslik="Kanıt odası"
        aciklama={
          <>
            Kanıtlar ölçütlere göre düzenlendi. Erişiminiz <Tarih d={erisimBitis} /> tarihinde sona erer. Her
            görüntüleme kuruma açık bir günlüğe yazılır.
          </>
        }
      />
      {program.length > 0 && (
        <section aria-labelledby="program-baslik" className="mb-6 rounded-lg border border-cizgi bg-yuzey p-4">
          <h2 id="program-baslik" className="font-semibold">
            Ziyaret programı
          </h2>
          <ol className="mt-2 space-y-1 text-sm">
            {program.map((z) => (
              <li key={`${z.tarih}-${z.saat ?? ""}-${z.etkinlik}`}>
                <span className="font-semibold">
                  <Tarih d={z.tarih} />
                  {z.saat ? `, ${z.saat}` : ""}
                </span>
                : {z.etkinlik}
                {z.yer ? <span className="text-soluk"> ({z.yer})</span> : null}
              </li>
            ))}
          </ol>
        </section>
      )}
      <search className="mb-6">
        <form aria-label="Kanıt arama" method="get" className="flex flex-wrap items-end gap-3">
          <MetinAlani etiket="Ara" name="arama" type="search" defaultValue={filtre.arama ?? ""} maxLength={200} />
          <MetinAlani
            etiket="Ölçüt kodu"
            name="olcut"
            defaultValue={filtre.olcut ?? ""}
            maxLength={50}
            autoComplete="off"
          />
          <Dugme type="submit">Süz</Dugme>
        </form>
      </search>
      <p role="status" className="mb-4 text-sm text-soluk">
        {toplam === 0 ? "Aramanıza uyan kanıt yok." : `${toplam} kanıt, ${gruplar.length} ölçüt altında.`}
      </p>
      {gruplar.map((g, i) => (
        <section key={g.olcut ?? "olcutsuz"} aria-labelledby={`olcut-${i}`} className="mb-6">
          <h2 id={`olcut-${i}`} className="mb-2 font-semibold">
            {g.olcut ?? "Ölçüte bağlanmamış kanıtlar"}
          </h2>
          <ul className="space-y-1">
            {g.kanitlar.map((k) => (
              <li key={k.id}>
                <Link href={`/degerlendirici/kanit/${k.id}`} className="inline-block py-1 underline underline-offset-4">
                  {k.baslik}
                </Link>
                <span className="text-sm text-soluk">
                  {" "}
                  · {k.dosyaAdi}
                  {k.belgeTarihi ? (
                    <>
                      {" · "}
                      <Tarih d={k.belgeTarihi} />
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export interface KanitGorunumuOzellikleri {
  kanit: { baslik: string; dosyaAdi: string; ozet: string; olcutler: string[] };
  parcalar: { id: string; sira: number; metin: string; capa: unknown }[];
}

function konum(c: unknown): string {
  const k = (c ?? {}) as Record<string, unknown>;
  if (typeof k.sayfa === "number") return `Sayfa ${k.sayfa}`;
  if (typeof k.bolum === "string") return `Bölüm ${k.bolum}`;
  if (typeof k.satir === "number") return `Satır ${k.satir}`;
  if (typeof k.slayt === "number") return `Slayt ${k.slayt}`;
  return "";
}

export function KanitGorunumu({ kanit, parcalar }: KanitGorunumuOzellikleri) {
  return (
    <>
      <nav aria-label="Kırıntı yolu" className="mb-2 text-sm">
        <Link href="/degerlendirici" className="inline-block py-1 underline underline-offset-4">
          Kanıt odasına dön
        </Link>
      </nav>
      <SayfaBasligi baslik={kanit.baslik} aciklama={`${kanit.dosyaAdi} · içerik özeti ${kanit.ozet.slice(0, 12)}`} />
      {kanit.olcutler.length > 0 && <p className="mb-4 text-sm">Ölçütler: {kanit.olcutler.join(", ")}</p>}
      {parcalar.length === 0 ? (
        <p>Bu belgenin metni henüz okunmadı.</p>
      ) : (
        <section aria-labelledby="belge-metni">
          <h2 id="belge-metni" className="sr-only">
            Belge metni
          </h2>
          <ol className="space-y-4">
            {parcalar.map((p) => (
              <li key={p.id} className="rounded border border-cizgi bg-yuzey p-3">
                <p className="mb-1 text-sm text-soluk">{konum(p.capa) || `Parça ${p.sira + 1}`}</p>
                <p className="whitespace-pre-wrap">{p.metin}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

export interface ErisimSatiri {
  id: string;
  zaman: string;
  kisiAdi: string | null;
  islem: string;
  ayrinti: string;
}

export function ErisimGunluguGorunumu({ kayitlar }: { kayitlar: ErisimSatiri[] }) {
  const zaman = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
  return (
    <>
      <SayfaBasligi
        baslik="Değerlendirici erişim günlüğü"
        aciklama="Değerlendiricilerin her görüntülemesi ve sorusu burada. Kayıtlar değiştirilemez."
      />
      {kayitlar.length === 0 ? (
        <p>Henüz kayıt yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-cizgi">
          <table className="w-full text-sm">
            <caption className="sr-only">Değerlendirici erişim kayıtları, en yeni önce</caption>
            <thead className="bg-yuzey-2">
              <tr className="text-left">
                <th scope="col" className="px-3 py-2">
                  Zaman
                </th>
                <th scope="col" className="px-3 py-2">
                  Kişi
                </th>
                <th scope="col" className="px-3 py-2">
                  İşlem
                </th>
                <th scope="col" className="px-3 py-2">
                  Ayrıntı
                </th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((k) => (
                <tr key={k.id} className="border-t border-cizgi align-top">
                  <td className="whitespace-nowrap px-3 py-2">
                    <time dateTime={k.zaman}>{zaman.format(new Date(k.zaman))}</time>
                  </td>
                  <td className="px-3 py-2">{k.kisiAdi ?? "Bilinmiyor"}</td>
                  <td className="px-3 py-2">{k.islem}</td>
                  <td className="whitespace-pre-wrap px-3 py-2">{k.ayrinti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
