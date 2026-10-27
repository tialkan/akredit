// Gerçek veri kaynağı (sunucu tarafı): `VeriKaynagi` arayüzünü `@akredit/servis` ile uygular. Her çağrı
// oturumdaki kişinin yetkisiyle, kiracı işleminde ve gerekirse günlüğe yazarak çalışır. İstemci bileşenleri
// aynı arayüzü `istemci.ts` (fetch → /api/v1) üzerinden kullanır.

import {
  akademik,
  kanit,
  oneri,
  panel,
  politika,
  rapor,
  type Sayfa,
  type ServisBaglami,
  ServisHatasi,
} from "@akredit/servis";
import type {
  Ayarlar,
  BaglantiSonucu,
  Ders,
  IslemSonucu,
  KanitAyrintisi,
  KanitFiltresi,
  KanitGorunumu,
  KanitHattiOzeti,
  Kullanici,
  OneriGorunumu,
  PanelOzeti,
  PolitikaKaydi,
  Program,
  Rapor,
  SurecGorevi,
  VeriKaynagi,
} from "./kaynak.ts";

/** Servis hatası kullanıcıya gösterilebilir Türkçe ileti taşır; diğerleri genel iletiye çevrilir. */
async function sonuc<T>(is: () => Promise<T>): Promise<IslemSonucu<T>> {
  try {
    return { tamam: true, deger: await is() };
  } catch (e) {
    if (e instanceof ServisHatasi) return { tamam: false, hata: e.message };
    if (e && typeof e === "object" && "issues" in e)
      return { tamam: false, hata: "Gönderilen bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin." };
    throw e;
  }
}

/** Kayıt yoksa ya da görme yetkisi yoksa `null` (sayfa "bulunamadı" gösterir). */
async function yoksaBos<T>(is: () => Promise<T>): Promise<T | null> {
  try {
    return await is();
  } catch (e) {
    if (e instanceof ServisHatasi && (e.kod === "bulunamadi" || e.kod === "yetki_yok")) return null;
    throw e;
  }
}

async function hepsi<T>(al: (imlec?: string) => Promise<Sayfa<T>>): Promise<T[]> {
  const liste: T[] = [];
  let imlec: string | undefined;
  for (;;) {
    const s = await al(imlec);
    liste.push(...s.ogeler);
    if (!s.sonraki) return liste;
    imlec = s.sonraki;
  }
}

// Servis çıktıları arayüz türleriyle aynı biçimdedir; yalnız kimlik türleri (marka) farklıdır.
const tur = <T>(x: unknown) => x as T;

export class ServisVeriKaynagi implements VeriKaynagi {
  readonly #b: ServisBaglami;
  constructor(b: ServisBaglami) {
    this.#b = b;
  }

  async kullanici() {
    return tur<Kullanici>(await panel.kullanici(this.#b));
  }
  async panelOzeti() {
    return tur<PanelOzeti>(await panel.panelOzeti(this.#b));
  }
  async bekleyenOneriler() {
    return tur<OneriGorunumu[]>(
      await hepsi((imlec) => oneri.bekleyenOneriler(this.#b, { sinir: 100, ...(imlec ? { imlec } : {}) })),
    );
  }
  async kararlar() {
    return tur<Awaited<ReturnType<VeriKaynagi["kararlar"]>>>(
      await hepsi((imlec) => oneri.kararlar(this.#b, { sinir: 100, ...(imlec ? { imlec } : {}) })),
    );
  }
  async kanitlar(filtre: KanitFiltresi = {}) {
    return tur<KanitGorunumu[]>(
      await hepsi((imlec) => kanit.kanitlar(this.#b, { ...filtre, sinir: 100, ...(imlec ? { imlec } : {}) })),
    );
  }
  async kanit(id: string) {
    return tur<KanitAyrintisi | null>(await yoksaBos(() => kanit.kanit(this.#b, id)));
  }
  async kanitHattiOzeti() {
    return tur<KanitHattiOzeti>(await kanit.kanitHattiOzeti(this.#b));
  }
  async programlar() {
    return tur<Program[]>(await akademik.programlar(this.#b));
  }
  async program(id: string) {
    return tur<Program | null>(await yoksaBos(() => akademik.program(this.#b, id)));
  }
  async dersler() {
    return tur<Ders[]>(await akademik.dersler(this.#b));
  }
  async ders(id: string) {
    return tur<Ders | null>(await yoksaBos(() => akademik.ders(this.#b, id)));
  }
  async raporlar() {
    return tur<Rapor[]>(await rapor.raporlar(this.#b));
  }
  async rapor(id: string) {
    return tur<Rapor | null>(await yoksaBos(() => rapor.rapor(this.#b, id)));
  }
  async surecler() {
    return tur<SurecGorevi[]>(await rapor.surecler(this.#b));
  }
  async ayarlar() {
    // Ayarları görme yetkisi olmayan kişi için kurum adı yine gösterilir, politikalar boş kalır.
    const a = await yoksaBos(() => politika.ayarlar(this.#b));
    return tur<Ayarlar>(
      a ?? {
        kurumAdi: "",
        kurumKisaAdi: "",
        yzSaglayici: "kurum_sunucusu",
        yurtDisiIzni: false,
        yzAnahtar: null,
        politikalar: [],
      },
    );
  }

  kararVer(girdi: Parameters<VeriKaynagi["kararVer"]>[0]) {
    return sonuc(async () =>
      tur<Awaited<ReturnType<typeof oneri.kararVer>>>(await oneri.kararVer(this.#b, girdi)),
    ) as ReturnType<VeriKaynagi["kararVer"]>;
  }
  topluKararVer(oneriIdleri: Parameters<VeriKaynagi["topluKararVer"]>[0], sureMs?: number) {
    return sonuc(() =>
      oneri.topluKararVer(this.#b, { oneriIdleri, ...(sureMs !== undefined ? { sureMs } : {}) }),
    ) as ReturnType<VeriKaynagi["topluKararVer"]>;
  }
  politikaTaslagiOlustur(girdi: Parameters<VeriKaynagi["politikaTaslagiOlustur"]>[0]) {
    return sonuc(() => politika.politikaTaslagiOlustur(this.#b, girdi)) as Promise<IslemSonucu<PolitikaKaydi>>;
  }
  politikaImzala(id: string, imzalayanAd: string) {
    return sonuc(() => politika.politikaImzala(this.#b, id, { imzalayanAd })) as Promise<IslemSonucu<PolitikaKaydi>>;
  }
  async ayarlariGuncelle(degisiklik: Parameters<VeriKaynagi["ayarlariGuncelle"]>[0]) {
    return tur<Ayarlar>(await politika.ayarlariGuncelle(this.#b, degisiklik));
  }
  yzAnahtariKaydet(anahtar: string, model?: string) {
    return sonuc(() => politika.yzAnahtariKaydet(this.#b, { anahtar, ...(model ? { model } : {}) })) as Promise<
      IslemSonucu<Ayarlar>
    >;
  }
  yzAnahtariKaldir() {
    return sonuc(() => politika.yzAnahtariKaldir(this.#b)) as Promise<IslemSonucu<Ayarlar>>;
  }
  yzBaglantiDene() {
    return sonuc(() => politika.yzBaglantiDene(this.#b)) as Promise<IslemSonucu<BaglantiSonucu>>;
  }
}
