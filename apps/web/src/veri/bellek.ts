// Bellekte çalışan VeriKaynagi. Örnek veriyle arayüzü besler; kurallar @akredit/cekirdek'ten gelir.
// Kararlar yalnız eklenir, silinmez ve değiştirilmez.

import {
  etkinRisk,
  type Karar,
  type KararId,
  kararDogrula,
  ONERI_RISKI,
  type OneriId,
  type PolitikaId,
} from "@akredit/cekirdek";
import type {
  Ayarlar,
  IslemSonucu,
  KanitAyrintisi,
  KanitFiltresi,
  KanitGorunumu,
  KararGirdisi,
  OneriGorunumu,
  OneriIcerigi,
  PanelOzeti,
  PolitikaGirdisi,
  PolitikaKaydi,
  VeriKaynagi,
} from "./kaynak.ts";
import {
  DERSLER,
  KANITLAR,
  OLCUTLER,
  ORNEK_DONEM,
  ORNEK_KULLANICI,
  ORNEK_SIMDI,
  ornekAyarlar,
  ornekOneriler,
  PARCALAR,
  PROGRAMLAR,
  RAPORLAR,
  SURECLER,
} from "./ornek.ts";
import { metinAramaAnahtari } from "./yardimci.ts";

export interface BellekSecenekleri {
  /** Karar zamanı. Testlerde sabit verilir. */
  simdi?: () => string;
}

const hata = <T>(mesaj: string): IslemSonucu<T> => ({ tamam: false, hata: mesaj });

export class BellekVeriKaynagi implements VeriKaynagi {
  #oneriler: OneriGorunumu[];
  #kararlar: Karar<OneriIcerigi>[] = [];
  #ayarlar: Ayarlar;
  #simdi: () => string;
  #sayac = 0;

  constructor(secenekler: BellekSecenekleri = {}) {
    this.#oneriler = ornekOneriler();
    this.#ayarlar = ornekAyarlar();
    this.#simdi = secenekler.simdi ?? (() => ORNEK_SIMDI);
  }

  #yeniKimlik(on: string): string {
    this.#sayac += 1;
    return `${on}-${String(this.#sayac).padStart(4, "0")}`;
  }

  async kullanici() {
    return ORNEK_KULLANICI;
  }

  async panelOzeti(): Promise<PanelOzeti> {
    const bekleyen = { dusuk: 0, orta: 0, yuksek: 0 };
    for (const o of await this.bekleyenOneriler()) bekleyen[etkinRisk(o)] += 1;
    const kararSayisi = ORNEK_DONEM.oncekiKararSayisi + this.#kararlar.length;
    return {
      bekleyen,
      yaklasanlar: SURECLER.filter((g) => g.durum !== "tamam")
        .slice()
        .sort((a, b) => a.sonTarih.localeCompare(b.sonTarih))
        .slice(0, 4),
      kapsama: OLCUTLER.map((olcut) => ({
        olcut,
        kanitSayisi: KANITLAR.filter((k) => k.olcutler.includes(olcut)).length,
      })),
      kararSayisi,
      harcananDakika: Math.round((kararSayisi * ORNEK_DONEM.kararBasinaSaniye) / 60),
    };
  }

  async bekleyenOneriler() {
    const kararli = new Set(this.#kararlar.map((k) => k.oneriId));
    return this.#oneriler.filter((o) => !kararli.has(o.id));
  }

  async kararlar() {
    return [...this.#kararlar];
  }

  async kanitlar(filtre: KanitFiltresi = {}): Promise<KanitGorunumu[]> {
    const arama = filtre.arama ? metinAramaAnahtari(filtre.arama) : "";
    return KANITLAR.filter((k) => {
      if (filtre.kaynakTuru && k.kaynakTuru !== filtre.kaynakTuru) return false;
      if (filtre.olcut && !k.olcutler.includes(filtre.olcut)) return false;
      if (arama && !metinAramaAnahtari(`${k.baslik} ${k.dosyaAdi}`).includes(arama)) return false;
      return true;
    });
  }

  async kanit(id: string): Promise<KanitAyrintisi | null> {
    const kanit = KANITLAR.find((k) => k.id === id);
    if (!kanit) return null;
    return { kanit, parcalar: PARCALAR.filter((p) => p.kanitId === id) };
  }

  async kanitHattiOzeti() {
    // Örnek veride kanıt hattı çalışmaz; örnek kanıtlar işlenmiş sayılır.
    return { sayac: { isleniyor: 0, tamam: KANITLAR.length, hata: 0, ocr_bekliyor: 0, kisisel_veri: 0 } };
  }

  async programlar() {
    return PROGRAMLAR;
  }
  async program(id: string) {
    return PROGRAMLAR.find((p) => p.id === id) ?? null;
  }
  async dersler() {
    return DERSLER;
  }
  async ders(id: string) {
    return DERSLER.find((d) => d.id === id) ?? null;
  }
  async raporlar() {
    return RAPORLAR;
  }
  async rapor(id: string) {
    return RAPORLAR.find((r) => r.id === id) ?? null;
  }
  async surecler() {
    return SURECLER;
  }
  async ayarlar() {
    return structuredClone(this.#ayarlar);
  }

  #kararOlustur(girdi: KararGirdisi): IslemSonucu<Karar<OneriIcerigi>> {
    const oneri = this.#oneriler.find((o) => o.id === girdi.oneriId);
    if (!oneri) return hata("Öneri bulunamadı. Sayfayı yenileyip yeniden deneyin.");
    const duzeltme =
      girdi.sonuc === "duzeltildi" ? { baslik: oneri.icerik.baslik, metin: (girdi.duzeltme ?? "").trim() } : null;
    if (duzeltme && !duzeltme.metin) return hata("Düzeltilmiş metin boş olamaz. Metni yazıp yeniden kaydedin.");
    const karar: Karar<OneriIcerigi> = {
      id: this.#yeniKimlik("karar") as KararId,
      oneriId: oneri.id,
      sonuc: girdi.sonuc,
      duzeltme,
      kararVeren: ORNEK_KULLANICI.id,
      dayanak: { tur: "dogrudan" },
      gerekce: girdi.gerekce?.trim() || null,
      zaman: this.#simdi(),
    };
    const dogrulama = kararDogrula(oneri, karar, this.#kararlar);
    if (!dogrulama.gecerli) return hata(dogrulama.hatalar.join(" "));
    return { tamam: true, deger: karar };
  }

  async kararVer(girdi: KararGirdisi) {
    const sonuc = this.#kararOlustur(girdi);
    if (sonuc.tamam) this.#kararlar.push(sonuc.deger);
    return sonuc;
  }

  async topluKararVer(oneriIdleri: OneriId[]): Promise<IslemSonucu<Karar<OneriIcerigi>[]>> {
    if (oneriIdleri.length === 0) return hata("Önce en az bir öneri seçin.");
    for (const id of oneriIdleri) {
      const oneri = this.#oneriler.find((o) => o.id === id);
      if (oneri && etkinRisk(oneri) === "yuksek")
        return hata("Yüksek riskli öneriler toplu onaylanamaz. Onları tek tek inceleyip onaylayın.");
    }
    // Önce hepsi doğrulanır; biri bile geçersizse hiçbiri kaydedilmez.
    const yeni: Karar<OneriIcerigi>[] = [];
    for (const id of new Set(oneriIdleri)) {
      const sonuc = this.#kararOlustur({ oneriId: id, sonuc: "onaylandi" });
      if (!sonuc.tamam) return hata(sonuc.hata);
      yeni.push(sonuc.deger);
    }
    this.#kararlar.push(...yeni);
    return { tamam: true, deger: yeni };
  }

  async politikaTaslagiOlustur(girdi: PolitikaGirdisi): Promise<IslemSonucu<PolitikaKaydi>> {
    if (!girdi.ad.trim()) return hata("Politikaya bir ad verin.");
    if (girdi.oneriTurleri.length === 0) return hata("En az bir öneri türü seçin.");
    if (girdi.enYuksekRisk === "yuksek")
      return hata("Yüksek riskli işler için otomatik onay politikası oluşturulamaz.");
    if (girdi.oneriTurleri.some((t) => ONERI_RISKI[t] === "yuksek"))
      return hata("Seçilen türlerden biri yüksek riskli. Yüksek riskli işler otomatik onaylanamaz.");
    if (!(girdi.enDusukGuven >= 0 && girdi.enDusukGuven <= 1)) return hata("Güven eşiği 0 ile 100 arasında olmalı.");
    const kayit: PolitikaKaydi = {
      id: this.#yeniKimlik("politika") as PolitikaId,
      ad: girdi.ad.trim(),
      kapsam: {
        oneriTurleri: [...girdi.oneriTurleri],
        enYuksekRisk: girdi.enYuksekRisk,
        enDusukGuven: girdi.enDusukGuven,
      },
      durum: "imza_bekliyor",
      olusturan: ORNEK_KULLANICI.ad,
      olusturma: this.#simdi(),
      imzalayan: null,
      imzaZamani: null,
    };
    this.#ayarlar.politikalar.push(kayit);
    return { tamam: true, deger: structuredClone(kayit) };
  }

  async politikaImzala(id: string, imzalayanAd: string): Promise<IslemSonucu<PolitikaKaydi>> {
    const p = this.#ayarlar.politikalar.find((x) => x.id === id);
    if (!p) return hata("Politika bulunamadı.");
    if (p.durum === "imzali") return hata("Bu politika zaten imzalanmış.");
    if (imzalayanAd.trim() !== ORNEK_KULLANICI.ad) return hata("İmzalamak için adınızı hesabınızdaki gibi yazın.");
    p.durum = "imzali";
    p.imzalayan = ORNEK_KULLANICI.ad;
    p.imzaZamani = this.#simdi();
    return { tamam: true, deger: structuredClone(p) };
  }

  async ayarlariGuncelle(
    degisiklik: Partial<Pick<Ayarlar, "yzSaglayici" | "yurtDisiIzni" | "kurumAdi" | "kurumKisaAdi">>,
  ) {
    this.#ayarlar = { ...this.#ayarlar, ...degisiklik };
    return this.ayarlar();
  }
}

/** Sunucu bileşenlerinin kullandığı tek örnek kaynak. */
let paylasilan: BellekVeriKaynagi | null = null;
export function veriKaynagi(): VeriKaynagi {
  paylasilan ??= new BellekVeriKaynagi();
  return paylasilan;
}
