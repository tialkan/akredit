// Tarayıcı tarafı veri kaynağı. Gerçek veri kipinde `/api/v1` uçlarını oturum çereziyle çağırır; örnek veri
// kipinde bellekteki örnek kaynağı döndürür. Durum değiştiren her istek bir tekrar anahtarı taşır, böylece
// ağ kesintisinde yeniden gönderilen onay iki kez kaydedilmez.

import { veriKaynagi as bellekKaynagi } from "./bellek.ts";
import type { Ayarlar, BaglantiSonucu, IslemSonucu, VeriKaynagi } from "./kaynak.ts";

import { GERCEK_VERI } from "./kip.ts";

export { GERCEK_VERI };

type Getir = typeof fetch;

interface Sayfa<T> {
  ogeler: T[];
  sonraki: string | null;
}

const GENEL_HATA = "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin.";

export class ApiVeriKaynagi implements VeriKaynagi {
  readonly #taban: string;
  readonly #getir: Getir;
  constructor(taban = "/api/v1", getir: Getir = (...a) => fetch(...a)) {
    this.#taban = taban;
    this.#getir = getir;
  }

  async #iste<T>(yontem: string, yol: string, govde?: unknown): Promise<IslemSonucu<T>> {
    let y: Response;
    try {
      y = await this.#getir(`${this.#taban}${yol}`, {
        method: yontem,
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          ...(govde === undefined ? {} : { "content-type": "application/json" }),
          ...(yontem === "GET" ? {} : { "idempotency-key": crypto.randomUUID() }),
        },
        ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
      });
    } catch {
      return { tamam: false, hata: GENEL_HATA };
    }
    const veri = (await y.json().catch(() => null)) as unknown;
    if (y.ok) return { tamam: true, deger: veri as T };
    const hata = (veri as { hata?: unknown } | null)?.hata;
    return { tamam: false, hata: typeof hata === "string" ? hata : GENEL_HATA };
  }

  async #al<T>(yol: string): Promise<T> {
    const s = await this.#iste<T>("GET", yol);
    if (!s.tamam) throw new Error(s.hata);
    return s.deger;
  }

  async #bosOlabilir<T>(yol: string): Promise<T | null> {
    const s = await this.#iste<T>("GET", yol);
    return s.tamam ? s.deger : null;
  }

  async #hepsi<T>(yol: string, sorgu = new URLSearchParams()): Promise<T[]> {
    const liste: T[] = [];
    sorgu.set("sinir", "100");
    for (;;) {
      const s = await this.#al<Sayfa<T>>(`${yol}?${sorgu}`);
      liste.push(...s.ogeler);
      if (!s.sonraki) return liste;
      sorgu.set("imlec", s.sonraki);
    }
  }

  kullanici() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["kullanici"]>>>("/ben");
  }
  panelOzeti() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["panelOzeti"]>>>("/panel");
  }
  bekleyenOneriler() {
    return this.#hepsi<Awaited<ReturnType<VeriKaynagi["bekleyenOneriler"]>>[number]>("/oneriler");
  }
  kararlar() {
    return this.#hepsi<Awaited<ReturnType<VeriKaynagi["kararlar"]>>[number]>("/kararlar");
  }
  kanitlar(filtre: Parameters<VeriKaynagi["kanitlar"]>[0] = {}) {
    const q = new URLSearchParams();
    for (const [a, d] of Object.entries(filtre)) if (d) q.set(a, String(d));
    return this.#hepsi<Awaited<ReturnType<VeriKaynagi["kanitlar"]>>[number]>("/kanitlar", q);
  }
  kanit(id: string) {
    return this.#bosOlabilir<NonNullable<Awaited<ReturnType<VeriKaynagi["kanit"]>>>>(
      `/kanitlar/${encodeURIComponent(id)}`,
    );
  }
  kanitHattiOzeti() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["kanitHattiOzeti"]>>>("/kanit-hatti");
  }
  programlar() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["programlar"]>>>("/programlar");
  }
  program(id: string) {
    return this.#bosOlabilir<NonNullable<Awaited<ReturnType<VeriKaynagi["program"]>>>>(
      `/programlar/${encodeURIComponent(id)}`,
    );
  }
  dersler() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["dersler"]>>>("/dersler");
  }
  ders(id: string) {
    return this.#bosOlabilir<NonNullable<Awaited<ReturnType<VeriKaynagi["ders"]>>>>(
      `/dersler/${encodeURIComponent(id)}`,
    );
  }
  raporlar() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["raporlar"]>>>("/raporlar");
  }
  rapor(id: string) {
    return this.#bosOlabilir<NonNullable<Awaited<ReturnType<VeriKaynagi["rapor"]>>>>(
      `/raporlar/${encodeURIComponent(id)}`,
    );
  }
  surecler() {
    return this.#al<Awaited<ReturnType<VeriKaynagi["surecler"]>>>("/surecler");
  }
  ayarlar() {
    return this.#al<Ayarlar>("/ayarlar");
  }
  kararVer(girdi: Parameters<VeriKaynagi["kararVer"]>[0]) {
    const govde = {
      oneriId: girdi.oneriId,
      sonuc: girdi.sonuc,
      ...(girdi.sonuc === "duzeltildi" ? { duzeltme: girdi.duzeltme ?? "" } : {}),
      ...(girdi.gerekce ? { gerekce: girdi.gerekce } : {}),
      ...(girdi.sureMs !== undefined ? { sureMs: girdi.sureMs } : {}),
    };
    return this.#iste("POST", "/kararlar", govde) as ReturnType<VeriKaynagi["kararVer"]>;
  }
  topluKararVer(oneriIdleri: Parameters<VeriKaynagi["topluKararVer"]>[0], sureMs?: number) {
    return this.#iste("POST", "/kararlar/toplu", {
      oneriIdleri,
      ...(sureMs !== undefined ? { sureMs } : {}),
    }) as ReturnType<VeriKaynagi["topluKararVer"]>;
  }
  politikaTaslagiOlustur(girdi: Parameters<VeriKaynagi["politikaTaslagiOlustur"]>[0]) {
    return this.#iste("POST", "/politikalar", girdi) as ReturnType<VeriKaynagi["politikaTaslagiOlustur"]>;
  }
  politikaImzala(id: string, imzalayanAd: string) {
    return this.#iste("POST", `/politikalar/${encodeURIComponent(id)}/imza`, { imzalayanAd }) as ReturnType<
      VeriKaynagi["politikaImzala"]
    >;
  }
  async ayarlariGuncelle(degisiklik: Parameters<VeriKaynagi["ayarlariGuncelle"]>[0]) {
    const s = await this.#iste<Ayarlar>("PATCH", "/ayarlar", degisiklik);
    if (!s.tamam) throw new Error(s.hata);
    return s.deger;
  }
  yzAnahtariKaydet(anahtar: string, model?: string) {
    return this.#iste<Ayarlar>("POST", "/ayarlar/yz-anahtari", { anahtar, ...(model ? { model } : {}) });
  }
  yzAnahtariKaldir() {
    return this.#iste<Ayarlar>("POST", "/ayarlar/yz-anahtari/kaldir", {});
  }
  yzBaglantiDene() {
    return this.#iste<BaglantiSonucu>("POST", "/ayarlar/yz-anahtari/dene", {});
  }
}

let paylasilan: VeriKaynagi | null = null;

/** İstemci bileşenlerinin veri kaynağı. */
export function istemciVeriKaynagi(): VeriKaynagi {
  paylasilan ??= GERCEK_VERI ? new ApiVeriKaynagi() : bellekKaynagi();
  return paylasilan;
}
