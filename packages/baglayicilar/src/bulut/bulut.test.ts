import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sahteBaglam } from "../avesis/test/sahte.ts";
import { type Belirtec, belirtecKasasi, gecerliBelirtec, TOKEN_ADRESI } from "./belirtec.ts";
import { BULUT_KOSULU, klasorEsitle } from "./esitleme.ts";

const K = JSON.parse(readFileSync(new URL("./test/fixtures/yanitlar.json", import.meta.url), "utf8"));
const GD = "https://www.googleapis.com/drive/v3";
const GR = "https://graph.microsoft.com/v1.0";
const driveListe = (id: string, sayfa?: string) =>
  `${GD}/files?${new URLSearchParams({
    q: `'${id}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,md5Checksum,modifiedTime,size)",
    pageSize: "100",
    ...(sayfa ? { pageToken: sayfa } : {}),
  })}`;
const graphListe = (id: string) =>
  `${GR}/me/drive/items/${encodeURIComponent(id)}/children?$select=id,name,eTag,cTag,size,lastModifiedDateTime,folder,file&$top=200`;
const j = (o: unknown) => JSON.stringify(o);
const KURUM = "00000000-0000-4000-8000-000000000001";
// Testte sabit, kurgu ana anahtar (gerçek anahtar ortamdan gelir).
const ANA = new Uint8Array(32).fill(7);

const driveYanitlari = () => ({
  [driveListe("KOK")]: j(K.driveKok1),
  [driveListe("KOK", "sayfa-2")]: j(K.driveKok2),
  [driveListe("klasorB")]: j(K.driveAlt),
  [`${GD}/files/dosyaA1?alt=media`]: "%PDF-kurgu1",
  [`${GD}/files/belgeC/export?mimeType=${encodeURIComponent("application/vnd.openxmlformats-officedocument.wordprocessingml.document")}`]:
    "DOCX-kurgu",
  [`${GD}/files/dosyaE?alt=media`]: "XLSX!",
});

describe("Google Drive eşitleme", () => {
  it("sayfalı listeyi ve alt klasörü okur, Google belgesini dışa aktarır, desteklenmeyen türü uyarır", async () => {
    const s = sahteBaglam(driveYanitlari());
    const r = await klasorEsitle("google", "KOK", "kurgu-erisim", {}, s.baglam);
    expect(r.girdiler.map((g) => [g.dosyaAdi, g.mime, new TextDecoder().decode(g.veri)])).toEqual([
      ["Danışma Kurulu Tutanağı.pdf", "application/pdf", "%PDF-kurgu1"],
      [
        "Öz Değerlendirme Taslağı.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "DOCX-kurgu",
      ],
      ["KRG101_ölçme.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX!"],
    ]);
    expect(r.girdiler[2]?.kaynakAyrinti).toEqual({
      baglayici: "google-drive",
      dosyaId: "dosyaE",
      yol: "Ders Dosyaları/KRG101_ölçme.xlsx", // "/" ad içinde yol geçişine izin vermez
      surum: "eeee5555",
    });
    expect(r.uyarilar).toEqual(["Kurgu Anket: bu Google dosya türü alınamıyor."]);
    expect(r.durum).toEqual({ dosyaA1: "aaaa1111", belgeC: "2025-04-01T10:00:00.000Z", dosyaE: "eeee5555" });
    // Her istekte belirteç yalnız Authorization başlığında; adreste yok.
    expect(s.istekler.every((i) => i.basliklar.authorization === "Bearer kurgu-erisim")).toBe(true);
    expect(s.istekler.some((i) => i.adres.includes("kurgu-erisim"))).toBe(false);
    // 6 istek, ilki beklemez: 5 × 200 ms
    expect(s.beklemeler).toEqual([200, 200, 200, 200, 200]);
    expect(BULUT_KOSULU.google.durum).toBe("DOĞRULANMADI");
  });

  it("ikinci eşitlemede yalnız değişen dosya alınır; kaybolan dosya bildirilir, silinmez", async () => {
    const y = driveYanitlari();
    const ilk = await klasorEsitle("google", "KOK", "e", {}, sahteBaglam(y).baglam);
    const k2 = structuredClone(K.driveAlt);
    k2.files[0].md5Checksum = "eeee6666";
    const s = sahteBaglam({ ...y, [driveListe("klasorB")]: j(k2) });
    const r = await klasorEsitle("google", "KOK", "e", { ...ilk.durum, eskiDosya: "x" }, s.baglam);
    expect(r.girdiler.map((g) => g.dosyaAdi)).toEqual(["KRG101_ölçme.xlsx"]);
    expect(r.kaybolan).toEqual(["eskiDosya"]);
    expect(s.istekler.filter((i) => i.adres.includes("alt=media"))).toHaveLength(1);
  });

  it("401 yanıtı yeniden bağlanma iletisine çevrilir; bozuk yanıt reddedilir; geçersiz klasör kimliği", async () => {
    const s = sahteBaglam({ [driveListe("KOK")]: { durum: 401, govde: "" } });
    await expect(klasorEsitle("google", "KOK", "e", {}, s.baglam)).rejects.toThrow(/yeniden bağlayın/);
    const s2 = sahteBaglam({ [driveListe("KOK")]: j({ dosyalar: [] }) });
    await expect(klasorEsitle("google", "KOK", "e", {}, s2.baglam)).rejects.toThrow(/beklenen biçimde/);
    await expect(klasorEsitle("google", "a' or '1", "e", {}, s2.baglam)).rejects.toThrow(/Klasör kimliği/);
  });
});

describe("OneDrive eşitleme", () => {
  it("nextLink ile sayfalar, alt klasöre iner, büyük dosyayı indirmeden atlar", async () => {
    const s = sahteBaglam({
      [graphListe("KOK!1")]: j(K.graphKok1),
      [K.graphKok1["@odata.nextLink"]]: j(K.graphKok2),
      [graphListe("KOK!20")]: j(K.graphAlt),
      [`${GR}/me/drive/items/KOK!10/content`]: "DOCX123",
      [`${GR}/me/drive/items/KOK!21/content`]: "PDF",
    });
    const r = await klasorEsitle("microsoft", "KOK!1", "e", {}, s.baglam, { enBuyukDosya: 1000 });
    expect(r.girdiler.map((g) => [g.dosyaAdi, g.kaynakAyrinti?.yol])).toEqual([
      ["Program Çıktıları.docx", "Program Çıktıları.docx"],
      ["eski.pdf", "Arşiv/eski.pdf"],
    ]);
    expect(r.uyarilar).toEqual(["cok-buyuk.zip: dosya çok büyük, alınmadı."]);
    expect(r.durum).toEqual({ "KOK!10": '"c:{E1},1"', "KOK!21": '"c:{E3},1"' });
    expect(s.istekler.some((i) => i.adres.includes("KOK!11/content"))).toBe(false);
  });

  it("Graph dışına giden nextLink izlenmez", async () => {
    const s = sahteBaglam({ [graphListe("KOK!1")]: j({ "@odata.nextLink": "https://kotu.ornek/x", value: [] }) });
    await expect(klasorEsitle("microsoft", "KOK!1", "e", {}, s.baglam)).rejects.toThrow(/beklenen biçimde/);
  });
});

describe("OAuth belirteç kasası", () => {
  const b: Belirtec = {
    erisim: "kurgu-erisim-belirteci",
    yenileme: "kurgu-yenileme-belirteci",
    bitis: "2026-10-27T09:30:00.000Z",
    kapsam: "drive.readonly",
  };

  it("şifreli metin belirteci açık içermez; doğru kurum ve sağlayıcıyla açılır", () => {
    const kasa = belirtecKasasi(ANA);
    const c = kasa.sifrele(b, KURUM, "google");
    expect(c).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(c).not.toContain("kurgu");
    expect(kasa.coz(c, KURUM, "google")).toEqual(b);
    // Aynı belirteç iki kez şifrelenince IV farklıdır
    expect(kasa.sifrele(b, KURUM, "google")).not.toBe(c);
  });

  it("başka kurum, başka sağlayıcı, başka anahtar ya da değiştirilmiş metin açılmaz", () => {
    const kasa = belirtecKasasi(ANA);
    const c = kasa.sifrele(b, KURUM, "google");
    expect(() => kasa.coz(c, "00000000-0000-4000-8000-000000000002", "google")).toThrow(/yeniden bağlayın/);
    expect(() => kasa.coz(c, KURUM, "microsoft")).toThrow(/yeniden bağlayın/);
    expect(() => belirtecKasasi(new Uint8Array(32).fill(8)).coz(c, KURUM, "google")).toThrow(/yeniden bağlayın/);
    const p = c.split(".");
    const bozuk = [p[0], p[1], p[2], `${(p[3] ?? "").slice(0, -2)}AA`].join(".");
    expect(() => kasa.coz(bozuk, KURUM, "google")).toThrow(/yeniden bağlayın/);
    expect(() => kasa.coz("duz-metin", KURUM, "google")).toThrow(/yeniden bağlayın/);
    expect(() => belirtecKasasi(new Uint8Array(16))).toThrow(/32 bayt/);
  });

  it("süresi dolmak üzereyse yeniler, yeni belirteci şifreli döndürür; hata iletisi belirteç içermez", async () => {
    const kasa = belirtecKasasi(ANA);
    const c = kasa.sifrele({ ...b, bitis: "2026-10-27T09:00:30.000Z" }, KURUM, "google"); // 30 sn kaldı (< 60 sn pay)
    const s = sahteBaglam({ [`POST ${TOKEN_ADRESI.google}`]: j(K.tokenYaniti) });
    const istemci = { istemciKimligi: "kurgu-istemci", istemciSirri: "kurgu-sir" };
    const r = await gecerliBelirtec(kasa, c, KURUM, "google", istemci, s.baglam);
    expect(r.yenilendi).toBe(true);
    // 09:00:00 + 3599 sn = 09:59:59
    expect(r.belirtec).toEqual({
      erisim: "kurgu-yeni-erisim",
      yenileme: "kurgu-yenileme-belirteci",
      bitis: "2026-10-27T09:59:59.000Z",
      kapsam: "https://www.googleapis.com/auth/drive.readonly",
    });
    expect(kasa.coz(r.sifreli, KURUM, "google")).toEqual(r.belirtec);
    expect(new URLSearchParams(s.istekler[0]?.govde ?? "").get("grant_type")).toBe("refresh_token");

    // Süresi geçerliyse istek yapılmaz
    const s2 = sahteBaglam({});
    const g = await gecerliBelirtec(kasa, kasa.sifrele(b, KURUM, "google"), KURUM, "google", istemci, s2.baglam);
    expect(g.yenilendi).toBe(false);
    expect(s2.istekler).toHaveLength(0);

    // Sağlayıcı reddederse
    const s3 = sahteBaglam({ [`POST ${TOKEN_ADRESI.google}`]: { durum: 400, govde: '{"error":"invalid_grant"}' } });
    const hata = await gecerliBelirtec(kasa, c, KURUM, "google", istemci, s3.baglam).catch((e: Error) => e.message);
    expect(hata).toMatch(/yeniden bağlayın/);
    expect(hata).not.toContain("kurgu");
  });

  it("yenileme belirteci yoksa yeniden bağlanma istenir", async () => {
    const kasa = belirtecKasasi(ANA);
    const c = kasa.sifrele({ ...b, yenileme: null, bitis: "2026-10-27T08:00:00.000Z" }, KURUM, "microsoft");
    await expect(
      gecerliBelirtec(kasa, c, KURUM, "microsoft", { istemciKimligi: "i", istemciSirri: "s" }, sahteBaglam({}).baglam),
    ).rejects.toThrow(/süresi doldu/);
  });
});
