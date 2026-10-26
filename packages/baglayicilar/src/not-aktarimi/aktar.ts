// OBS'den alınan soru bazlı not dökümünü (Excel/CSV ham hücreleri) soru bazlı puanlara çevirir.
// Kişisel veri: öğrenci numarası yalnız takmaAd işlevine verilir, ad sütunu hiç okunmaz.
// Bulgu metinleri hücre değerini değil, yalnız hücre adresini içerir.

import type { HucreDegeri, TabloVerisi } from "@akredit/belge";
import type { Bulgu, OgrenciPuani, OlcmeAraciTuru } from "@akredit/cekirdek";
import { type NotAktarimProfili, sutunHarfi, sutunSirasi } from "./profil.ts";

export interface NotAktarimSecenekleri {
  /** Öğrenci numarasını takma ada çevirir (HMAC çağıranın işidir). */
  takmaAd(ogrenciNo: string): string;
  aracId?: string;
  aracAdi?: string;
  tur?: OlcmeAraciTuru;
  /** Soru no → tam puan. Başlıktaki ve "Tam Puan" satırındaki değerlerden önce gelir. */
  tamPuanlar?: Record<string, number>;
  /** Tespit yerine kullanılacak kayıtlı eşleme. */
  profil?: NotAktarimProfili;
}

export interface NotAktarimSonucu {
  arac: { id: string; ad: string; tur: OlcmeAraciTuru; sorular: { no: string; tamPuan: number | null }[] };
  puanlar: OgrenciPuani[];
  bulgular: Bulgu[];
  /** Kullanılan ya da tespit edilen eşleme; başlık bulunamadıysa null. */
  profil: NotAktarimProfili | null;
}

const BASLIK_TARAMA = 15;
const DEVAMSIZ = /^(gr|dz|girmedi|g)$/;
const TOPLAM_TOLERANS = 0.01;

const duzle = (h: HucreDegeri | undefined): string =>
  String(h ?? "")
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ")
    .trim();

const NO_BASLIK = /^(öğrenci no|öğrenci numarası|numara|öğr\. ?no|öğr no|ogrenci no|no)$/;
const AD_BASLIK = /^(adı soyadı|ad soyad|ad soyadı|adı soyad|ad-soyad|ad)$/;
const TOPLAM_BASLIK = /^(toplam|toplam puan|sınav notu|not)$/;
const HARF_BASLIK = /^(harf notu|harf|hn)$/;
const TAM_PUAN = /^tam puan/;
const SORU_BASLIK =
  /^(?:s\s*(\d+[a-zçğıöşü]?)|soru\s*(\d+[a-zçğıöşü]?)|(\d+[a-zçğıöşü]?)\.?\s*soru|(\d+[a-zçğıöşü]?))\s*(?:\(\s*(\d+(?:[.,]\d+)?)\s*\)|\/\s*(\d+(?:[.,]\d+)?))?$/;

function soruBasligi(h: HucreDegeri | undefined): { no: string; tamPuan: number | null } | null {
  const m = duzle(h).match(SORU_BASLIK);
  if (!m) return null;
  const no = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
  const tp = m[5] ?? m[6];
  return { no, tamPuan: tp ? Number(tp.replace(",", ".")) : null };
}

type Sayi = { tur: "bos" } | { tur: "devamsiz" } | { tur: "sayi"; deger: number } | { tur: "gecersiz" };

/** Hücreyi sayıya çevirir: ondalık virgül ve binlik nokta olmayan metinler kabul edilir. */
function sayiOku(h: HucreDegeri | undefined): Sayi {
  if (h === null || h === undefined) return { tur: "bos" };
  if (typeof h === "number") return Number.isFinite(h) ? { tur: "sayi", deger: h } : { tur: "gecersiz" };
  const s = h.trim();
  if (!s || s === "-") return { tur: "bos" };
  if (DEVAMSIZ.test(duzle(s))) return { tur: "devamsiz" };
  if (!/^-?\d+(?:[.,]\d+)?$/.test(s)) return { tur: "gecersiz" };
  return { tur: "sayi", deger: Number(s.replace(",", ".")) };
}

/** İlk 15 satırda başlık satırını arar; bulursa profil üretir. */
export function baslikTespit(satirlar: HucreDegeri[][], sayfaAdi?: string): NotAktarimProfili | null {
  for (let r = 0; r < Math.min(BASLIK_TARAMA, satirlar.length); r++) {
    const satir = satirlar[r] ?? [];
    let no: number | undefined;
    let ad: number | undefined;
    let toplam: number | undefined;
    let harf: number | undefined;
    const sorular: NotAktarimProfili["sorular"] = [];
    satir.forEach((h, i) => {
      const d = duzle(h);
      if (!d) return;
      if (no === undefined && NO_BASLIK.test(d)) no = i;
      else if (ad === undefined && AD_BASLIK.test(d)) ad = i;
      else if (toplam === undefined && TOPLAM_BASLIK.test(d)) toplam = i;
      else if (harf === undefined && HARF_BASLIK.test(d)) harf = i;
      else {
        const s = soruBasligi(h);
        if (s) sorular.push({ sutun: sutunHarfi(i), no: s.no, ...(s.tamPuan !== null ? { tamPuan: s.tamPuan } : {}) });
      }
    });
    if (no === undefined || !sorular.length) continue;
    // "Tam Puan" satırı başlığın hemen altındaki birkaç satırda aranır.
    let tamPuanSatiri: number | undefined;
    for (let k = r + 1; k < Math.min(r + 4, satirlar.length); k++) {
      if ((satirlar[k] ?? []).some((h) => TAM_PUAN.test(duzle(h)))) {
        tamPuanSatiri = k + 1;
        break;
      }
    }
    return {
      surum: 1,
      ...(sayfaAdi !== undefined ? { sayfa: sayfaAdi } : {}),
      baslikSatiri: r + 1,
      ogrenciNoSutunu: sutunHarfi(no),
      ...(ad !== undefined ? { adSutunu: sutunHarfi(ad) } : {}),
      sorular,
      ...(toplam !== undefined ? { toplamSutunu: sutunHarfi(toplam) } : {}),
      ...(harf !== undefined ? { harfSutunu: sutunHarfi(harf) } : {}),
      ...(tamPuanSatiri !== undefined ? { tamPuanSatiri } : {}),
    };
  }
  return null;
}

/** Soru bazlı not dökümünü okur. Hatalı hücreler bulgu olarak döner, süreç durmaz. */
export function notAktar(tablo: TabloVerisi, secenek: NotAktarimSecenekleri): NotAktarimSonucu {
  const bulgular: Bulgu[] = [];
  const aracId = secenek.aracId ?? "arac";
  const tur = secenek.tur ?? "diger";
  const bos = (profil: NotAktarimProfili | null, ad: string): NotAktarimSonucu => ({
    arac: { id: aracId, ad, tur, sorular: [] },
    puanlar: [],
    bulgular,
    profil,
  });

  const sayfa = secenek.profil?.sayfa ? tablo.sayfalar.find((s) => s.ad === secenek.profil?.sayfa) : tablo.sayfalar[0];
  if (!sayfa) {
    bulgular.push({
      duzey: "hata",
      kural: "sayfa-yok",
      aciklama: "Dosyada okunacak sayfa bulunamadı. Doğru dosyayı ya da sayfa adını seçin.",
    });
    return bos(secenek.profil ?? null, secenek.aracAdi ?? "");
  }
  const aracAdi = secenek.aracAdi ?? sayfa.ad;
  const profil = secenek.profil ?? baslikTespit(sayfa.satirlar, sayfa.ad);
  if (!profil) {
    bulgular.push({
      duzey: "hata",
      kural: "baslik-yok",
      konu: sayfa.ad,
      aciklama: `İlk ${BASLIK_TARAMA} satırda öğrenci numarası ve soru sütunları olan başlık satırı bulunamadı. Sütunları elle eşleyin.`,
    });
    return bos(null, aracAdi);
  }

  const adres = (r: number, c: number) => `${sayfa.ad}!${sutunHarfi(c)}${r + 1}`;
  const hucre = (r: number, c: number) => sayfa.satirlar[r]?.[c];
  const noS = sutunSirasi(profil.ogrenciNoSutunu);
  const adS = profil.adSutunu ? sutunSirasi(profil.adSutunu) : -1;
  const toplamS = profil.toplamSutunu ? sutunSirasi(profil.toplamSutunu) : undefined;
  const tpSatir = profil.tamPuanSatiri ? profil.tamPuanSatiri - 1 : undefined;

  const sorular = profil.sorular.map((s) => {
    const c = sutunSirasi(s.sutun);
    let tamPuan: number | null = secenek.tamPuanlar?.[s.no] ?? s.tamPuan ?? null;
    if (tamPuan === null && tpSatir !== undefined) {
      const v = sayiOku(hucre(tpSatir, c));
      if (v.tur === "sayi" && v.deger > 0) tamPuan = v.deger;
      else if (v.tur !== "bos")
        bulgular.push({
          duzey: "uyari",
          kural: "tam-puan",
          konu: adres(tpSatir, c),
          aciklama: `${adres(tpSatir, c)}: tam puan sayı değil. Tam puanı elle girin.`,
        });
    }
    return { no: s.no, sutun: c, tamPuan };
  });
  const yinelenen = new Map<string, number>();
  for (const s of sorular) yinelenen.set(s.no, (yinelenen.get(s.no) ?? 0) + 1);
  for (const [no, n] of yinelenen)
    if (n > 1)
      bulgular.push({
        duzey: "hata",
        kural: "soru-yinelenen",
        konu: no,
        aciklama: `${no} numaralı soru ${n} sütunda geçiyor. Sütun eşlemesini düzeltin.`,
      });

  const puanlar: OgrenciPuani[] = [];
  const gorulen = new Map<string, number>();
  for (let r = profil.baslikSatiri; r < sayfa.satirlar.length; r++) {
    if (r === tpSatir) continue;
    const satir = sayfa.satirlar[r] ?? [];
    const noHam = hucre(r, noS);
    const ogrNo = typeof noHam === "number" ? String(noHam) : (noHam ?? "").trim();
    const soruHucreleri = sorular.map((s) => hucre(r, s.sutun));
    if (!ogrNo) {
      if (soruHucreleri.some((h) => h !== null && h !== undefined && String(h).trim() !== ""))
        bulgular.push({
          duzey: "uyari",
          kural: "ogrenci-no-yok",
          konu: adres(r, noS),
          aciklama: `${r + 1}. satırda öğrenci numarası yok; satır atlandı.`,
        });
      continue;
    }
    if (TAM_PUAN.test(duzle(ogrNo))) continue;
    const onceki = gorulen.get(ogrNo);
    if (onceki !== undefined) {
      bulgular.push({
        duzey: "hata",
        kural: "ogrenci-yinelenen",
        konu: adres(r, noS),
        aciklama: `${r + 1}. satırdaki öğrenci ${onceki + 1}. satırda da var; ikinci satır alınmadı.`,
      });
      continue;
    }
    gorulen.set(ogrNo, r);
    const ogrenci = secenek.takmaAd(ogrNo);
    const devamsiz = satir.some((h, i) => i !== noS && i !== adS && sayiOku(h).tur === "devamsiz");
    let toplam = 0;
    let gecerli = true;
    for (const s of sorular) {
      const v = sayiOku(hucre(r, s.sutun));
      let puan: number | null = null;
      if (devamsiz) puan = null;
      else if (v.tur === "sayi") {
        if (v.deger < 0) {
          bulgular.push({
            duzey: "hata",
            kural: "puan-negatif",
            konu: adres(r, s.sutun),
            aciklama: `${adres(r, s.sutun)}: puan sıfırdan küçük.`,
          });
          gecerli = false;
        } else if (s.tamPuan !== null && v.deger > s.tamPuan) {
          bulgular.push({
            duzey: "hata",
            kural: "puan-tam-puani-asiyor",
            konu: adres(r, s.sutun),
            aciklama: `${adres(r, s.sutun)}: puan ${v.deger}, ${s.no}. sorunun tam puanı ${s.tamPuan}. Puanı düzeltin.`,
          });
          gecerli = false;
        } else {
          puan = v.deger;
          toplam += v.deger;
        }
      } else if (v.tur === "gecersiz") {
        bulgular.push({
          duzey: "hata",
          kural: "sayi-degil",
          konu: adres(r, s.sutun),
          aciklama: `${adres(r, s.sutun)}: hücre sayı değil. Puanı sayı olarak girin.`,
        });
        gecerli = false;
      }
      puanlar.push({ ogrenci, aracId, soruNo: s.no, puan });
    }
    if (!devamsiz && gecerli && toplamS !== undefined) {
      const t = sayiOku(hucre(r, toplamS));
      if (t.tur === "sayi" && Math.abs(t.deger - toplam) > TOPLAM_TOLERANS) {
        // Soru puanları toplamı ile dökümdeki toplam karşılaştırılır; yuvarlama payı 0,01.
        const hesap = Math.round(toplam * 100) / 100;
        bulgular.push({
          duzey: "uyari",
          kural: "toplam-tutarsiz",
          konu: adres(r, toplamS),
          aciklama: `${adres(r, toplamS)}: dökümdeki toplam ${t.deger}, soru puanlarının toplamı ${hesap}.`,
        });
      } else if (t.tur === "gecersiz") {
        bulgular.push({
          duzey: "uyari",
          kural: "sayi-degil",
          konu: adres(r, toplamS),
          aciklama: `${adres(r, toplamS)}: toplam hücresi sayı değil.`,
        });
      }
    }
  }

  return {
    arac: { id: aracId, ad: aracAdi, tur, sorular: sorular.map((s) => ({ no: s.no, tamPuan: s.tamPuan })) },
    puanlar,
    bulgular,
    profil,
  };
}
