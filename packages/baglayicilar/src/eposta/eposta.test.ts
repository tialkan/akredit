import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { imapEsitle, type Soket } from "./imap.ts";
import { adresAl, dogrulamaOku, kodluSozcukCoz, MimeHatasi, mimeAyristir, parametreler } from "./mime.ts";

const eml = new Uint8Array(readFileSync(new URL("./test/fixtures/ileti.eml", import.meta.url)));
const td = new TextDecoder();

describe("MIME ayrıştırma", () => {
  it("kurgu iletiden gönderen, konu, doğrulama ve ekleri çıkarır; gövde metnini almaz", () => {
    const r = mimeAyristir(eml, "mx.ornek.edu.tr");
    expect(r.gonderen).toBe("deneme.ornekoglu@ornek.edu.tr");
    // iso-8859-9 Q ("Dan=FD=FEma" → "Danışma") + utf-8 B (" tutanağı"); aradaki boşluk RFC 2047'ye göre atılır
    expect(r.konu).toBe("Danışma kurulu tutanağı");
    expect(r.mesajKimligi).toBe("<kurgu-1@ornek.edu.tr>");
    expect(r.tarih).toBe("2025-03-14T07:15:00.000Z");
    // Güvenilir sunucunun başlığı: iki DKIM imzasından biri geçerli → pass; sahte başlık yok sayılır.
    expect(r.dogrulama).toEqual({ spf: "pass", dkim: "pass", dmarc: "pass" });
    expect(r.ekler.map((e) => [e.ad, e.mime, td.decode(e.veri)])).toEqual([
      ["Toplantı tutanağı.pdf", "application/pdf", "%PDF-1.4 kurgu"], // RFC 2231 devam parçaları
      ["_.._katilim.csv", "text/csv", "Birim;Sayı\nKurgu;12"], // yol geçişi etkisiz, QP çözüldü
    ]);
    const json = JSON.stringify({ ...r, ekler: r.ekler.map((e) => e.ad) });
    expect(json).not.toContain("talimat");
    expect(json).not.toContain("önsöz");
  });

  it("güvenilir sunucu başlığı yoksa doğrulama 'none' olur (epostaAl reddeder)", () => {
    expect(mimeAyristir(eml, "mx.baska.edu.tr").dogrulama).toEqual({ spf: "none", dkim: "none", dmarc: "none" });
    expect(dogrulamaOku([{ ad: "authentication-results", deger: "mx.x; dkim=fail; spf=softfail" }], "mx.x")).toEqual({
      spf: "softfail",
      dkim: "fail",
      dmarc: "none",
    });
  });

  it("yardımcılar: kodlu sözcük, parametre, adres", () => {
    expect(kodluSozcukCoz("=?UTF-8?Q?=C3=96l=C3=A7me_raporu?=")).toBe("Ölçme raporu");
    expect(kodluSozcukCoz("düz metin")).toBe("düz metin");
    expect(parametreler('attachment; filename="a;b.pdf"')).toEqual({ deger: "attachment", param: { filename: "a;b.pdf" } });
    expect(parametreler("x; name*=iso-8859-9''%FEube.pdf").param.name).toBe("şube.pdf");
    expect(adresAl('"Ad, Soyad" <A@B.edu.tr>')).toBe("a@b.edu.tr");
    expect(adresAl("c@d.edu.tr")).toBe("c@d.edu.tr");
  });

  it("boyut, parça ve derinlik sınırları", () => {
    expect(() => mimeAyristir(eml, "mx", { enBuyukBoyut: 10, enCokParca: 10, enDerin: 5 })).toThrow(MimeHatasi);
    expect(() => mimeAyristir(eml, "mx", { enBuyukBoyut: 1e9, enCokParca: 3, enDerin: 5 })).toThrow(/çok fazla parça/);
    expect(() => mimeAyristir(eml, "mx", { enBuyukBoyut: 1e9, enCokParca: 99, enDerin: 1 })).toThrow(/iç içe/);
  });

  it("8 bit UTF-8 başlık ve tek parçalı ek", () => {
    const ham = new TextEncoder().encode(
      'From: a@ornek.edu.tr\r\nSubject: Ölçme çizelgesi\r\nContent-Type: application/pdf; name="ç.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nJVBERg==\r\n',
    );
    const r = mimeAyristir(ham, "mx");
    expect(r.konu).toBe("Ölçme çizelgesi");
    expect(r.ekler.map((e) => [e.ad, td.decode(e.veri)])).toEqual([["ç.pdf", "%PDF"]]);
  });
});

/** Kayıtlı IMAP oturum dökümüyle çalışan sahte soket (kurgu sunucu yanıtları, RFC 9051 biçiminde). */
function sahteSoket(uidValidity: number, iletiler: Record<number, Uint8Array>, ayar: { authNo?: boolean } = {}) {
  const yazilan: string[] = [];
  const kuyruk: Buffer[] = [Buffer.from("* OK [CAPABILITY IMAP4rev1 AUTH=XOAUTH2] Kurgu IMAP hazir\r\n")];
  let kapandi = false;
  const yanit = (komut: string) => {
    const [etiket, ...k] = komut.trim().split(" ");
    const g = k.join(" ");
    const s = (x: string) => kuyruk.push(Buffer.from(x, "latin1"));
    if (g.startsWith("AUTHENTICATE XOAUTH2")) {
      if (ayar.authNo) {
        s("+ eyJzdGF0dXMiOiI0MDEifQ==\r\n");
        return;
      }
      s(`${etiket} OK Kimlik dogrulandi\r\n`);
    } else if (g === "") {
      s("A001 NO [AUTHENTICATIONFAILED] Gecersiz\r\n");
    } else if (g.startsWith("EXAMINE")) {
      s(`* ${Object.keys(iletiler).length} EXISTS\r\n* OK [UIDVALIDITY ${uidValidity}] UIDs valid\r\n* OK [UIDNEXT 99] x\r\n${etiket} OK [READ-ONLY] EXAMINE tamam\r\n`);
    } else if (g.startsWith("UID SEARCH UID ")) {
      const bas = Number(g.match(/UID (\d+):\*/)?.[1]);
      const tum = Object.keys(iletiler).map(Number);
      const uygun = tum.filter((u) => u >= bas);
      const enBuyuk = Math.max(...tum);
      s(`* SEARCH ${(uygun.length ? uygun : [enBuyuk]).join(" ")}\r\n${etiket} OK SEARCH tamam\r\n`);
    } else if (g.startsWith("UID FETCH ")) {
      const uid = Number(g.split(" ")[2]);
      const v = iletiler[uid];
      if (!v) return s(`${etiket} NO yok\r\n`);
      kuyruk.push(Buffer.from(`* ${uid} FETCH (UID ${uid} BODY[] {${v.length}}\r\n`, "latin1"), Buffer.from(v), Buffer.from(")\r\n"));
      s(`${etiket} OK FETCH tamam\r\n`);
    } else if (g === "LOGOUT") s(`* BYE\r\n${etiket} OK LOGOUT\r\n`);
    else s(`${etiket} BAD\r\n`);
  };
  const soket: Soket = {
    async yaz(v) {
      yazilan.push(v);
      yanit(v);
    },
    async oku() {
      // Yanıtları küçük parçalara bölerek akış davranışını sınar.
      const p = kuyruk.shift();
      if (!p) return null;
      if (p.length > 7) {
        kuyruk.unshift(p.subarray(7));
        return new Uint8Array(p.subarray(0, 7));
      }
      return new Uint8Array(p);
    },
    async kapat() {
      kapandi = true;
    },
  };
  return { soket, yazilan, kapandi: () => kapandi };
}

const SECENEK = { kullanici: "kanit@ornek.edu.tr", erisim: "kurgu-imap-belirteci", guvenilirSunucu: "mx.ornek.edu.tr" };

describe("IMAP eşitleme", () => {
  it("XOAUTH2 ile girer, kutuyu salt okunur açar, iletileri PEEK ile alır ve durumu döndürür", async () => {
    const s = sahteSoket(777, { 5: eml, 9: eml });
    const kayit: string[] = [];
    const r = await imapEsitle(s.soket, null, { ...SECENEK, kayit: (x) => kayit.push(x) });
    expect(r.durum).toEqual({ uidGecerlilik: 777, sonUid: 9 });
    expect(r.iletiler.map((i) => [i.uid, i.ekler.length, i.dogrulama.dmarc])).toEqual([
      [5, 2, "pass"],
      [9, 2, "pass"],
    ]);
    expect(s.yazilan.map((y) => y.replace(/XOAUTH2 \S+/, "XOAUTH2 …"))).toEqual([
      "A001 AUTHENTICATE XOAUTH2 …\r\n",
      'A002 EXAMINE "INBOX"\r\n',
      "A003 UID SEARCH UID 1:*\r\n",
      "A004 UID FETCH 5 (UID BODY.PEEK[])\r\n",
      "A005 UID FETCH 9 (UID BODY.PEEK[])\r\n",
      "A006 LOGOUT\r\n",
    ]);
    // XOAUTH2 dizesi RFC biçiminde; belirteç kayda girmez, soket kapatılır.
    const xo = Buffer.from(s.yazilan[0]?.split(" ")[3]?.trim() ?? "", "base64").toString();
    expect(xo).toBe("user=kanit@ornek.edu.tr\x01auth=Bearer kurgu-imap-belirteci\x01\x01");
    expect(kayit.join("\n")).not.toContain("kurgu-imap-belirteci");
    expect(kayit.join("\n")).not.toContain(s.yazilan[0]?.split(" ")[3]?.trim());
    expect(s.yazilan.some((y) => /STORE|EXPUNGE|SELECT|COPY|MOVE/.test(y))).toBe(false);
    expect(s.kapandi()).toBe(true);
  });

  it("aynı UIDVALIDITY ile yalnız yeni iletileri alır; yeni ileti yoksa '*' dönüşünü eler", async () => {
    const s = sahteSoket(777, { 5: eml, 9: eml, 12: eml });
    const r = await imapEsitle(s.soket, { uidGecerlilik: 777, sonUid: 9 }, SECENEK);
    expect(r.iletiler.map((i) => i.uid)).toEqual([12]);
    expect(s.yazilan[2]).toBe("A003 UID SEARCH UID 10:*\r\n");

    const s2 = sahteSoket(777, { 5: eml, 9: eml });
    const r2 = await imapEsitle(s2.soket, { uidGecerlilik: 777, sonUid: 9 }, SECENEK);
    expect(r2.iletiler).toEqual([]); // sunucu "10:*" için 9'u döndürür, elenir
    expect(r2.durum.sonUid).toBe(9);
  });

  it("UIDVALIDITY değişirse baştan eşitler ve uyarır", async () => {
    const s = sahteSoket(888, { 2: eml });
    const r = await imapEsitle(s.soket, { uidGecerlilik: 777, sonUid: 50 }, SECENEK);
    expect(r.iletiler.map((i) => i.uid)).toEqual([2]);
    expect(r.uyarilar[0]).toMatch(/baştan eşitlendi/);
  });

  it("ileti sınırı: sonUid yalnız alınan son iletiye ilerler", async () => {
    const s = sahteSoket(1, { 1: eml, 2: eml, 3: eml });
    const r = await imapEsitle(s.soket, null, { ...SECENEK, enCokIleti: 2 });
    expect(r.durum.sonUid).toBe(2);
    expect(r.uyarilar).toEqual(["İleti sayısı sınırına ulaşıldı; kalanlar sonraki eşitlemede alınacak."]);
  });

  it("giriş reddedilirse yeniden bağlanma iletisi verir, belirteç iletide yoktur", async () => {
    const s = sahteSoket(1, {}, { authNo: true });
    const hata = await imapEsitle(s.soket, null, SECENEK).catch((e: Error) => e.message);
    expect(hata).toMatch(/yeniden bağlayın/);
    expect(hata).not.toContain("kurgu");
    expect(s.kapandi()).toBe(true);
  });
});
