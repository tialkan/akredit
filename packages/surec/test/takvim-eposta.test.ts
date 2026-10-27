import { readFileSync } from "node:fs";
import ical, { type VEvent } from "node-ical";
import { describe, expect, it } from "vitest";
import {
  akademikTakvimEsle,
  bellekTasiyici,
  EpostaGonderilemediHatasi,
  icsOku,
  icsUret,
  kimlikEpostaGondericisi,
  ortamdanEpostaAyari,
  satirKatla,
  smtpTasiyici,
} from "../src/index.ts";

const DAMGA = new Date("2026-10-27T08:00:00Z");

describe(".ics çıktısı", () => {
  const metin = icsUret(
    [
      {
        uid: "gorev-1",
        baslik: "Ders notlarını aktarın; MAT101, bölüm 2",
        aciklama: "Son tarih yaklaşıyor.\nKanıt: not çizelgesi",
        tarih: "2026-01-22",
        alarmGunOnce: [3, 1],
      },
      {
        uid: "toplanti-1",
        baslik: `Danışma kurulu ${"çok uzun başlık ".repeat(8)}`,
        baslangic: new Date("2026-02-03T07:00:00Z"),
        bitis: new Date("2026-02-03T09:00:00Z"),
      },
    ],
    { ad: "Akredit takvimi", damga: DAMGA },
  );

  it("RFC 5545 biçim kurallarına uyar", () => {
    expect(metin.endsWith("\r\n")).toBe(true);
    expect(metin.replace(/\r\n/gu, "")).not.toMatch(/[\r\n]/u); // çıplak LF/CR yok
    const enc = new TextEncoder();
    for (const s of metin.split("\r\n")) expect(enc.encode(s).length).toBeLessThanOrEqual(75);
    expect(metin).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:");
    expect(metin).toContain("DTSTART;VALUE=DATE:20260122\r\nDTEND;VALUE=DATE:20260123");
    expect(metin).toContain("DTSTAMP:20261027T080000Z");
    expect(metin).toContain("SUMMARY:Ders notlarını aktarın\\; MAT101\\, bölüm 2");
    expect(metin).toContain("TRIGGER:-P3D");
  });

  it("standart bir iCalendar ayrıştırıcısı (node-ical) olayları aynı okur", () => {
    const veri = ical.sync.parseICS(metin);
    const olaylar = Object.values(veri).filter((v) => v?.type === "VEVENT") as VEvent[];
    expect(olaylar).toHaveLength(2);
    const [a, b] = olaylar;
    expect(a?.uid).toBe("gorev-1@akredit.org");
    expect(a?.summary).toBe("Ders notlarını aktarın; MAT101, bölüm 2");
    expect(a?.description).toBe("Son tarih yaklaşıyor.\nKanıt: not çizelgesi");
    expect(a?.datetype).toBe("date");
    expect(b?.summary).toBe(`Danışma kurulu ${"çok uzun başlık ".repeat(8)}`);
    expect(b?.start.toISOString()).toBe("2026-02-03T07:00:00.000Z");
    expect(b?.end?.toISOString()).toBe("2026-02-03T09:00:00.000Z");
  });

  it("kendi ayrıştırıcımız da gidiş-dönüşte aynı tarihi okur", () => {
    const { olaylar, hatalar } = icsOku(metin);
    expect(hatalar).toEqual([]);
    expect(olaylar[0]).toEqual({
      uid: "gorev-1@akredit.org",
      baslik: "Ders notlarını aktarın; MAT101, bölüm 2",
      tarih: "2026-01-22",
      bitisTarihi: "2026-01-23",
    });
  });

  it("satır katlama çok baytlı karakteri bölmez", () => {
    const k = satirKatla(`SUMMARY:${"ğ".repeat(60)}`);
    expect(k.split("\r\n ").join("")).toBe(`SUMMARY:${"ğ".repeat(60)}`);
  });

  it("tarihi olmayan olay reddedilir", () => {
    expect(() => icsUret([{ uid: "x", baslik: "x" }], { ad: "x", damga: DAMGA })).toThrow(RangeError);
  });
});

describe("akademik takvim içe aktarma", () => {
  // Uydurma bir üniversitenin takvim dışa aktarımı (test/fixtures).
  const ics = readFileSync(new URL("./fixtures/akademik-takvim.ics", import.meta.url), "utf8");

  it("eşleşen olaylar takvim anahtarına, diğerleri eşleşmeyen listesine gider", () => {
    const r = akademikTakvimEsle(ics, [
      { icerir: "yarıyılı sonu sınavları", anahtar: "donem_sonu", gun: "bitis" },
      { icerir: "not girişi", anahtar: "not_giris_son", gun: "bitis" },
      { icerir: "BOLOGNA", anahtar: "bologna_hafta" },
      { icerir: "bütünleme", anahtar: "butunleme" },
    ]);
    // Final dönemi 5–16 Ocak (DTEND 17 Ocak, dışlayıcı) → bitiş 16 Ocak
    expect(r.takvim).toEqual({ donem_sonu: "2026-01-16", not_giris_son: "2026-01-21", bologna_hafta: "2026-06-01" });
    // İki bütünleme olayı farklı tarihte: insan karar verir
    expect(r.catisan).toEqual([{ anahtar: "butunleme", tarihler: ["2026-01-26", "2026-06-29"] }]);
    expect(r.eslesmeyen).toEqual(["Cumhuriyet Bayramı"]);
    expect(r.hatalar).toEqual(["Tarihi ya da adı okunamayan olay: Bozuk olay"]);
  });

  it("geçersiz eşleşme reddedilir", () => {
    expect(() => akademikTakvimEsle(ics, [])).toThrow();
    expect(() => akademikTakvimEsle(ics, [{ icerir: "x", anahtar: "Büyük" }])).toThrow();
  });
});

describe("e-posta gönderici", () => {
  it("ortamdan ayar: sunucu yoksa yapılandırılmamış", () => {
    expect(ortamdanEpostaAyari({})).toBeNull();
    expect(ortamdanEpostaAyari({ AKREDIT_SMTP_SUNUCU: "smtp.ornek.test", AKREDIT_SMTP_PORT: "465" })).toMatchObject({
      sunucu: "smtp.ornek.test",
      port: 465,
      guvenli: true,
    });
  });

  it("SMTP taşıyıcı iletiyi MIME olarak üretir (ağsız akış taşıyıcısı)", async () => {
    const gonderilen: string[] = [];
    const ayar = ortamdanEpostaAyari({ AKREDIT_SMTP_SUNUCU: "smtp.ornek.test" });
    if (!ayar) throw new Error();
    const t = smtpTasiyici(ayar, { transport: { streamTransport: true, buffer: true, newline: "unix" } });
    // sendMail sonucu akış taşıyıcısında mesajdır; doğrudan nodemailer ile aynı ayarı sınarız.
    const kimlik = kimlikEpostaGondericisi({
      async gonder(i) {
        await t.gonder(i);
        gonderilen.push(`${i.alici}|${i.konu}|${i.metin}`);
      },
    });
    await kimlik.sihirliBaglanti("ayse.yilmaz@ornek.edu.tr", "https://akredit.org/giris?b=uydurma");
    await kimlik.supheliGiris("ayse.yilmaz@ornek.edu.tr", {
      zaman: new Date("2026-10-27T08:00:00Z"),
      cihaz: "Firefox / Linux",
    });
    expect(gonderilen[0]).toContain("Akredit giriş bağlantınız");
    expect(gonderilen[0]).toContain("https://akredit.org/giris?b=uydurma");
    expect(gonderilen[1]).toContain("27.10.2026 11:00:00");
  });

  it("geçersiz alıcı ve gönderim hatası iletide alıcıyı ve içeriği sızdırmaz", async () => {
    const ayar = ortamdanEpostaAyari({ AKREDIT_SMTP_SUNUCU: "smtp.ornek.test" });
    if (!ayar) throw new Error();
    const t = smtpTasiyici(ayar, { transport: { streamTransport: true } });
    await expect(t.gonder({ alici: "gecersiz", konu: "k", metin: "m" })).rejects.toBeInstanceOf(
      EpostaGonderilemediHatasi,
    );
    const bozuk = smtpTasiyici(ayar, {
      transport: {
        name: "bozuk",
        version: "1",
        send(_m: unknown, cb: (e: Error) => void) {
          cb(new Error("550 ayse.yilmaz@ornek.edu.tr bulunamadı"));
        },
      },
    });
    const hata = await bozuk
      .gonder({ alici: "ayse.yilmaz@ornek.edu.tr", konu: "gizli", metin: "gizli" })
      .catch((e) => e);
    expect(hata).toBeInstanceOf(EpostaGonderilemediHatasi);
    expect(String(hata.message)).not.toContain("ayse");
  });

  it("bellek taşıyıcı gönderilenleri tutar", async () => {
    const b = bellekTasiyici();
    await b.gonder({ alici: "a@ornek.test", konu: "k", metin: "m" });
    expect(b.kutu).toHaveLength(1);
  });
});
