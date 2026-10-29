"use client";

// Kurulum sihirbazı (İP-35). Kurum yöneticisi beş adımda kurumu hazırlar: yapay zekâ anahtarı, yurt dışı
// aktarım kararı, birim ve program (Bologna önerisiyle), hocaların daveti, çerçeve. Her adım ayrı kaydedilir;
// yönetici istediği adıma dönebilir. Adım değişince odak adım başlığına gider (ekran okuyucu duyurur).

import { Check, KeyRound } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { BaglantiDugme, Dugme } from "../../bilesenler/dugme.tsx";
import { IsaretKutusu, MetinAlani, Secim, UzunMetinAlani } from "../../bilesenler/form.tsx";
import { adAnahtari, BIRIM_TURU_ADI, csvKisileri, DUZEY_ADI, kurulumIstegi } from "./istek.ts";

interface Durum {
  kurumAdi: string;
  alanAdi: string | null;
  yzAnahtari: { son4: string; model: string } | null;
  yurtDisiKarari: { izin: boolean; imzalayan: string; zaman: string } | null;
  birimSayisi: number;
  programSayisi: number;
  dersSayisi: number;
  cerceveler: string[];
  yoneticiAdi: string;
}

interface BirimKaydi {
  id: string;
  ad: string;
  tur: string;
  programlar: { id: string; ad: string; duzey: string; dersSayisi: number }[];
}

interface Onizleme {
  onizlemeId: string;
  adres: string;
  programCiktilari: { kod: string; metin: string }[];
  dersler: { kod: string; ad: string; akts: number | null; yariyil: number | null; dersiVerenler: string[] }[];
  okunamayanDersler: string[];
  dersiVerenler: { ad: string; dersler: string[] }[];
}

const ADIMLAR = [
  { kod: "anahtar", ad: "Yapay zekâ anahtarı" },
  { kod: "yurt-disi", ad: "Yurt dışı aktarım kararı" },
  { kod: "program", ad: "Birim ve program" },
  { kod: "davet", ad: "Hocaların daveti" },
  { kod: "cerceve", ad: "Çerçeve" },
] as const;
type AdimKodu = (typeof ADIMLAR)[number]["kod"];

function Hata({ ileti }: { ileti: string | null }) {
  return (
    <p role="alert" className="mt-3 text-sm font-semibold text-risk-yuksek">
      {ileti ?? ""}
    </p>
  );
}

function Basari({ ileti }: { ileti: string | null }) {
  return (
    <p role="status" className="mt-3 text-sm font-semibold text-risk-dusuk">
      {ileti ?? ""}
    </p>
  );
}

export function Sihirbaz() {
  const [durum, setDurum] = useState<Durum | null>(null);
  const [yukHatasi, setYukHatasi] = useState<{ ileti: string; oturum: boolean } | null>(null);
  const [adim, setAdim] = useState<AdimKodu>("anahtar");
  // Panelden gelen bağlantı (?adim=yurt-disi) doğrudan ilgili adımı açar.
  useEffect(() => {
    const istenen = new URLSearchParams(window.location.search).get("adim");
    const bulunan = ADIMLAR.find((a) => a.kod === istenen);
    if (bulunan) setAdim(bulunan.kod);
  }, []);
  const [onizleme, setOnizleme] = useState<Onizleme | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const baslik = useRef<HTMLHeadingElement>(null);

  const yenile = useCallback(async () => {
    const s = await kurulumIstegi<Durum>("GET", "durum");
    if (s.tamam) setDurum(s.deger);
    else setYukHatasi({ ileti: s.hata, oturum: s.durum === 401 });
  }, []);

  useEffect(() => {
    void yenile();
  }, [yenile]);

  const adimaGit = (k: AdimKodu) => {
    setAdim(k);
    requestAnimationFrame(() => baslik.current?.focus());
  };

  if (yukHatasi)
    return (
      <div className="space-y-4">
        <p role="alert">{yukHatasi.ileti}</p>
        {yukHatasi.oturum ? (
          <BaglantiDugme href="/giris" tur="birincil">
            Giriş yap
          </BaglantiDugme>
        ) : null}
      </div>
    );
  if (!durum) return <p role="status">Kurulum bilgileri yükleniyor…</p>;

  const tamam: Record<AdimKodu, boolean> = {
    anahtar: durum.yzAnahtari !== null,
    "yurt-disi": durum.yurtDisiKarari !== null,
    program: durum.programSayisi > 0,
    davet: false,
    cerceve: durum.cerceveler.length > 0,
  };
  const sira = ADIMLAR.findIndex((a) => a.kod === adim);
  const ileri = () => {
    const sonraki = ADIMLAR[sira + 1];
    adimaGit(sonraki ? sonraki.kod : "cerceve");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <nav aria-label="Kurulum adımları">
        <ol className="space-y-1">
          {ADIMLAR.map((a, i) => (
            <li key={a.kod}>
              <button
                type="button"
                onClick={() => adimaGit(a.kod)}
                aria-current={a.kod === adim ? "step" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded px-3 text-left ${
                  a.kod === adim ? "bg-vurgu-zemin font-semibold text-vurgu" : "hover:bg-yuzey-2"
                }`}
              >
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-cizgi-guclu text-sm tabular-nums"
                >
                  {tamam[a.kod] ? <Check className="size-4" /> : i + 1}
                </span>
                <span>
                  {a.ad}
                  {tamam[a.kod] ? <span className="sr-only"> (tamamlandı)</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <section aria-labelledby="adim-basligi" className="min-w-0 rounded-sm border border-cizgi bg-yuzey p-5 sm:p-7">
        <p className="text-sm text-soluk">
          Adım {sira + 1} / {ADIMLAR.length}
        </p>
        <h2
          id="adim-basligi"
          ref={baslik}
          tabIndex={-1}
          className="mt-1 text-2xl font-semibold tracking-[-0.01em] text-vurgu"
        >
          {ADIMLAR[sira]?.ad}
        </h2>
        <div className="mt-5">
          {adim === "anahtar" ? (
            <AnahtarAdimi durum={durum} bitti={() => void yenile().then(ileri)} atla={ileri} />
          ) : adim === "yurt-disi" ? (
            <YurtDisiAdimi durum={durum} bitti={() => void yenile().then(ileri)} />
          ) : adim === "program" ? (
            <ProgramAdimi
              onizleme={onizleme}
              setOnizleme={setOnizleme}
              bitti={(pid) => {
                setProgramId(pid);
                void yenile().then(ileri);
              }}
              atla={ileri}
            />
          ) : adim === "davet" ? (
            <DavetAdimi onizleme={onizleme} programId={programId} setProgramId={setProgramId} bitti={ileri} />
          ) : (
            <CerceveAdimi durum={durum} bitti={() => void yenile()} />
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- (a) Anahtar

function AnahtarAdimi({ durum, bitti, atla }: { durum: Durum; bitti: () => void; atla: () => void }) {
  const [anahtar, setAnahtar] = useState("");
  const [model, setModel] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  async function kaydet(e: FormEvent) {
    e.preventDefault();
    setBekliyor(true);
    const s = await kurulumIstegi("POST", "yz-anahtari", { anahtar, ...(model.trim() ? { model: model.trim() } : {}) });
    setBekliyor(false);
    setAnahtar("");
    if (!s.tamam) return setHata(s.alanlar[0]?.ileti ?? s.hata);
    setHata(null);
    bitti();
  }
  return (
    <div className="max-w-2xl space-y-4">
      <p>
        Akredit'teki bütün yapay zekâ işleri kurumunuzun kendi OpenRouter anahtarıyla yapılır. Kullanım ücreti
        OpenRouter hesabınıza yansır. Anahtar sunucuda şifreli saklanır ve bu ekrana bir daha gelmez.
      </p>
      <div role="note" className="rounded-sm border border-risk-orta bg-risk-orta-zemin px-4 py-3 text-risk-orta">
        <p className="font-semibold">Harcama sınırı koyun.</p>
        <p className="mt-1">
          OpenRouter hesabınızda bu anahtar için aylık bir harcama sınırı tanımlayın. Sınıra ulaşılınca yapay zekâ
          işleri durur, veri kaybolmaz.
        </p>
      </div>
      {durum.yzAnahtari ? (
        <p role="status">
          Kayıtlı anahtar var: sonu {durum.yzAnahtari.son4}, model {durum.yzAnahtari.model}. Yeni anahtar girerseniz
          eskisinin yerine geçer.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={kaydet}>
        <MetinAlani
          etiket="OpenRouter anahtarı"
          type="password"
          autoComplete="off"
          spellCheck={false}
          ipucu="sk-or- ile başlar. openrouter.ai adresinde Keys bölümünden alınır."
          value={anahtar}
          onChange={(e) => setAnahtar(e.target.value)}
          hata={hata}
          required
        />
        <MetinAlani
          etiket="Model (isteğe bağlı)"
          ipucu="Boş bırakılırsa openrouter/auto kullanılır."
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Dugme
            tur="birincil"
            type="submit"
            disabled={bekliyor || !anahtar}
            simge={<KeyRound aria-hidden className="size-5" />}
          >
            Anahtarı kaydet ve devam et
          </Dugme>
          <Dugme tur="sessiz" onClick={atla}>
            {durum.yzAnahtari ? "Devam et" : "Şimdilik atla"}
          </Dugme>
        </div>
      </form>
      {durum.yzAnahtari ? null : (
        <p className="text-sm text-soluk">
          Anahtar girilmezse yapay zekâ gerektiren işler "Yapay zekâ anahtarı tanımlı değil" diye durur ve size bildirim
          düşer. Hocalara bu bildirim gitmez.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- (b) Yurt dışı kararı

function YurtDisiAdimi({ durum, bitti }: { durum: Durum; bitti: () => void }) {
  const [metin, setMetin] = useState<{ metin: string; ozet: string; surum: string } | null>(null);
  const [izin, setIzin] = useState<"evet" | "hayir" | "">("");
  const [imza, setImza] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [imzaHatasi, setImzaHatasi] = useState<string | null>(null);
  useEffect(() => {
    void kurulumIstegi<{ metin: string; ozet: string; surum: string }>("GET", "yurt-disi-metni").then((s) =>
      s.tamam ? setMetin(s.deger) : setHata(s.hata),
    );
  }, []);
  async function imzala(e: FormEvent) {
    e.preventDefault();
    if (!metin || !izin) return setHata("Önce kararınızı seçin.");
    const s = await kurulumIstegi("POST", "yurt-disi-karari", {
      izin: izin === "evet",
      imzaAdi: imza,
      metinOzeti: metin.ozet,
    });
    if (!s.tamam) {
      setImzaHatasi(s.alanlar.find((a) => a.alan === "imzaAdi")?.ileti ?? null);
      return setHata(s.hata);
    }
    setHata(null);
    bitti();
  }
  return (
    <div className="max-w-2xl space-y-4">
      {durum.yurtDisiKarari ? (
        <p role="status">
          Kayıtlı karar: {durum.yurtDisiKarari.izin ? "izin verildi" : "izin verilmedi"}. İmzalayan{" "}
          {durum.yurtDisiKarari.imzalayan}. Yeni imza eski kararın yerine geçer, eski karar günlükte kalır.
        </p>
      ) : null}
      <h3 className="font-semibold">Karar metni (sürüm {metin?.surum ?? ""})</h3>
      <div className="rounded-sm border border-cizgi bg-zemin px-4 py-3">
        {metin ? (
          metin.metin.split("\n").map((s) => (
            <p key={s} className="mt-2 first:mt-0">
              {s}
            </p>
          ))
        ) : (
          <p>Yükleniyor…</p>
        )}
      </div>
      <form className="space-y-4" onSubmit={imzala}>
        <fieldset className="space-y-2">
          <legend className="font-semibold">Kararınız</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="izin"
              value="evet"
              checked={izin === "evet"}
              onChange={() => setIzin("evet")}
              className="size-5 accent-[var(--vurgu)]"
            />
            İzin veriyorum: veri maskelenerek yurt dışındaki hizmetlere gidebilir.
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="izin"
              value="hayir"
              checked={izin === "hayir"}
              onChange={() => setIzin("hayir")}
              className="size-5 accent-[var(--vurgu)]"
            />
            İzin vermiyorum: yurt dışındaki hizmetlere istek gitmez.
          </label>
        </fieldset>
        <MetinAlani
          etiket="İmza: adınız ve soyadınız"
          ipucu={`Hesabınızdaki gibi yazın: ${durum.yoneticiAdi}`}
          autoComplete="name"
          value={imza}
          onChange={(e) => setImza(e.target.value)}
          hata={imzaHatasi}
          required
        />
        <Dugme tur="birincil" type="submit" disabled={!metin || !izin || !imza.trim()}>
          Kararı imzala ve devam et
        </Dugme>
      </form>
      <Hata ileti={hata} />
    </div>
  );
}

// ---------------------------------------------------------------- (c) Birim ve program

function ProgramAdimi({
  onizleme,
  setOnizleme,
  bitti,
  atla,
}: {
  onizleme: Onizleme | null;
  setOnizleme: (o: Onizleme | null) => void;
  bitti: (programId: string) => void;
  atla: () => void;
}) {
  const [adres, setAdres] = useState("");
  const [birimler, setBirimler] = useState<BirimKaydi[]>([]);
  const [birimSecimi, setBirimSecimi] = useState("yeni");
  const [birimAdi, setBirimAdi] = useState("");
  const [birimTuru, setBirimTuru] = useState("fakulte");
  const [programAdi, setProgramAdi] = useState("");
  const [duzey, setDuzey] = useState("lisans");
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  useEffect(() => {
    void kurulumIstegi<BirimKaydi[]>("GET", "birimler").then((s) => {
      if (s.tamam) {
        setBirimler(s.deger);
        if (s.deger[0]) setBirimSecimi(s.deger[0].id);
      }
    });
  }, []);

  async function oku(e: FormEvent) {
    e.preventDefault();
    setBekliyor(true);
    setHata(null);
    const s = await kurulumIstegi<Onizleme>("POST", "bologna/onizle", { adres: adres.trim() });
    setBekliyor(false);
    if (!s.tamam) return setHata(s.hata);
    setOnizleme(s.deger);
    setSecili(new Set(s.deger.dersler.map((d) => d.kod)));
  }

  async function onayla(e: FormEvent) {
    e.preventDefault();
    if (!onizleme) return;
    setBekliyor(true);
    const s = await kurulumIstegi<{ programId: string; dersSayisi: number; ciktiSayisi: number }>(
      "POST",
      "bologna/uygula",
      {
        onizlemeId: onizleme.onizlemeId,
        birim: birimSecimi === "yeni" ? { ad: birimAdi, tur: birimTuru } : { id: birimSecimi },
        program: { ad: programAdi, duzey },
        dersKodlari: [...secili],
      },
    );
    setBekliyor(false);
    if (!s.tamam) return setHata(s.alanlar[0] ? `${s.hata} ${s.alanlar[0].ileti}` : s.hata);
    setSonuc(`${programAdi} kaydedildi: ${s.deger.ciktiSayisi} program çıktısı, ${s.deger.dersSayisi} ders.`);
    bitti(s.deger.programId);
  }

  return (
    <div className="space-y-5">
      <p className="max-w-2xl">
        Programın Bologna Bilgi Paketi sayfasının adresini yapıştırın. Program çıktıları, dersler ve dersi verenlerin
        adları öneri olarak gelir. Siz onaylamadan hiçbir şey kaydedilmez.
      </p>
      <form className="flex max-w-2xl flex-wrap items-end gap-3" onSubmit={oku}>
        <MetinAlani
          etiket="Bologna program adresi"
          type="url"
          className="min-w-0 flex-1 basis-80"
          ipucu="Örnek: https://obs.ornek.edu.tr/oibs/bologna/index.aspx?lang=tr&curSunit=123"
          value={adres}
          onChange={(e) => setAdres(e.target.value)}
          required
        />
        <Dugme tur="birincil" type="submit" disabled={bekliyor || !adres.trim()}>
          Sayfaları oku
        </Dugme>
      </form>
      <p aria-live="polite" className="text-sm">
        {bekliyor && !onizleme ? "Bologna sayfaları okunuyor. Ders sayısına göre bir dakika sürebilir…" : ""}
      </p>
      {onizleme ? (
        <form className="space-y-6" onSubmit={onayla}>
          <div>
            <h3 className="text-lg font-semibold">Öneri</h3>
            <p className="text-soluk">
              {onizleme.programCiktilari.length} program çıktısı, {onizleme.dersler.length} ders okundu.
              {onizleme.okunamayanDersler.length
                ? ` Okunamayan ders: ${onizleme.okunamayanDersler.join(", ")}. Bunlar eklenmez.`
                : ""}
            </p>
          </div>
          <details className="rounded-sm border border-cizgi px-4 py-3">
            <summary className="cursor-pointer font-semibold">
              Program çıktıları ({onizleme.programCiktilari.length})
            </summary>
            <ol className="mt-3 space-y-1">
              {onizleme.programCiktilari.map((p) => (
                <li key={p.kod}>
                  <span className="font-semibold">{p.kod}</span> {p.metin}
                </li>
              ))}
            </ol>
          </details>
          <fieldset className="rounded-sm border border-cizgi px-4 py-3">
            <legend className="px-1 font-semibold">Eklenecek dersler</legend>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {onizleme.dersler.map((d) => (
                <li key={d.kod}>
                  <IsaretKutusu
                    etiket={`${d.kod} ${d.ad}`}
                    ipucu={[d.akts !== null ? `${d.akts} AKTS` : null, d.yariyil ? `${d.yariyil}. yarıyıl` : null]
                      .filter(Boolean)
                      .join(", ")}
                    checked={secili.has(d.kod)}
                    onChange={(e) => {
                      const y = new Set(secili);
                      if (e.target.checked) y.add(d.kod);
                      else y.delete(d.kod);
                      setSecili(y);
                    }}
                  />
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <Secim etiket="Birim" value={birimSecimi} onChange={(e) => setBirimSecimi(e.target.value)}>
              {birimler.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.ad}
                </option>
              ))}
              <option value="yeni">Yeni birim ekle</option>
            </Secim>
            {birimSecimi === "yeni" ? (
              <>
                <MetinAlani
                  etiket="Yeni birimin adı"
                  value={birimAdi}
                  onChange={(e) => setBirimAdi(e.target.value)}
                  required
                />
                <Secim etiket="Birim türü" value={birimTuru} onChange={(e) => setBirimTuru(e.target.value)}>
                  {Object.entries(BIRIM_TURU_ADI).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Secim>
              </>
            ) : null}
            <MetinAlani
              etiket="Programın adı"
              ipucu="Bologna sayfaları programın adını vermez; siz yazın."
              value={programAdi}
              onChange={(e) => setProgramAdi(e.target.value)}
              required
            />
            <Secim etiket="Düzey" value={duzey} onChange={(e) => setDuzey(e.target.value)}>
              {Object.entries(DUZEY_ADI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Secim>
          </div>
          <Dugme tur="birincil" type="submit" disabled={bekliyor}>
            Öneriyi onayla ve kaydet
          </Dugme>
        </form>
      ) : null}
      <Basari ileti={sonuc} />
      <Hata ileti={hata} />
      <p className="text-sm text-soluk">
        Bologna adresiniz yoksa birim ve programları{" "}
        <a href="/panel/birimler" className="font-semibold text-vurgu underline underline-offset-4">
          Birimler ve programlar
        </a>{" "}
        ekranından elle ekleyebilirsiniz.{" "}
        <button type="button" onClick={atla} className="font-semibold text-vurgu underline underline-offset-4">
          Bu adımı atla
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- (d) Davet

interface DavetSatiri {
  no: number;
  adSoyad: string;
  eposta: string;
  dersler: string[];
  oneri: boolean;
}

const sonrakiNo = (l: DavetSatiri[]) => l.reduce((m, x) => Math.max(m, x.no), -1) + 1;

function DavetAdimi({
  onizleme,
  programId,
  setProgramId,
  bitti,
}: {
  onizleme: Onizleme | null;
  programId: string | null;
  setProgramId: (id: string) => void;
  bitti: () => void;
}) {
  const [satirlar, setSatirlar] = useState<DavetSatiri[]>(() =>
    (onizleme?.dersiVerenler ?? []).map((k, i) => ({
      no: i,
      adSoyad: k.ad,
      eposta: "",
      dersler: k.dersler,
      oneri: true,
    })),
  );
  const [programlar, setProgramlar] = useState<{ id: string; ad: string }[]>([]);
  const [csv, setCsv] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [rapor, setRapor] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    void kurulumIstegi<BirimKaydi[]>("GET", "birimler").then((s) => {
      if (!s.tamam) return;
      const ps = s.deger.flatMap((b) => b.programlar.map((p) => ({ id: p.id, ad: `${p.ad} (${b.ad})` })));
      setProgramlar(ps);
      if (!programId && ps[0]) setProgramId(ps[0].id);
    });
  }, [programId, setProgramId]);

  function csvUygula() {
    const kisiler = csvKisileri(csv);
    if (!kisiler.length) return setHata("Dosyada ad ve e-posta içeren satır bulunamadı. Her satıra: Ad Soyad; e-posta");
    const yeni = [...satirlar];
    let eslesen = 0;
    for (const k of kisiler) {
      const i = yeni.findIndex((s) => adAnahtari(s.adSoyad) === adAnahtari(k.adSoyad));
      if (i >= 0) {
        yeni[i] = { ...(yeni[i] as DavetSatiri), eposta: k.eposta };
        eslesen++;
      } else yeni.push({ no: sonrakiNo(yeni), adSoyad: k.adSoyad, eposta: k.eposta, dersler: [], oneri: false });
    }
    setSatirlar(yeni);
    setHata(null);
    setRapor(`${kisiler.length} satır okundu, ${eslesen} tanesi önerilen adlarla eşleşti.`);
  }

  async function gonder(e: FormEvent) {
    e.preventDefault();
    const hocalar = satirlar
      .filter((s) => s.eposta.trim())
      .map((s) => ({ adSoyad: s.adSoyad.trim(), eposta: s.eposta.trim() }));
    if (!programId) return setHata("Önce bir program seçin.");
    if (!hocalar.length) return setHata("En az bir kişinin e-posta adresini yazın.");
    setBekliyor(true);
    const s = await kurulumIstegi<{ gonderilen: number; hatalar: { eposta: string; ileti: string }[] }>(
      "POST",
      "davet",
      {
        programId,
        hocalar,
      },
    );
    setBekliyor(false);
    if (!s.tamam) return setHata(s.alanlar[0] ? `${s.hata} ${s.alanlar[0].ileti}` : s.hata);
    setHata(s.deger.hatalar.length ? s.deger.hatalar.map((h) => `${h.eposta}: ${h.ileti}`).join(" ") : null);
    setRapor(`${s.deger.gonderilen} davet gönderildi. Hocalar e-postadaki bağlantıyı açıp katılır.`);
  }

  return (
    <div className="space-y-5">
      <p className="max-w-2xl">
        Hocalar programa öğretim elemanı olarak davet edilir. Bologna'daki "Dersi Verenler" adları öneri olarak
        listelenir. E-posta adreslerini siz yazarsınız ya da CSV olarak yapıştırırsınız. Akredit addan e-posta adresi
        üretmez.
      </p>
      <Secim etiket="Program" value={programId ?? ""} onChange={(e) => setProgramId(e.target.value)}>
        {programlar.length ? null : <option value="">Önce bir program ekleyin</option>}
        {programlar.map((p) => (
          <option key={p.id} value={p.id}>
            {p.ad}
          </option>
        ))}
      </Secim>
      <details className="rounded-sm border border-cizgi px-4 py-3">
        <summary className="cursor-pointer font-semibold">CSV ile e-posta ekle</summary>
        <div className="mt-3 space-y-3">
          <UzunMetinAlani
            etiket="CSV içeriği"
            ipucu="Her satıra bir kişi: Ad Soyad; e-posta. Adlar önerilenlerle eşleşirse adres o satıra yazılır."
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Dugme onClick={csvUygula} disabled={!csv.trim()}>
            CSV'yi uygula
          </Dugme>
        </div>
      </details>
      <form onSubmit={gonder} className="space-y-4">
        {satirlar.length ? (
          <table className="w-full text-left">
            <caption className="sr-only">Davet edilecek kişiler</caption>
            <thead>
              <tr className="border-b border-cizgi">
                <th scope="col" className="py-2 pr-4">
                  Ad
                </th>
                <th scope="col" className="py-2">
                  E-posta
                </th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((s, i) => (
                <tr key={s.no} className="border-b border-cizgi align-top">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <span className="font-semibold">{s.adSoyad}</span>
                    {s.dersler.length ? <span className="block text-sm text-soluk">{s.dersler.join(", ")}</span> : null}
                    {s.oneri ? <span className="block text-sm text-soluk">Bologna önerisi</span> : null}
                  </th>
                  <td className="py-2">
                    <label className="sr-only" htmlFor={`davet-eposta-${i}`}>
                      {s.adSoyad} için e-posta
                    </label>
                    <input
                      id={`davet-eposta-${i}`}
                      type="email"
                      autoComplete="off"
                      className="w-full rounded border border-cizgi-guclu bg-yuzey px-3 py-2"
                      value={s.eposta}
                      onChange={(e) =>
                        setSatirlar(satirlar.map((x, j) => (j === i ? { ...x, eposta: e.target.value } : x)))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-soluk">Önerilen ad yok. Aşağıdan kişi ekleyin ya da CSV yapıştırın.</p>
        )}
        <KisiEkle
          ekle={(k) => setSatirlar([...satirlar, { ...k, no: sonrakiNo(satirlar), dersler: [], oneri: false }])}
        />
        <div className="flex flex-wrap gap-3">
          <Dugme tur="birincil" type="submit" disabled={bekliyor}>
            Davetleri gönder
          </Dugme>
          <Dugme tur="sessiz" onClick={bitti}>
            Devam et
          </Dugme>
        </div>
      </form>
      <Basari ileti={rapor} />
      <Hata ileti={hata} />
    </div>
  );
}

function KisiEkle({ ekle }: { ekle: (k: { adSoyad: string; eposta: string }) => void }) {
  const [ad, setAd] = useState("");
  const [eposta, setEposta] = useState("");
  return (
    <fieldset className="grid gap-3 rounded-sm border border-cizgi px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <legend className="px-1 font-semibold">Tek tek kişi ekle</legend>
      <MetinAlani etiket="Ad ve soyad" value={ad} onChange={(e) => setAd(e.target.value)} />
      <MetinAlani etiket="E-posta" type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} />
      <Dugme
        disabled={ad.trim().length < 3 || !eposta.includes("@")}
        onClick={() => {
          ekle({ adSoyad: ad.trim(), eposta: eposta.trim() });
          setAd("");
          setEposta("");
        }}
      >
        Listeye ekle
      </Dugme>
    </fieldset>
  );
}

// ---------------------------------------------------------------- (e) Çerçeve

function CerceveAdimi({ durum, bitti }: { durum: Durum; bitti: () => void }) {
  const [secenekler, setSecenekler] = useState<
    { kod: string; ad: string; surum: string; resmi: boolean; dogrulandi: boolean }[]
  >([]);
  const [secili, setSecili] = useState<Set<string>>(new Set(durum.cerceveler));
  const [hata, setHata] = useState<string | null>(null);
  const [tamam, setTamam] = useState(false);
  useEffect(() => {
    void kurulumIstegi<typeof secenekler>("GET", "cerceveler").then((s) => {
      if (s.tamam) setSecenekler(s.deger);
    });
  }, []);
  async function kaydet(e: FormEvent) {
    e.preventDefault();
    const s = await kurulumIstegi("POST", "cerceveler", { kodlar: [...secili] });
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setTamam(true);
    bitti();
  }
  return (
    <div className="max-w-2xl space-y-4">
      <form onSubmit={kaydet} className="space-y-4">
        <fieldset className="space-y-3">
          <legend className="font-semibold">Kurumunuzun izleyeceği çerçeveler</legend>
          {secenekler.map((c) => (
            <IsaretKutusu
              key={c.kod}
              etiket={`${c.ad} (sürüm ${c.surum})`}
              ipucu={
                c.resmi
                  ? c.dogrulandi
                    ? "Resmî metin, uzman doğruladı"
                    : "Resmî metin, uzman doğrulaması bekliyor"
                  : "Akredit iç çerçevesi, resmî değil"
              }
              checked={secili.has(c.kod)}
              onChange={(e) => {
                const y = new Set(secili);
                if (e.target.checked) y.add(c.kod);
                else y.delete(c.kod);
                setSecili(y);
              }}
            />
          ))}
        </fieldset>
        <Dugme tur="birincil" type="submit" disabled={!secili.size}>
          Seçimi kaydet ve kurulumu bitir
        </Dugme>
      </form>
      <Hata ileti={hata} />
      {tamam ? (
        <div role="status" className="space-y-3 rounded-sm border border-cizgi bg-zemin px-4 py-3">
          <p className="font-semibold">Kurulum tamamlandı.</p>
          <p>
            Hocalar davet e-postasını açınca kendi derslerini görür. Ayarları istediğiniz zaman değiştirebilirsiniz.
          </p>
          <BaglantiDugme href="/panel" tur="birincil">
            Panele git
          </BaglantiDugme>
        </div>
      ) : null}
    </div>
  );
}
