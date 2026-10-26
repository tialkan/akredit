// IMAP posta kutusu eşitleme (RFC 9051/3501 alt kümesi), salt okuma.
// - Giriş yalnız OAuth (SASL XOAUTH2); parola alınmaz, saklanmaz. Belirteç yalnız AUTHENTICATE satırında gider,
//   günlüğe ve hata iletisine girmez (protokol kaydı tutulursa o satır gizlenir).
// - Kutu EXAMINE ile salt okunur açılır; iletiler BODY.PEEK[] ile alınır, "okundu" işareti değişmez.
// - Durum: UIDVALIDITY + son alınan UID. UIDVALIDITY değişirse baştan eşitlenir (kanıt hattı tekilleştirir).
// Soket (TLS bağlantısı) dışarıdan verilir; testte kayıtlı oturum dökümüyle sahte soket kullanılır.

import { z } from "zod";
import { type AyrisanIleti, MimeHatasi, mimeAyristir } from "./mime.ts";

export interface Soket {
  yaz(veri: string): Promise<void>;
  /** Sunucudan gelen sıradaki parça; bağlantı kapandıysa null. */
  oku(): Promise<Uint8Array | null>;
  kapat(): Promise<void>;
}

export const ImapDurumuSemasi = z.object({ uidGecerlilik: z.number().int().nonnegative(), sonUid: z.number().int().nonnegative() });
export type ImapDurumu = z.infer<typeof ImapDurumuSemasi>;

export class ImapHatasi extends Error {}

/** Sunucu yanıtlarını satır ve literal ({n}) olarak okuyan tampon. */
class Okuyucu {
  #tampon: Buffer = Buffer.alloc(0);
  #soket: Soket;
  constructor(soket: Soket) {
    this.#soket = soket;
  }
  async #doldur(): Promise<void> {
    const p = await this.#soket.oku();
    if (!p) throw new ImapHatasi("Posta sunucusu bağlantıyı kapattı.");
    this.#tampon = Buffer.concat([this.#tampon, p]);
  }
  async satir(): Promise<string> {
    for (;;) {
      const i = this.#tampon.indexOf("\r\n");
      if (i >= 0) {
        const s = this.#tampon.subarray(0, i).toString("latin1");
        this.#tampon = this.#tampon.subarray(i + 2);
        return s;
      }
      if (this.#tampon.length > 1_000_000) throw new ImapHatasi("Posta sunucusunun yanıtı okunamadı.");
      await this.#doldur();
    }
  }
  async bayt(n: number): Promise<Uint8Array> {
    while (this.#tampon.length < n) await this.#doldur();
    const v = new Uint8Array(this.#tampon.subarray(0, n));
    this.#tampon = this.#tampon.subarray(n);
    return v;
  }
}

export interface ImapYaniti {
  /** Etiketsiz satırlar (literal içerikleri ayrı). */
  satirlar: { metin: string; literaller: Uint8Array[] }[];
  durum: "OK" | "NO" | "BAD";
  metin: string;
}

export interface ImapSecenegi {
  /** XOAUTH2 için kullanıcı adresi. */
  kullanici: string;
  /** Geçerli OAuth erişim belirteci (gecerliBelirtec ile). */
  erisim: string;
  kutu?: string;
  /** Kurum posta sunucusunun authserv-id'si (Authentication-Results). */
  guvenilirSunucu: string;
  enCokIleti?: number;
  enBuyukIleti?: number;
  /** Protokol kaydı (hata ayıklama); belirteç satırı gizlenir. */
  kayit?: (satir: string) => void;
}

export interface ImapEsitlemeSonucu {
  iletiler: (AyrisanIleti & { uid: number })[];
  durum: ImapDurumu;
  uyarilar: string[];
}

export async function imapEsitle(soket: Soket, onceki: ImapDurumu | null, s: ImapSecenegi): Promise<ImapEsitlemeSonucu> {
  const ok = new Okuyucu(soket);
  let sayac = 0;
  const kayit = (x: string) => s.kayit?.(x);
  const komut = async (metin: string, gizli = false): Promise<ImapYaniti> => {
    const etiket = `A${String(++sayac).padStart(3, "0")}`;
    kayit(`C: ${etiket} ${gizli ? metin.split(" ").slice(0, 2).join(" ").concat(" ***") : metin}`);
    await soket.yaz(`${etiket} ${metin}\r\n`);
    const satirlar: ImapYaniti["satirlar"] = [];
    for (;;) {
      let st = await ok.satir();
      if (st.startsWith("+")) {
        // XOAUTH2 hatasında sunucu ayrıntıyı "+" ile gönderir; boş satırla sonlandırılır.
        await soket.yaz("\r\n");
        continue;
      }
      if (st.startsWith(`${etiket} `)) {
        const m = st.slice(etiket.length + 1).match(/^(OK|NO|BAD)\b ?(.*)$/i);
        kayit(`S: ${etiket} ${m?.[1] ?? "?"}`);
        return { satirlar, durum: (m?.[1]?.toUpperCase() ?? "BAD") as ImapYaniti["durum"], metin: m?.[2] ?? "" };
      }
      const literaller: Uint8Array[] = [];
      let tum = st;
      for (let m = st.match(/\{(\d+)\}$/); m; m = st.match(/\{(\d+)\}$/)) {
        const n = Number(m[1]);
        if (n > (s.enBuyukIleti ?? 40 * 1024 * 1024)) throw new ImapHatasi("Posta kutusundaki bir ileti çok büyük.");
        literaller.push(await ok.bayt(n));
        st = await ok.satir();
        tum += ` {…} ${st}`;
      }
      satirlar.push({ metin: tum, literaller });
    }
  };

  const karsilama = await ok.satir();
  if (!/^\* (OK|PREAUTH)\b/i.test(karsilama)) throw new ImapHatasi("Posta sunucusu bağlantıyı kabul etmedi.");
  const uyarilar: string[] = [];
  try {
    const xo = Buffer.from(`user=${s.kullanici}\x01auth=Bearer ${s.erisim}\x01\x01`, "utf8").toString("base64");
    const g = await komut(`AUTHENTICATE XOAUTH2 ${xo}`, true);
    if (g.durum !== "OK") throw new ImapHatasi("Posta kutusuna bağlanılamadı; hesabı yeniden bağlayın.");

    const kutu = (s.kutu ?? "INBOX").replace(/["\\\r\n]/g, "");
    const ex = await komut(`EXAMINE "${kutu}"`);
    if (ex.durum !== "OK") throw new ImapHatasi("Posta klasörü açılamadı; klasör adını denetleyin.");
    const uv = ex.satirlar.map((x) => x.metin.match(/\[UIDVALIDITY (\d+)\]/i)?.[1]).find(Boolean);
    if (!uv) throw new ImapHatasi("Posta sunucusunun yanıtı okunamadı.");
    const uidGecerlilik = Number(uv);
    const bas = onceki && onceki.uidGecerlilik === uidGecerlilik ? onceki.sonUid : 0;
    if (onceki && onceki.uidGecerlilik !== uidGecerlilik) uyarilar.push("Posta klasörü sunucuda yeniden oluşturulmuş; baştan eşitlendi.");

    const ara = await komut(`UID SEARCH UID ${bas + 1}:*`);
    if (ara.durum !== "OK") throw new ImapHatasi("Posta klasöründe arama yapılamadı.");
    // "n:*" en büyük UID'yi her zaman döndürür; daha önce alınanlar elenir.
    const uidler = ara.satirlar
      .flatMap((x) => (x.metin.match(/^\* SEARCH\b(.*)$/i)?.[1] ?? "").trim().split(/\s+/))
      .filter(Boolean)
      .map(Number)
      .filter((u) => Number.isInteger(u) && u > bas)
      .sort((a, b) => a - b);
    const enCok = s.enCokIleti ?? 200;
    if (uidler.length > enCok) uyarilar.push("İleti sayısı sınırına ulaşıldı; kalanlar sonraki eşitlemede alınacak.");
    const alinacak = uidler.slice(0, enCok);

    const iletiler: ImapEsitlemeSonucu["iletiler"] = [];
    let sonUid = bas;
    for (const uid of alinacak) {
      const f = await komut(`UID FETCH ${uid} (UID BODY.PEEK[])`);
      if (f.durum !== "OK") {
        uyarilar.push("Bir ileti okunamadı; sonraki eşitlemede yeniden denenecek.");
        break; // sonUid ilerlemez, ileti kaybolmaz
      }
      const s_ = f.satirlar.find((x) => new RegExp(`^\\* \\d+ FETCH .*UID ${uid}\\b`, "i").test(x.metin) && x.literaller.length);
      const ham = s_?.literaller[0];
      if (ham) {
        try {
          iletiler.push({ uid, ...mimeAyristir(ham, s.guvenilirSunucu) });
        } catch (e) {
          uyarilar.push(e instanceof MimeHatasi ? e.message : "Bir ileti okunamadı.");
        }
      }
      sonUid = uid;
    }
    await komut("LOGOUT").catch(() => undefined);
    return { iletiler, durum: { uidGecerlilik, sonUid }, uyarilar };
  } finally {
    await soket.kapat();
  }
}
