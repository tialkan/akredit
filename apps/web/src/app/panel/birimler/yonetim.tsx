"use client";

// Birim ve program yönetimi, kişi-rol ataması (İP-35). Düzeltme yeni kayıtla yapılır: eski ve yeni değer
// düzeltme geçmişinde kalır. Bu ekran her zaman gerçek kurum verisiyle çalışır (oturum gerekir).

import { History, Pencil, Plus } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BaglantiDugme, Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani, Secim } from "../../../bilesenler/form.tsx";
import { Kart } from "../../../bilesenler/temel.tsx";
import { BIRIM_TURU_ADI, DUZEY_ADI, kurulumIstegi } from "../../kurulum/istek.ts";

interface Program {
  id: string;
  ad: string;
  duzey: string;
  dil: string;
  bolognaAdresi: string | null;
  yokAtlasKodu: string | null;
  dersSayisi: number;
}
interface Birim {
  id: string;
  ad: string;
  tur: string;
  kod: string | null;
  ustBirimId: string | null;
  programlar: Program[];
}
interface Kisi {
  id: string;
  adSoyad: string;
  eposta: string | null;
  roller: { rol: string; kapsamTuru: string; kapsamAdi: string }[];
}
interface Duzeltme {
  zaman: string;
  duzelten: string;
  onceki: Record<string, unknown>;
  yeni: Record<string, unknown>;
}

const ROL_ADI: Record<string, string> = {
  kurum_yoneticisi: "Kurum yöneticisi",
  kalite_komisyonu_baskani: "Kalite komisyonu başkanı",
  kalite_komisyonu_uyesi: "Kalite komisyonu üyesi",
  birim_kalite_sorumlusu: "Birim kalite sorumlusu",
  program_sorumlusu: "Program sorumlusu",
  ogretim_elemani: "Öğretim elemanı",
  degerlendirici: "Değerlendirici",
  gozlemci: "Gözlemci",
};

export function BirimYonetimi() {
  const [birimler, setBirimler] = useState<Birim[] | null>(null);
  const [kisiler, setKisiler] = useState<Kisi[]>([]);
  const [hata, setHata] = useState<{ ileti: string; oturum: boolean } | null>(null);
  const [ileti, setIleti] = useState<string | null>(null);

  const yenile = useCallback(async () => {
    const [b, k] = await Promise.all([
      kurulumIstegi<Birim[]>("GET", "birimler"),
      kurulumIstegi<Kisi[]>("GET", "kisiler"),
    ]);
    if (!b.tamam) return setHata({ ileti: b.hata, oturum: b.durum === 401 });
    setBirimler(b.deger);
    if (k.tamam) setKisiler(k.deger);
  }, []);
  useEffect(() => {
    void yenile();
  }, [yenile]);

  const bitti = (m: string) => {
    setIleti(m);
    void yenile();
  };

  if (hata)
    return (
      <div className="space-y-4">
        <p role="alert">{hata.ileti}</p>
        {hata.oturum ? (
          <BaglantiDugme href="/giris" tur="birincil">
            Giriş yap
          </BaglantiDugme>
        ) : null}
      </div>
    );
  if (!birimler) return <p role="status">Yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" className="text-sm font-semibold text-risk-dusuk">
        {ileti ?? ""}
      </p>
      <Kart baslik="Birim ekle">
        <BirimFormu birimler={birimler} bitti={() => bitti("Birim eklendi.")} />
      </Kart>
      {birimler.length === 0 ? (
        <p className="text-soluk">Henüz birim yok. Kurulum sihirbazında Bologna adresiyle ya da yukarıdan ekleyin.</p>
      ) : null}
      {birimler.map((b) => (
        <BirimKarti key={b.id} birim={b} birimler={birimler} bitti={bitti} />
      ))}
      <Kart baslik="Kişiler ve roller">
        <KisiRolleri kisiler={kisiler} birimler={birimler} bitti={() => bitti("Rol atandı.")} />
      </Kart>
    </div>
  );
}

function BirimFormu({ birimler, mevcut, bitti }: { birimler: Birim[]; mevcut?: Birim; bitti: () => void }) {
  const [ad, setAd] = useState(mevcut?.ad ?? "");
  const [tur, setTur] = useState(mevcut?.tur ?? "fakulte");
  const [kod, setKod] = useState(mevcut?.kod ?? "");
  const [ust, setUst] = useState(mevcut?.ustBirimId ?? "");
  const [hata, setHata] = useState<string | null>(null);
  async function gonder(e: FormEvent) {
    e.preventDefault();
    const govde = { ad, tur, kod: kod.trim() || null, ustBirimId: ust || null };
    const s = mevcut
      ? await kurulumIstegi("PATCH", `birimler/${mevcut.id}`, govde)
      : await kurulumIstegi("POST", "birimler", govde);
    if (!s.tamam) return setHata(s.alanlar[0] ? `${s.hata} ${s.alanlar[0].ileti}` : s.hata);
    setHata(null);
    if (!mevcut) {
      setAd("");
      setKod("");
    }
    bitti();
  }
  return (
    <form onSubmit={gonder} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <MetinAlani etiket="Birimin adı" value={ad} onChange={(e) => setAd(e.target.value)} required />
      <Secim etiket="Türü" value={tur} onChange={(e) => setTur(e.target.value)}>
        {Object.entries(BIRIM_TURU_ADI).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Secim>
      <MetinAlani etiket="Kodu (isteğe bağlı)" value={kod} onChange={(e) => setKod(e.target.value)} />
      <Secim etiket="Üst birim" value={ust} onChange={(e) => setUst(e.target.value)}>
        <option value="">Yok</option>
        {birimler
          .filter((x) => x.id !== mevcut?.id)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.ad}
            </option>
          ))}
      </Secim>
      <div className="sm:col-span-2 lg:col-span-4">
        <Dugme tur="birincil" type="submit" simge={mevcut ? undefined : <Plus aria-hidden className="size-5" />}>
          {mevcut ? "Düzeltmeyi kaydet" : "Birimi ekle"}
        </Dugme>
        <p role="alert" className="mt-2 text-sm font-semibold text-risk-yuksek">
          {hata ?? ""}
        </p>
      </div>
    </form>
  );
}

function BirimKarti({ birim, birimler, bitti }: { birim: Birim; birimler: Birim[]; bitti: (m: string) => void }) {
  const [duzenle, setDuzenle] = useState(false);
  return (
    <Kart
      baslik={birim.ad}
      eylem={
        <div className="flex flex-wrap gap-2">
          <Dugme
            boy="kucuk"
            onClick={() => setDuzenle((d) => !d)}
            aria-expanded={duzenle}
            simge={<Pencil aria-hidden className="size-4" />}
          >
            Düzelt<span className="sr-only">: {birim.ad}</span>
          </Dugme>
          <Gecmis tur="birimler" id={birim.id} ad={birim.ad} />
        </div>
      }
    >
      <p className="text-sm text-soluk">
        {BIRIM_TURU_ADI[birim.tur] ?? birim.tur}
        {birim.kod ? `, kod ${birim.kod}` : ""}
      </p>
      {duzenle ? (
        <div className="mt-4 rounded-sm border border-cizgi px-4 py-3">
          <BirimFormu
            birimler={birimler}
            mevcut={birim}
            bitti={() => {
              setDuzenle(false);
              bitti("Birim düzeltildi. Eski değer düzeltme geçmişinde.");
            }}
          />
        </div>
      ) : null}
      <h3 className="mt-5 font-semibold">Programlar</h3>
      {birim.programlar.length ? (
        <ul className="mt-2 divide-y divide-cizgi">
          {birim.programlar.map((p) => (
            <ProgramSatiri key={p.id} program={p} birimler={birimler} bitti={bitti} />
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-soluk">Bu birimde program yok.</p>
      )}
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold">Program ekle</summary>
        <div className="mt-3">
          <ProgramFormu birimId={birim.id} birimler={birimler} bitti={() => bitti("Program eklendi.")} />
        </div>
      </details>
    </Kart>
  );
}

function ProgramSatiri({
  program,
  birimler,
  bitti,
}: {
  program: Program;
  birimler: Birim[];
  bitti: (m: string) => void;
}) {
  const [duzenle, setDuzenle] = useState(false);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{program.ad}</p>
          <p className="text-sm text-soluk">
            {DUZEY_ADI[program.duzey] ?? program.duzey}, {program.dersSayisi} ders
            {program.yokAtlasKodu ? `, YÖK Atlas ${program.yokAtlasKodu}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dugme
            boy="kucuk"
            onClick={() => setDuzenle((d) => !d)}
            aria-expanded={duzenle}
            simge={<Pencil aria-hidden className="size-4" />}
          >
            Düzelt<span className="sr-only">: {program.ad}</span>
          </Dugme>
          <Gecmis tur="programlar" id={program.id} ad={program.ad} />
        </div>
      </div>
      {duzenle ? (
        <div className="mt-3 rounded-sm border border-cizgi px-4 py-3">
          <ProgramFormu
            mevcut={program}
            birimId=""
            birimler={birimler}
            bitti={() => {
              setDuzenle(false);
              bitti("Program düzeltildi. Eski değer düzeltme geçmişinde.");
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

function ProgramFormu({
  birimId,
  birimler,
  mevcut,
  bitti,
}: {
  birimId: string;
  birimler: Birim[];
  mevcut?: Program;
  bitti: () => void;
}) {
  const sahip = mevcut ? (birimler.find((b) => b.programlar.some((p) => p.id === mevcut.id))?.id ?? "") : birimId;
  const [ad, setAd] = useState(mevcut?.ad ?? "");
  const [duzey, setDuzey] = useState(mevcut?.duzey ?? "lisans");
  const [birim, setBirim] = useState(sahip);
  const [atlas, setAtlas] = useState(mevcut?.yokAtlasKodu ?? "");
  const [bologna, setBologna] = useState(mevcut?.bolognaAdresi ?? "");
  const [hata, setHata] = useState<string | null>(null);
  async function gonder(e: FormEvent) {
    e.preventDefault();
    const govde = {
      birimId: birim,
      ad,
      duzey,
      yokAtlasKodu: atlas.trim() || null,
      bolognaAdresi: bologna.trim() || null,
    };
    const s = mevcut
      ? await kurulumIstegi("PATCH", `programlar/${mevcut.id}`, govde)
      : await kurulumIstegi("POST", "programlar", govde);
    if (!s.tamam) return setHata(s.alanlar[0] ? `${s.hata} ${s.alanlar[0].ileti}` : s.hata);
    setHata(null);
    if (!mevcut) setAd("");
    bitti();
  }
  return (
    <form onSubmit={gonder} className="grid gap-4 sm:grid-cols-2">
      <MetinAlani etiket="Programın adı" value={ad} onChange={(e) => setAd(e.target.value)} required />
      <Secim etiket="Düzey" value={duzey} onChange={(e) => setDuzey(e.target.value)}>
        {Object.entries(DUZEY_ADI).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Secim>
      {mevcut ? (
        <Secim etiket="Birim" value={birim} onChange={(e) => setBirim(e.target.value)}>
          {birimler.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ad}
            </option>
          ))}
        </Secim>
      ) : null}
      <MetinAlani
        etiket="YÖK Atlas kodu (isteğe bağlı)"
        inputMode="numeric"
        value={atlas}
        onChange={(e) => setAtlas(e.target.value)}
      />
      <MetinAlani
        etiket="Bologna adresi (isteğe bağlı)"
        type="url"
        value={bologna}
        onChange={(e) => setBologna(e.target.value)}
      />
      <div className="sm:col-span-2">
        <Dugme tur="birincil" type="submit">
          {mevcut ? "Düzeltmeyi kaydet" : "Programı ekle"}
        </Dugme>
        <p role="alert" className="mt-2 text-sm font-semibold text-risk-yuksek">
          {hata ?? ""}
        </p>
      </div>
    </form>
  );
}

function Gecmis({ tur, id, ad }: { tur: "birimler" | "programlar"; id: string; ad: string }) {
  const [liste, setListe] = useState<Duzeltme[] | null>(null);
  const [acik, setAcik] = useState(false);
  async function ac() {
    if (acik) return setAcik(false);
    const s = await kurulumIstegi<Duzeltme[]>("GET", `${tur}/${id}/duzeltmeler`);
    setListe(s.tamam ? s.deger : []);
    setAcik(true);
  }
  return (
    <>
      <Dugme
        boy="kucuk"
        tur="sessiz"
        onClick={() => void ac()}
        aria-expanded={acik}
        simge={<History aria-hidden className="size-4" />}
      >
        Geçmiş<span className="sr-only">: {ad}</span>
      </Dugme>
      {acik ? (
        <div className="w-full basis-full rounded-sm border border-cizgi px-4 py-3 text-sm">
          {liste?.length ? (
            <ul className="space-y-2">
              {liste.map((d) => (
                <li key={d.zaman}>
                  <span className="font-semibold">{new Date(d.zaman).toLocaleString("tr-TR")}</span>, {d.duzelten}:{" "}
                  {Object.keys(d.yeni)
                    .map((k) => `${k} "${String(d.onceki[k] ?? "")}" yerine "${String(d.yeni[k] ?? "")}"`)
                    .join("; ")}
                </li>
              ))}
            </ul>
          ) : (
            <p>Düzeltme yok.</p>
          )}
        </div>
      ) : null}
    </>
  );
}

function KisiRolleri({ kisiler, birimler, bitti }: { kisiler: Kisi[]; birimler: Birim[]; bitti: () => void }) {
  const [kisi, setKisi] = useState("");
  const [rol, setRol] = useState("ogretim_elemani");
  const [kapsam, setKapsam] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const kapsamlar = [
    ...birimler.map((b) => ({ deger: `birim:${b.id}`, ad: `Birim: ${b.ad}` })),
    ...birimler.flatMap((b) => b.programlar.map((p) => ({ deger: `program:${p.id}`, ad: `Program: ${p.ad}` }))),
  ];
  async function ata(e: FormEvent) {
    e.preventDefault();
    const [tur, id] = kapsam.split(":");
    const s = await kurulumIstegi("POST", "roller", { kisiId: kisi, rol, kapsam: { tur, id } });
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    bitti();
  }
  return (
    <div className="space-y-5">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Kurumdaki kişiler ve rolleri</caption>
        <thead>
          <tr className="border-b border-cizgi">
            <th scope="col" className="py-2 pr-4">
              Kişi
            </th>
            <th scope="col" className="py-2">
              Roller
            </th>
          </tr>
        </thead>
        <tbody>
          {kisiler.map((k) => (
            <tr key={k.id} className="border-b border-cizgi align-top">
              <th scope="row" className="py-2 pr-4 font-normal">
                <span className="font-semibold">{k.adSoyad}</span>
                {k.eposta ? <span className="block text-soluk">{k.eposta}</span> : null}
              </th>
              <td className="py-2">
                {k.roller.length
                  ? k.roller.map((r) => `${ROL_ADI[r.rol] ?? r.rol} (${r.kapsamAdi})`).join(", ")
                  : "Rol yok"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={ata} className="grid gap-4 sm:grid-cols-3 sm:items-end">
        <Secim etiket="Kişi" value={kisi} onChange={(e) => setKisi(e.target.value)} required>
          <option value="">Seçin</option>
          {kisiler.map((k) => (
            <option key={k.id} value={k.id}>
              {k.adSoyad}
            </option>
          ))}
        </Secim>
        <Secim etiket="Rol" value={rol} onChange={(e) => setRol(e.target.value)}>
          {Object.entries(ROL_ADI)
            .filter(([k]) => k !== "degerlendirici")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </Secim>
        <Secim etiket="Kapsam" value={kapsam} onChange={(e) => setKapsam(e.target.value)} required>
          <option value="">Seçin</option>
          {kapsamlar.map((k) => (
            <option key={k.deger} value={k.deger}>
              {k.ad}
            </option>
          ))}
        </Secim>
        <div className="sm:col-span-3">
          <Dugme tur="birincil" type="submit" disabled={!kisi || !kapsam}>
            Rolü ata
          </Dugme>
          <p role="alert" className="mt-2 text-sm font-semibold text-risk-yuksek">
            {hata ?? ""}
          </p>
          <p className="mt-1 text-sm text-soluk">
            Yeni kişileri kurulum sihirbazındaki davet adımından ekleyin. Değerlendirici, süreli davetle eklenir.
          </p>
        </div>
      </form>
    </div>
  );
}
