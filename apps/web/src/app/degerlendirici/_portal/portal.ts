// Değerlendirici portalı (İP-22): dış değerlendiricinin kanıtlara süreli, salt okunur ve kayıtlı erişimi.
//
// Güvenceler kodla uygulanır:
// - Portal aktörü yalnız kişinin etkin `degerlendirici` atamalarıyla kurulur; diğer rolleri portala taşınmaz.
//   Değerlendirici rolü matriste yalnız okuma eylemleri taşır, bu modül de hiçbir yazma işlevi sunmaz.
// - Süre bitince (ya da süresiz kaydedilmiş atamada) etkin atama yoktur: portal 403 verir ve reddi günlüğe yazar.
// - Kiracı yalıtımı servis katmanından gelir: her okuma `kiraciIslemi` içinde, satır güvenliği altındadır.
// - Her görüntüleme ve her soru-cevap değiştirilemez günlüğe eklenir; kurum bu kayıtları `erisimGunlugu` ile okur.
// - Soru-cevap yanıtı atıf güvencesinden geçer: kanıta bağlanamayan cümle `[EKSİK: …]` olarak işaretlenir.
//   Kanıt metni modele veri olarak (sınırlayıcı içinde) verilir, talimat olarak değil.

import {
  type Aktor,
  aktorYetkiliMi,
  Denetleyici,
  gunluge,
  islem,
  kanit,
  type ServisBaglami,
  ServisHatasi,
} from "@akredit/servis";
import { gunlugeYaz, type Islem, kiraciIslemi, sema } from "@akredit/vt";
import { atamaEtkinMi, kurumHedefi, OKUMA_EYLEMLERI } from "@akredit/yetki";
import {
  type AtifKaynagi,
  atifDenetle,
  atifsizlariIsaretle,
  guvenilmeyenSar,
  KALKAN_KURALI,
  type Saglayici,
  sayilariDenetle,
} from "@akredit/yz";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { z } from "zod";

export class PortalHatasi extends Error {
  readonly durum: 403 | 404 | 400;
  constructor(durum: 403 | 404 | 400, ileti: string) {
    super(ileti);
    this.durum = durum;
  }
}

export const SURE_DOLDU =
  "Değerlendirici erişiminiz yok ya da süresi doldu. Süre uzatımı için kurumun kalite birimine başvurun.";

/** Günlük eylem adları (hepsi `degerlendirici.` önekli; kurumun erişim günlüğü bu önekle süzülür). */
export const EYLEM = {
  odaGoruntulendi: "degerlendirici.kanit_odasi_goruntulendi",
  kanitGoruntulendi: "degerlendirici.kanit_goruntulendi",
  soruYanitlandi: "degerlendirici.soru_yanitlandi",
  erisimReddedildi: "degerlendirici.erisim_reddedildi",
} as const;

export interface PortalBaglami extends ServisBaglami {
  /** Değerlendirici erişiminin bittiği an (birden çok atamada en geç olanı). */
  erisimBitis: Date;
}

/**
 * Oturumdaki aktörden portal bağlamı kurar. Yalnız şu anda etkin `degerlendirici` atamaları kalır; API
 * anahtarının kapsamı da okuma eylemleriyle kesiştirilir. Etkin atama yoksa reddi günlüğe yazar, 403 verir.
 */
export async function portalBaglami(b: ServisBaglami): Promise<PortalBaglami> {
  const simdi = b.simdi();
  const atamalar = b.aktor.atamalar.filter((a) => a.rol === "degerlendirici" && atamaEtkinMi(a, simdi));
  if (atamalar.length === 0) {
    await kiraciIslemi(b.db, b.aktor.kurumId, (tx) =>
      gunlugeYaz(tx, {
        aktor: { tur: "kisi", id: b.aktor.kisiId },
        eylem: EYLEM.erisimReddedildi,
        hedef: { tur: "kurum", id: b.aktor.kurumId },
        ayrinti: { neden: "etkin_atama_yok", yol: b.aktor.tur },
        zaman: simdi,
      }),
    );
    throw new PortalHatasi(403, SURE_DOLDU);
  }
  const anahtarKapsami = b.aktor.anahtarKapsami ? b.aktor.anahtarKapsami.filter((e) => OKUMA_EYLEMLERI.has(e)) : null;
  const aktor: Aktor = { ...b.aktor, atamalar, anahtarKapsami };
  const erisimBitis = new Date(Math.max(...atamalar.map((a) => (a.bitis as Date).getTime())));
  return { db: b.db, simdi: b.simdi, aktor, erisimBitis };
}

// ---------------------------------------------------------------- kanıt odası

export interface OdaKaniti {
  id: string;
  baslik: string;
  dosyaAdi: string;
  ozet: string;
  belgeTarihi: string | null;
  olcutler: string[];
}

export interface OdaGrubu {
  /** Ölçüt kodu; ölçüte bağlanmamış kanıtlar için `null`. */
  olcut: string | null;
  kanitlar: OdaKaniti[];
}

export const OdaFiltresi = z.object({
  arama: z.string().trim().max(200).optional(),
  olcut: z.string().trim().max(50).optional(),
});

/** Ölçüt kodlarını doğal sırayla dizer: "A.2" < "A.10". */
export function olcutKarsilastir(a: string, b: string): number {
  return a.localeCompare(b, "tr", { numeric: true });
}

/** Kanıtları ölçüt ağacına göre gruplar (saf). Bir kanıt bağlı olduğu her ölçütün altında görünür. */
export function olcutlereGore(kanitlar: readonly OdaKaniti[]): OdaGrubu[] {
  const gruplar = new Map<string | null, OdaKaniti[]>();
  for (const k of kanitlar) {
    const anahtarlar = k.olcutler.length ? k.olcutler : [null];
    for (const o of anahtarlar) gruplar.set(o, [...(gruplar.get(o) ?? []), k]);
  }
  return [...gruplar.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : olcutKarsilastir(a, b)))
    .map(([olcut, liste]) => ({ olcut, kanitlar: liste }));
}

async function tumKanitlar(b: PortalBaglami, f: z.infer<typeof OdaFiltresi>) {
  const liste: OdaKaniti[] = [];
  let imlec: string | undefined;
  for (;;) {
    const s = await kanit.kanitlar(b, {
      sinir: 100,
      ...(f.arama ? { arama: f.arama } : {}),
      ...(f.olcut ? { olcut: f.olcut } : {}),
      ...(imlec ? { imlec } : {}),
    });
    for (const k of s.ogeler)
      liste.push({
        id: k.id,
        baslik: k.baslik,
        dosyaAdi: k.dosyaAdi,
        ozet: k.ozet,
        belgeTarihi: k.belgeTarihi ?? null,
        olcutler: k.olcutler,
      });
    if (!s.sonraki) return liste;
    imlec = s.sonraki;
  }
}

/** Kanıt odası: değerlendiricinin görebildiği kanıtlar, ölçüt ağacına göre. Görüntüleme günlüğe yazılır. */
export async function kanitOdasi(b: PortalBaglami, girdi: unknown = {}): Promise<OdaGrubu[]> {
  const f = OdaFiltresi.parse(girdi);
  const liste = await tumKanitlar(b, f);
  await islem(b, (tx) =>
    gunluge(tx, b, EYLEM.odaGoruntulendi, null, {
      arama: f.arama ?? null,
      olcut: f.olcut ?? null,
      sonuc: liste.length,
    }),
  );
  return olcutlereGore(liste);
}

/** Tek kanıt (belge görüntüleyici için metin parçalarıyla). Görüntüleme günlüğe yazılır. */
export async function kanitGoruntule(b: PortalBaglami, id: string) {
  const ayrinti = await kanit.kanit(b, id);
  await islem(b, (tx) => gunluge(tx, b, EYLEM.kanitGoruntulendi, { tur: "kanit", id }, { ozet: ayrinti.kanit.ozet }));
  return ayrinti;
}

// ---------------------------------------------------------------- ziyaret programı

export const ZiyaretProgrami = z
  .array(
    z.object({
      tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
      saat: z.string().max(20).optional(),
      etkinlik: z.string().min(1).max(200),
      yer: z.string().max(200).optional(),
    }),
  )
  .max(100);
export type ZiyaretProgrami = z.infer<typeof ZiyaretProgrami>;

/**
 * Ziyaret programı kurum ayarındaki `degerlendirici.ziyaretProgrami` alanından okunur (kurum yöneticisi girer).
 * Geçersiz ya da boşsa boş liste döner; program uydurulmaz.
 */
export async function ziyaretProgrami(b: PortalBaglami): Promise<ZiyaretProgrami> {
  return islem(b, async (tx) => {
    const [k] = await tx
      .select({ ayarlar: sema.kurum.ayarlar })
      .from(sema.kurum)
      .where(eq(sema.kurum.id, b.aktor.kurumId));
    const ham = (k?.ayarlar as { degerlendirici?: { ziyaretProgrami?: unknown } } | null)?.degerlendirici
      ?.ziyaretProgrami;
    const s = ZiyaretProgrami.safeParse(ham ?? []);
    return s.success
      ? [...s.data].sort((x, y) => `${x.tarih}${x.saat ?? ""}`.localeCompare(`${y.tarih}${y.saat ?? ""}`))
      : [];
  });
}

// ---------------------------------------------------------------- soru-cevap

export const SoruGirdisi = z.object({ soru: z.string().trim().min(3).max(1000) });

export interface SoruYaniti {
  yanit: string;
  /** Atıf güvencesinden ilk geçişte geçti mi? Geçmediyse kanıtsız cümleler EKSİK olarak işaretlendi. */
  gecerli: boolean;
  isaretlenen: number;
  kaynaklar: { kanitId: string; ozet: string; baslik: string }[];
}

const DURAK = new Set(["ve", "ile", "bir", "bu", "şu", "mi", "mı", "mu", "mü", "ne", "nasıl", "için", "de", "da"]);

/** Sorgudan arama sözcükleri (saf): küçük harf, 3+ harf, durak sözcükler hariç. */
export function sozcukler(metin: string): string[] {
  return [
    ...new Set(
      metin
        .toLocaleLowerCase("tr-TR")
        .split(/[^\p{L}\p{N}]+/u)
        .filter((s) => s.length >= 3 && !DURAK.has(s)),
    ),
  ];
}

/** Parça puanı (saf): sorudaki farklı sözcüklerden kaçı parçada geçiyor. */
export function parcaPuani(soruSozcukleri: readonly string[], metin: string): number {
  const m = metin.toLocaleLowerCase("tr-TR");
  return soruSozcukleri.filter((s) => m.includes(s)).length;
}

interface AdayParca {
  kanitId: string;
  ozet: string;
  baslik: string;
  capa: Record<string, unknown>;
  metin: string;
  puan: number;
}

async function adayParcalar(tx: Islem, b: PortalBaglami, soru: string, sinir: number): Promise<AdayParca[]> {
  const { kanitHedefi } = kanit;
  const d = new Denetleyici(tx, b);
  const kanitlar = await tx
    .select({
      id: sema.kanit.id,
      ozet: sema.kanit.ozet,
      dosyaAdi: sema.kanit.dosyaAdi,
      kapsamlar: sema.kanit.kapsamlar,
      kaynakAyrinti: sema.kanit.kaynakAyrinti,
    })
    .from(sema.kanit);
  const gorunur = await d.suz("kanit.oku", kanitlar, (k) => kanitHedefi(b.aktor.kurumId, k.kapsamlar));
  if (!gorunur.length) return [];
  const bilgi = new Map(gorunur.map((k) => [k.id, k]));
  const parcalar = await tx
    .select({ kanitId: sema.kanitParcasi.kanitId, capa: sema.kanitParcasi.capa, metin: sema.kanitParcasi.metin })
    .from(sema.kanitParcasi)
    .where(inArray(sema.kanitParcasi.kanitId, [...bilgi.keys()]));
  const s = sozcukler(soru);
  return parcalar
    .map((p) => {
      const k = bilgi.get(p.kanitId) as (typeof gorunur)[number];
      const ad = (k.kaynakAyrinti as { baslik?: unknown })?.baslik;
      return {
        kanitId: p.kanitId,
        ozet: k.ozet,
        baslik: typeof ad === "string" && ad.trim() ? ad : k.dosyaAdi,
        capa: (p.capa ?? {}) as Record<string, unknown>,
        metin: p.metin,
        puan: parcaPuani(s, p.metin),
      };
    })
    .filter((p) => p.puan > 0)
    .sort((x, y) => y.puan - x.puan)
    .slice(0, sinir);
}

function capaYazimi(c: Record<string, unknown>): string {
  const p: string[] = [];
  if (typeof c.sayfa === "number") p.push(`s.${c.sayfa}${typeof c.sayfaSon === "number" ? `-${c.sayfaSon}` : ""}`);
  if (typeof c.bolum === "string") p.push(`b.${c.bolum.replace(/\s+/gu, "")}`);
  if (typeof c.satir === "number") p.push(`st.${c.satir}`);
  if (typeof c.hucre === "string") p.push(`h.${c.hucre}`);
  if (typeof c.slayt === "number") p.push(`sl.${c.slayt}`);
  return p.join(" ");
}

const SISTEM = [
  "Bir akreditasyon değerlendiricisinin sorusunu yalnız verilen kanıt parçalarına dayanarak Türkçe yanıtla.",
  'Her olgusal cümlenin sonuna atıf koy: [K:<özetin ilk 8 karakteri> <konum>] ya da alıntıyla [K:<özet> s.3 "parçadan birebir alıntı"].',
  "Kanıtta olmayan bir şeyi yazma; bulamazsan [EKSİK: kanıtta bulunamadı] yaz. Kişi, tarih, sayı uydurma.",
  KALKAN_KURALI,
].join("\n");

/**
 * Kanıt deposu üzerinde atıflı soru-cevap. Yanıt atıf güvencesinden geçer; soru, yanıt ve kullanılan
 * kanıtların özetleri günlüğe yazılır. Sağlayıcı yurt dışındaysa ve kurum izin vermemişse soru reddedilir.
 */
export async function soruSor(b: PortalBaglami, saglayici: Saglayici, girdi: unknown): Promise<SoruYaniti> {
  const { soru } = SoruGirdisi.parse(girdi);
  const { aday, yurtDisiIzin } = await islem(b, async (tx) => {
    const [k] = await tx
      .select({ ayarlar: sema.kurum.ayarlar })
      .from(sema.kurum)
      .where(eq(sema.kurum.id, b.aktor.kurumId));
    const yz = (k?.ayarlar as { yz?: { yurtDisiIzin?: unknown } } | null)?.yz;
    return { aday: await adayParcalar(tx, b, soru, 12), yurtDisiIzin: yz?.yurtDisiIzin === true };
  });
  if (!saglayici.yurtIci && !yurtDisiIzin)
    throw new PortalHatasi(
      403,
      "Kurumunuz kanıtların yurt dışındaki bir yapay zekâ hizmetine gönderilmesine izin vermiyor. Soruyu kalite birimine iletin.",
    );

  let yanit: string;
  let gecerli: boolean;
  let isaretlenen = 0;
  const kaynaklar: AtifKaynagi[] = aday.map((p) => ({ ozet: p.ozet, parcalar: [{ capa: p.capa, metin: p.metin }] }));
  if (aday.length === 0) {
    yanit = "[EKSİK: Bu soruya yanıt verecek kanıt bulunamadı.]";
    gecerli = true;
  } else {
    const veri = aday
      .map((p) => guvenilmeyenSar(p.metin, { kaynak: `K:${p.ozet.slice(0, 8)} ${capaYazimi(p.capa)}`.trim() }).metin)
      .join("\n\n");
    const cevap = await saglayici.sohbet({
      mesajlar: [
        { rol: "sistem", icerik: SISTEM },
        {
          rol: "kullanici",
          icerik: `Kanıt parçaları:\n${veri}\n\nSoru: ${guvenilmeyenSar(soru, { kaynak: "soru" }).metin}`,
        },
      ],
      sicaklik: 0,
    });
    const d = atifDenetle(cevap.icerik, kaynaklar);
    gecerli = d.gecerli;
    if (d.gecerli) yanit = cevap.icerik;
    else {
      const i = atifsizlariIsaretle(cevap.icerik, kaynaklar);
      yanit = i.metin;
      isaretlenen = i.degisen;
    }
    // Atıf geçerli olsa da cümledeki sayı atıf verilen kanıtta yoksa uydurmadır (ilke 2): yanıt verilmez.
    const sayi = sayilariDenetle(yanit, { kaynaklar });
    if (sayi.dayanaksiz.length) {
      gecerli = false;
      isaretlenen += sayi.dayanaksiz.length;
      yanit = "[EKSİK: Yanıttaki sayılar kanıtla doğrulanamadı. Sorunuzu kalite birimine iletin.]";
    }
  }
  // Yalnız yanıtta gerçekten atıf yapılan kanıtlar kaynak sayılır.
  const atifli = atifDenetle(yanit, kaynaklar)
    .cumleler.flatMap((c) => c.atiflar.map((a) => a.ozetOneki))
    .filter(Boolean);
  const kullanilan = new Map<string, SoruYaniti["kaynaklar"][number]>();
  for (const p of aday)
    if (atifli.some((o) => p.ozet.toLowerCase().startsWith(o)))
      kullanilan.set(p.kanitId, { kanitId: p.kanitId, ozet: p.ozet, baslik: p.baslik });
  const sonuc: SoruYaniti = { yanit, gecerli, isaretlenen, kaynaklar: [...kullanilan.values()] };
  await islem(b, (tx) =>
    gunluge(tx, b, EYLEM.soruYanitlandi, null, {
      soru,
      yanit,
      atifGecerli: gecerli,
      isaretlenen,
      kanitlar: sonuc.kaynaklar.map((k) => k.ozet),
      saglayici: saglayici.ad,
      model: saglayici.model,
    }),
  );
  return sonuc;
}

// ---------------------------------------------------------------- kurumun erişim günlüğü

export interface ErisimKaydi {
  id: string;
  zaman: string;
  kisiId: string | null;
  kisiAdi: string | null;
  eylem: string;
  hedef: string | null;
  ayrinti: Record<string, unknown>;
}

/**
 * Değerlendirici erişim günlüğü: kurum düzeyinde `gunluk.oku` yetkisi olan kişi (ör. kurum yöneticisi,
 * kalite komisyonu başkanı) okur. Değerlendirici kendisi okuyamaz (rolünde `gunluk.oku` yok).
 */
export async function erisimGunlugu(b: ServisBaglami, sinir = 500): Promise<ErisimKaydi[]> {
  if (!aktorYetkiliMi(b.aktor, "gunluk.oku", kurumHedefi(b.aktor.kurumId), b.simdi())) {
    // Ret kaydı ve 403 servis katmanının ortak yolundan.
    await islem(b, async (_tx, gerekli) => {
      await gerekli("gunluk.oku", { tur: "kurum", id: b.aktor.kurumId });
    });
  }
  return islem(b, async (tx) => {
    const satir = await tx
      .select({
        id: sema.gunluk.id,
        zaman: sema.gunluk.zaman,
        aktorId: sema.gunluk.aktorId,
        eylem: sema.gunluk.eylem,
        hedefTuru: sema.gunluk.hedefTuru,
        hedefId: sema.gunluk.hedefId,
        ayrinti: sema.gunluk.ayrinti,
        kisiAdi: sema.kisi.adSoyad,
      })
      .from(sema.gunluk)
      .leftJoin(sema.kisi, and(eq(sema.gunluk.aktorTuru, "kisi"), sql`${sema.kisi.id}::text = ${sema.gunluk.aktorId}`))
      .where(like(sema.gunluk.eylem, "degerlendirici.%"))
      .orderBy(desc(sema.gunluk.sira))
      .limit(sinir);
    return satir.map((r) => ({
      id: r.id,
      zaman: r.zaman.toISOString(),
      kisiId: r.aktorId,
      kisiAdi: r.kisiAdi ?? null,
      eylem: r.eylem,
      hedef: r.hedefTuru && r.hedefId ? `${r.hedefTuru}:${r.hedefId}` : null,
      ayrinti: (r.ayrinti ?? {}) as Record<string, unknown>,
    }));
  });
}

/** Servis ya da portal hatasını kullanıcıya gösterilecek ileti ve durum koduna çevirir. */
export function hataBilgisi(e: unknown): { durum: number; ileti: string } | null {
  if (e instanceof PortalHatasi) return { durum: e.durum, ileti: e.message };
  if (e instanceof ServisHatasi) return { durum: e.durum, ileti: e.message };
  if (e instanceof z.ZodError) return { durum: 400, ileti: "Sorunuz boş ya da çok uzun. Düzeltip yeniden deneyin." };
  return null;
}
