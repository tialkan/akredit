// Ölçme verisi sözleşmesi. Üreten: @akredit/baglayicilar (OBS not aktarımı) ve soru-ÇK eşleme kararları.
// Tüketen: @akredit/olcme. Öğrenci kimliği burada yalnız takma addır (kurum anahtarıyla HMAC).

export type OlcmeAraciTuru =
  | "ara_sinav"
  | "yariyil_sonu"
  | "butunleme"
  | "kisa_sinav"
  | "odev"
  | "proje"
  | "uygulama"
  | "laboratuvar"
  | "sunum"
  | "diger";

/** Bir sorunun bir ders çıktısına eşlenmesi. Ağırlık > 0; bir sorunun ağırlıkları toplamı 1 olmak zorunda değildir, normalleştirilir. */
export interface CiktiEslemesi {
  ciktiKod: string;
  agirlik: number;
}

export interface OlcmeSorusu {
  /** "1", "2a", "S3" gibi; araç içinde tekil. */
  no: string;
  tamPuan: number;
  eslemeler: CiktiEslemesi[];
}

export interface OlcmeAraci {
  id: string;
  tur: OlcmeAraciTuru;
  ad: string;
  /** Ders başarı notundaki katkı yüzdesi (0-100). */
  agirlik: number;
  sorular: OlcmeSorusu[];
}

export interface OgrenciPuani {
  /** Öğrencinin takma adı. Gerçek numara ya da ad asla buraya girmez. */
  ogrenci: string;
  aracId: string;
  soruNo: string;
  /** null: öğrenci bu araca girmedi ya da puan yok. */
  puan: number | null;
}

export interface DersOlcmeVerisi {
  dersKodu: string;
  /** "2026-2027 Güz" */
  donem: string;
  ciktilar: { kod: string; metin?: string }[];
  araclar: OlcmeAraci[];
  puanlar: OgrenciPuani[];
}
