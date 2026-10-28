// Demo neslini veritabanına yükler (İP-41). Kurum yalnız `demo_kurumu_ac()` ile açılır (kurum.demo = true);
// kurumun içi tek bir kiracı işleminde, satır güvenliği altında yazılır. Bu yüzden yükleyici gerçek bir kurumun
// satırına dokunamaz. Kanıt, öneri, karar ve günlük yalnız eklenir; eski nesil silinmez, etkinliğini yitirir.
//
// Kanıt dosyaları nesne deposuna yazılmaz: belge metni kanıt parçalarına yazılır, kanıt özeti metnin
// SHA-256 özetidir ve depo anahtarı `demo/` ile başlar (demo ziyaretçisi dosya yükleyemez ve indiremez).

import { ozetHesapla } from "@akredit/cekirdek";
import { gunlugeYaz, type Islem, kiraciIslemi, type SorguSonucu, satirlar, sema, type Vt } from "@akredit/vt";
import { and, eq, gt, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { DemoRolu, Kapsam, OrnekUniversite, VtRolu } from "./turler.ts";
import { LIKERT_SORULARI, ornekUniversiteUret, type UretimSecenekleri, VARSAYILAN_TOHUM, VERI_SURUMU } from "./uret.ts";

export interface PersonaKaydi {
  kisiId: string;
  atamalar: { rol: VtRolu; kapsamTuru: Kapsam["tur"]; kapsamId: string }[];
}

/** `kurum.ayarlar.demo` altında saklanan bilgi. Ziyaretçi oturumu rol atamalarını buradan kopyalar. */
export interface DemoAyari {
  surum: string;
  tohum: number;
  personalar: Record<DemoRolu, PersonaKaydi>;
}

export interface YuklemeSonucu {
  kurumId: string;
  sayilar: Record<string, number>;
}

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Büyük eklemeleri parçalar (PostgreSQL parametre sınırı 65535). */
async function parcaliEkle<T>(ekle: (parca: T[]) => Promise<unknown>, satirlar: T[], boy = 4000) {
  for (let i = 0; i < satirlar.length; i += boy) await ekle(satirlar.slice(i, i + boy));
}

/**
 * Yeni bir demo nesli açar ve verilen (ya da tohumdan üretilen) veriyi yükler. Bitince nesli "hazır"
 * işaretler; `etkin_demo_kurumu()` bundan sonra yeni kurumu döndürür.
 */
export async function demoNesliYukle(
  db: Vt,
  girdi: OrnekUniversite | UretimSecenekleri = {},
  kimlikUret: () => string = sema.yeniKimlik,
): Promise<YuklemeSonucu> {
  const u = "birimler" in girdi ? girdi : ornekUniversiteUret(girdi);
  const kurumId = kimlikUret();
  await db.execute(sql`select demo_kurumu_ac(${kurumId}::uuid, ${u.kurum.ad}, ${u.tohum}, ${u.surum})`);
  const sayilar = await kiraciIslemi(db, kurumId, (tx) => yukle(tx, kurumId, u, kimlikUret));
  await db.update(sema.demoNesli).set({ hazir: sql`now()` }).where(eq(sema.demoNesli.demoKurumId, kurumId));
  return { kurumId, sayilar };
}

async function yukle(
  tx: Islem,
  kurumId: string,
  u: OrnekUniversite,
  yeni: () => string,
): Promise<Record<string, number>> {
  const id = new Map<string, string>();
  const ver = (anahtar: string) => {
    const k = yeni();
    id.set(anahtar, k);
    return k;
  };
  const al = (anahtar: string) => {
    const k = id.get(anahtar);
    if (!k) throw new Error(`Örnek veri: bilinmeyen anahtar ${anahtar}`);
    return k;
  };
  const kapsamId = (k: Kapsam) => (k.tur === "kurum" ? kurumId : al(`${k.tur}:${k.anahtar}`));

  // Birimler (fakülte önce), programlar, dönemler, kişiler.
  for (const b of u.birimler)
    await tx.insert(sema.birim).values({
      id: ver(`birim:${b.anahtar}`),
      kurumId,
      tur: b.tur,
      ad: b.ad,
      kod: b.kod,
      ustBirimId: b.ust ? al(`birim:${b.ust}`) : null,
    });
  await tx.insert(sema.program).values(
    u.programlar.map((p) => ({
      id: ver(`program:${p.anahtar}`),
      kurumId,
      birimId: al(`birim:${p.birim}`),
      ad: p.ad,
      duzey: p.duzey,
      ogretimTuru: "örgün",
    })),
  );
  await tx
    .insert(sema.donem)
    .values(
      u.donemler.map((d) => ({
        id: ver(`donem:${d.anahtar}`),
        kurumId,
        ad: d.ad,
        baslangic: d.baslangic,
        bitis: d.bitis,
      })),
    );
  await tx
    .insert(sema.kisi)
    .values(u.kisiler.map((k) => ({ id: ver(`kisi:${k.anahtar}`), kurumId, adSoyad: k.adSoyad, unvan: k.unvan })));

  // Çıktılar: program (PÇ) ve ders (ÖÇ).
  const ciktilar: (typeof sema.cikti.$inferInsert)[] = [];
  for (const p of u.programlar)
    for (const c of p.ciktilar)
      ciktilar.push({
        id: ver(`cikti:${p.anahtar}:${c.kod}`),
        kurumId,
        tur: "program",
        sahipId: al(`program:${p.anahtar}`),
        kod: c.kod,
        metin: c.metin,
      });
  await tx.insert(sema.ders).values(
    u.dersler.map((d) => ({
      id: ver(`ders:${d.anahtar}`),
      kurumId,
      programId: al(`program:${d.program}`),
      kod: d.kod,
      ad: d.ad,
      akts: d.akts,
      teorik: d.teorik,
      uygulama: d.uygulama,
      yariyil: d.yariyil,
      zorunlu: d.zorunlu,
    })),
  );
  for (const d of u.dersler)
    for (const c of d.ciktilar)
      ciktilar.push({
        id: ver(`cikti:${d.anahtar}:${c.kod}`),
        kurumId,
        tur: "ders",
        sahipId: al(`ders:${d.anahtar}`),
        kod: c.kod,
        metin: c.metin,
      });
  await parcaliEkle((p) => tx.insert(sema.cikti).values(p), ciktilar);

  // Katkı matrisi: önceki dönemde program sorumlusunun onayladığı öneriden (karar zorunlu dayanaktır).
  const katkilar: (typeof sema.katki.$inferInsert)[] = [];
  for (const d of u.dersler) {
    if (!d.matris) continue;
    const sorumlu = al(`kisi:${d.program}-k1`);
    const oneriId = yeni();
    await tx.insert(sema.oneri).values({
      id: oneriId,
      kurumId,
      tur: "matris_katkisi",
      hedefTuru: "ders",
      hedefId: al(`ders:${d.anahtar}`),
      icerik: json({
        baslik: `${d.kod} katkı matrisi`,
        metin: "Önceki dönemde onaylanan katkı matrisi.",
        matris: d.matris,
      }),
      gerekce: "Örnek veri: önceki dönemin onaylı matrisi.",
      ureticiTuru: "kisi",
      uretici: { kisiId: sorumlu },
      risk: "orta",
      olusturma: new Date("2025-09-01T09:00:00Z"),
    });
    const kararId = yeni();
    await tx.insert(sema.karar).values({
      id: kararId,
      kurumId,
      oneriId,
      sonuc: "onaylandi",
      kararVerenKisiId: sorumlu,
      dayanak: "dogrudan",
      zaman: new Date("2025-09-02T09:00:00Z"),
    });
    for (const [ck, satir] of Object.entries(d.matris))
      for (const [pc, deger] of Object.entries(satir))
        katkilar.push({
          kurumId,
          dersCiktiId: al(`cikti:${d.anahtar}:${ck}`),
          programCiktiId: al(`cikti:${d.program}:${pc}`),
          deger: deger.tur === "puan" ? String(deger.puan) : deger.tur,
          kararId,
        });
  }
  await parcaliEkle((p) => tx.insert(sema.katki).values(p), katkilar);

  // Ders açılışları, ölçme araçları, sorular, takma adlı puanlar, ölçme sonuçları.
  const puanlar: (typeof sema.ogrenciPuani.$inferInsert)[] = [];
  for (const a of u.acilislar) {
    const acilisId = ver(`acilis:${a.anahtar}`);
    await tx.insert(sema.dersAcilisi).values({
      id: acilisId,
      kurumId,
      dersId: al(`ders:${a.ders}`),
      donemId: al(`donem:${a.donem}`),
      sorumluKisiIdleri: [al(`kisi:${a.sorumlu}`)],
    });
    const soruId = new Map<string, string>();
    for (const arac of a.veri.araclar) {
      const aracId = yeni();
      await tx.insert(sema.olcmeAraci).values({
        id: aracId,
        kurumId,
        dersAcilisiId: acilisId,
        tur: arac.tur === "laboratuvar" || arac.tur === "sunum" ? "diger" : arac.tur,
        ad: arac.ad,
        agirlik: String(arac.agirlik),
      });
      const sorular = arac.sorular.map((q) => {
        const sid = yeni();
        soruId.set(`${arac.id}|${q.no}`, sid);
        return {
          id: sid,
          kurumId,
          olcmeAraciId: aracId,
          numara: q.no,
          tamPuan: String(q.tamPuan),
          ciktiEslemesi: q.eslemeler.map((e) => ({ ciktiId: al(`cikti:${a.ders}:${e.ciktiKod}`), agirlik: e.agirlik })),
        };
      });
      await tx.insert(sema.soru).values(sorular);
      soruId.set(`${arac.id}|arac`, aracId);
    }
    for (const p of a.veri.puanlar)
      puanlar.push({
        kurumId,
        olcmeAraciId: soruId.get(`${p.aracId}|arac`) as string,
        soruId: soruId.get(`${p.aracId}|${p.soruNo}`) as string,
        ogrenciTakmaAd: p.ogrenci,
        puan: p.puan === null ? null : String(p.puan),
      });
    const ckId = (kod: string) => al(`cikti:${a.ders}:${kod}`);
    // Sonuç biçimi ders dosyası üretimiyle aynı (`@akredit/servis ders-dosyasi`): tam sonuç + panelin ÇK
    // satırları. Öğrenci bazlı ayrıntı (takma ad → not) sonuç kaydına yazılmaz; puanlar zaten tabloda.
    const s = a.sonuc;
    await tx.insert(sema.olcmeSonucu).values({
      kurumId,
      dersAcilisiId: acilisId,
      hesapSurumu: s.hesapSurumu,
      girdiOzeti: s.girdiOzeti,
      sonuc: json({
        ...s,
        ckBasarilari: s.ckBasarilari.map(({ ogrenciler: _o, ...c }) => c),
        notIstatistikleri: { ...s.notIstatistikleri, notlar: {} },
        ciktilar: s.ckBasarilari
          .filter((c) => c.ortalama !== null)
          .map((c) => ({ ciktiId: ckId(c.ckKod), kod: c.ckKod, saglanma: (c.ortalama as number) / 100 })),
      }),
    });
  }
  await parcaliEkle((p) => tx.insert(sema.ogrenciPuani).values(p), puanlar, 5000);

  // Anketler ve anonim yanıtlar.
  const anketYanitlari: (typeof sema.anketYaniti.$inferInsert)[] = [];
  for (const k of u.anketler) {
    const a = u.acilislar.find((x) => x.anahtar === k.acilis);
    const donem = u.donemler.find((d) => d.anahtar === a?.donem);
    const ders = u.dersler.find((d) => d.anahtar === a?.ders);
    const anketId = yeni();
    const baslangic = `${donem?.bitis ?? "2026-01-01"}T00:00:00.000Z`;
    await tx.insert(sema.anket).values({
      id: anketId,
      kurumId,
      baslik: `${ders?.kod ?? ""} ders değerlendirme anketi (${donem?.ad ?? ""})`,
      kapsam: json({
        tanim: {
          sablon: "ders_degerlendirme",
          baslik: "Ders değerlendirme anketi",
          hedefKitle: "ogrenci",
          sorular: LIKERT_SORULARI.map((s) => ({
            kod: s.kod,
            metin: s.metin,
            tur: "likert",
            secenekler: [
              "Kesinlikle katılmıyorum",
              "Katılmıyorum",
              "Kararsızım",
              "Katılıyorum",
              "Kesinlikle katılıyorum",
            ],
            zorunlu: false,
          })),
        },
        ayar: { erisim: "davet", baslangic, bitis: baslangic.replace("T00", "T23"), hatirlatmalar: [], esik: 5 },
        durum: "kapali",
        baglam: { ders: ders?.kod ?? "" },
        gonderim: { alicilar: [], davetSayisi: k.davetSayisi, yapilanlar: ["davet", "kapanis"] },
      }),
      baslangic: new Date(baslangic),
      bitis: new Date(baslangic.replace("T00", "T23")),
    });
    for (const y of k.yanitlar) anketYanitlari.push({ kurumId, anketId, yanitlar: y });
  }
  await parcaliEkle((p) => tx.insert(sema.anketYaniti).values(p), anketYanitlari);

  // Belgeler: kanıt + işleme kaydı + parçalar (bölüm başına bir parça).
  const parcaId = new Map<string, string>();
  for (const b of u.belgeler) {
    const metin = b.bolumler.map((x) => `${x.baslik}\n${x.metin}`).join("\n\n");
    const ozet = ozetHesapla(`${b.anahtar}\n${metin}`);
    const kanitId = ver(`kanit:${b.anahtar}`);
    const kapsamlar = b.kapsam.tur === "kurum" ? [] : [{ tur: b.kapsam.tur, id: kapsamId(b.kapsam) }];
    await tx.insert(sema.kanit).values({
      id: kanitId,
      kurumId,
      ozet,
      dosyaAdi: b.dosyaAdi,
      mime: b.dosyaAdi.endsWith(".html") ? "text/html" : "application/pdf",
      boyut: Buffer.byteLength(metin),
      depoAnahtari: `demo/${ozet}`,
      kaynakTuru: b.tur === "bologna" ? "baglayici" : "yukleme",
      kaynakAyrinti: { ornekVeri: true, baslik: b.baslik },
      belgeTarihi: b.tarih,
      kapsamlar,
      kisiselVeri: "yok",
    });
    await tx.insert(sema.kanitIsleme).values({
      kurumId,
      kanitId,
      durum: "metin_cikarildi",
      ayrinti: { asama: "tamam", kisiselVeri: "yok" },
    });
    await tx.insert(sema.kanitParcasi).values(
      b.bolumler.map((x, i) => {
        const pid = yeni();
        parcaId.set(`${b.anahtar}:${i}`, pid);
        return {
          id: pid,
          kurumId,
          kanitId,
          sira: i,
          capa: { bolum: x.baslik },
          metin: `${x.baslik}\n${x.metin}`,
          dil: "tr",
        };
      }),
    );
  }

  // Karar bekleyen öneriler: önceden hesaplanmış kural çıktıları (dış yapay zekâ çağrısı yok).
  for (const o of u.oneriler) {
    const hedefId =
      o.hedef.tur === "kurum"
        ? kurumId
        : o.hedef.tur === "kanit"
          ? al(`kanit:${o.hedef.anahtar}`)
          : al(`${o.hedef.tur}:${o.hedef.anahtar}`);
    await tx.insert(sema.oneri).values({
      kurumId,
      tur: o.tur,
      hedefTuru: o.hedef.tur,
      hedefId,
      icerik: { baslik: o.baslik, metin: o.metin },
      gerekce: o.gerekce,
      atiflar: o.atiflar.map((a) => ({
        kanitId: al(`kanit:${a.belge}`),
        parcaId: parcaId.get(`${a.belge}:${a.bolum}`),
        alinti: a.alinti,
      })),
      guven: null,
      ureticiTuru: "kural",
      uretici: { kural: "ornek-veri", surum: u.surum },
      risk: o.risk,
    });
  }

  // PÜKÖ geçmişi: eylemler.
  await tx.insert(sema.eylem).values(
    u.eylemler.map((e) => ({
      kurumId,
      kaynak: { tur: "bulgu", aciklama: e.kaynak },
      tanim: e.tanim,
      sorumluKisiId: al(`kisi:${e.sorumlu}`),
      hedefTarih: new Date(`${e.hedefTarih}T12:00:00Z`),
      pukoAsamasi: e.asama,
      kanitIdleri: e.belgeler.map((b) => al(`kanit:${b}`)),
    })),
  );

  // Kurum ayarı: eşik ve demo rollerinin şablonu (ziyaretçi oturumu atamaları buradan kopyalar).
  const personalar = Object.fromEntries(
    u.personalar.map((p) => [
      p.rol,
      {
        kisiId: al(`kisi:${p.kisi}`),
        atamalar: p.atamalar.map((a) => ({ rol: a.rol, kapsamTuru: a.kapsam.tur, kapsamId: kapsamId(a.kapsam) })),
      },
    ]),
  ) as Record<DemoRolu, PersonaKaydi>;
  const demo: DemoAyari = { surum: u.surum, tohum: u.tohum, personalar };
  await tx
    .update(sema.kurum)
    .set({ ayarlar: json({ esikler: { saglanma: u.kurum.esik / 100, ckBasari: u.kurum.esik }, demo }) })
    .where(eq(sema.kurum.id, kurumId));

  const sayilar = {
    birim: u.birimler.length,
    program: u.programlar.length,
    ders: u.dersler.length,
    ogrenci: u.ogrenciler.length,
    puan: puanlar.length,
    anketYaniti: anketYanitlari.length,
    kanit: u.belgeler.length,
    oneri: u.oneriler.length,
    eylem: u.eylemler.length,
  };
  await gunlugeYaz(tx, {
    aktor: { tur: "sistem", id: null },
    eylem: "demo.yuklendi",
    hedef: { tur: "kurum", id: kurumId },
    ayrinti: { surum: u.surum, tohum: u.tohum, ...sayilar },
  });
  return sayilar;
}

/** Hazır en yeni demo neslinin kurumu; yoksa `null`. */
export async function etkinDemoKurumu(db: Vt): Promise<string | null> {
  const r = (await db.execute(sql`select etkin_demo_kurumu()::text as id`)) as unknown as SorguSonucu<{
    id: string | null;
  }>;
  return satirlar(r)[0]?.id ?? null;
}

/** Kurum demo kurumu mu? (Kurum tablosunu okumadan, tanımlayıcı haklı işlevle.) */
export async function demoKurumuMu(db: Vt, kurumId: string): Promise<boolean> {
  const r = (await db.execute(sql`select demo_kurumu_mu(${kurumId}::uuid) as d`)) as unknown as SorguSonucu<{
    d: boolean;
  }>;
  return satirlar(r)[0]?.d === true;
}

export interface YenilemeSonucu {
  durum: "yuklendi" | "gerek_yok";
  neden: string;
  kurumId: string;
}

/**
 * Gece yenilemesi: etkin nesil yoksa, veri sürümü ya da tohum değiştiyse ya da ziyaretçiler etkin nesilde karar
 * verdiyse yeni nesil yükler. Hiç değişmemiş nesli yeniden yüklemez (yalnız eklenen tablolarda gereksiz büyüme
 * olmasın diye). Eski nesil silinmez.
 */
export async function demoYenile(db: Vt, s: UretimSecenekleri & { zorla?: boolean } = {}): Promise<YenilemeSonucu> {
  const etkin = await etkinDemoKurumu(db);
  const tohum = s.tohum ?? VARSAYILAN_TOHUM;
  let neden = "";
  if (!etkin) neden = "etkin demo nesli yok";
  else if (s.zorla) neden = "elle istendi";
  else {
    const [n] = await db.select().from(sema.demoNesli).where(eq(sema.demoNesli.demoKurumId, etkin));
    if (!n || n.veriSurumu !== VERI_SURUMU || n.tohum !== tohum) neden = "veri sürümü değişti";
    else {
      const hazir = n.hazir ?? n.olusturma;
      const kararlar = await kiraciIslemi(db, etkin, (tx) =>
        tx.select({ id: sema.karar.id }).from(sema.karar).where(gt(sema.karar.zaman, hazir)).limit(1),
      );
      if (kararlar.length) neden = "ziyaretçiler karar verdi";
    }
  }
  if (!neden && etkin) return { durum: "gerek_yok", neden: "etkin nesil değişmedi", kurumId: etkin };
  const { zorla: _z, ...uretim } = s;
  const y = await demoNesliYukle(db, { ...uretim, tohum });
  return { durum: "yuklendi", neden, kurumId: y.kurumId };
}

/**
 * Süresi dolan demo ziyaretçi hesaplarını kimlik tablolarından siler (oturum, giriş izi, üyelik, kullanıcı).
 * Kiracı tablolarındaki ziyaretçi kişisi ve kararları eski demo neslinde kalır. Silinen üyelik sayısını verir.
 */
export async function suresiDolanDemoHesaplariniSil(db: Vt, simdi: Date): Promise<number> {
  const uyelikler = await db
    .select({ id: sema.kimlikUyelik.id, kullaniciId: sema.kimlikUyelik.kullaniciId })
    .from(sema.kimlikUyelik)
    .where(and(isNotNull(sema.kimlikUyelik.demoBitis), lt(sema.kimlikUyelik.demoBitis, simdi)));
  if (!uyelikler.length) return 0;
  await db.delete(sema.kimlikUyelik).where(
    inArray(
      sema.kimlikUyelik.id,
      uyelikler.map((u) => u.id),
    ),
  );
  const kullanicilar = uyelikler.map((u) => u.kullaniciId).filter((x): x is string => typeof x === "string");
  if (kullanicilar.length) await db.delete(sema.kimlikKullanici).where(inArray(sema.kimlikKullanici.id, kullanicilar));
  return uyelikler.length;
}

/** Demo kurumunun ayarındaki rol şablonları. */
export async function demoAyariOku(db: Vt, kurumId: string): Promise<DemoAyari | null> {
  const [k] = await kiraciIslemi(db, kurumId, (tx) =>
    tx
      .select({ ayarlar: sema.kurum.ayarlar, demo: sema.kurum.demo })
      .from(sema.kurum)
      .where(eq(sema.kurum.id, kurumId)),
  );
  if (!k?.demo) return null;
  return ((k.ayarlar as { demo?: DemoAyari }).demo ?? null) as DemoAyari | null;
}
