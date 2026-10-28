// Sağlayıcıdan bağımsız iç mesaj ve araç biçimi. Bağdaştırıcılar bu biçimi sağlayıcının biçimine çevirir.

export type MesajRolu = "sistem" | "kullanici" | "asistan" | "arac";

export interface AracCagrisi {
  id: string;
  ad: string;
  /** Ayrıştırılmış argümanlar. Model geçersiz JSON verirse `undefined` olur, ham metin `ham` alanındadır. */
  argumanlar: unknown;
  ham?: string;
}

export interface Mesaj {
  rol: MesajRolu;
  icerik: string;
  /** Yalnız asistan mesajlarında: modelin istediği araç çağrıları. */
  aracCagrilari?: AracCagrisi[];
  /** Yalnız araç mesajlarında: yanıtlanan çağrının kimliği. */
  aracCagriId?: string;
}

export interface AracTanimi {
  ad: string;
  aciklama: string;
  /** JSON şema (nesne). */
  parametreler: Record<string, unknown>;
}

export interface SohbetIstegi {
  mesajlar: Mesaj[];
  araclar?: AracTanimi[];
  sicaklik?: number;
  enCokBelirtec?: number;
  /** Yapılandırılmış çıktı istenirse JSON şema. Destekleyen sağlayıcı yerel yolla uygular. */
  jsonSema?: { ad: string; sema: Record<string, unknown> };
  sinyal?: AbortSignal;
}

export interface Kullanim {
  giris: number;
  cikis: number;
}

export interface SohbetYaniti {
  icerik: string;
  aracCagrilari: AracCagrisi[];
  kullanim?: Kullanim;
  bitisNedeni?: string;
}

export interface Saglayici {
  /** "evren", "vllm", "anthropic", "sahte", ... */
  ad: string;
  model: string;
  /** Veri yurt içinde mi kalıyor (kurum ayarıyla karşılaştırılır). */
  yurtIci: boolean;
  /** Sağlayıcı JSON şemaya bağlı çıktıyı yerel olarak destekliyor mu? */
  yapilandirilmisCikti?: boolean;
  sohbet(istek: SohbetIstegi): Promise<SohbetYaniti>;
  gomme?(metinler: string[]): Promise<number[][]>;
}

export type YzHataTuru =
  | "anahtar"
  | "yogunluk"
  | "ag"
  | "zaman_asimi"
  | "sunucu"
  | "yanit"
  | "iptal"
  | "politika"
  | "insan_incelemesi";

/** Kullanıcıya gösterilebilir Türkçe iletili YZ hatası. */
export class YzHatasi extends Error {
  readonly tur: YzHataTuru;
  readonly durum: number | undefined;
  constructor(tur: YzHataTuru, ileti: string, durum?: number) {
    super(ileti);
    this.name = "YzHatasi";
    this.tur = tur;
    this.durum = durum;
  }
}

/** Model güvenilir çıktı veremedi; iş bir insana devredilmeli. */
export class InsanGerekliHatasi extends Error {
  readonly sonHata: string;
  constructor(ileti: string, sonHata: string) {
    super(ileti);
    this.name = "InsanGerekliHatasi";
    this.sonHata = sonHata;
  }
}

export type FetchIslevi = (adres: string, ayar: RequestInit) => Promise<Response>;
