import { describe, expect, it } from "vitest";
import { ibanGecerliMi, maskeKaldir, maskele, maskeleyici, tcknGecerliMi } from "../src/guvence/kvkk.ts";

// Kurgu numaralar. 10000000146: tek haneler 1+0+0+0+1=2, çift haneler 0 → (2*7-0) mod 10 = 4 = 10. hane;
// ilk 10 hane toplamı 6 → 11. hane 6. Geçerli.
const TCKN = "10000000146";
// IBAN: TR + BBAN 0006100519786457841326; "TR00" sona alınıp T=29, R=27 ile mod 97 → kontrol hanesi 33 (98 - kalan).
const IBAN = "TR330006100519786457841326";

describe("T.C. kimlik no sağlaması", () => {
  it("geçerli numarayı kabul eder", () => expect(tcknGecerliMi(TCKN)).toBe(true));
  it("son hanesi bozuk numarayı reddeder", () => expect(tcknGecerliMi("10000000147")).toBe(false));
  it("10. hanesi bozuk numarayı reddeder", () => expect(tcknGecerliMi("10000000156")).toBe(false));
  it("0 ile başlayanı ve 11 haneli olmayanı reddeder", () => {
    expect(tcknGecerliMi("01000000146")).toBe(false);
    expect(tcknGecerliMi("1000000014")).toBe(false);
  });
  it("geçersiz numara maskelenmez, geçerli maskelenir", () => {
    const s = maskele(`No: ${TCKN} ve 10000000147`);
    expect(s.metin).toBe("No: [TCKN-1] ve 10000000147");
  });
});

describe("IBAN sağlaması", () => {
  it("geçerli IBAN'ı boşluklu ve boşluksuz kabul eder", () => {
    expect(ibanGecerliMi(IBAN)).toBe(true);
    expect(ibanGecerliMi("TR33 0006 1005 1978 6457 8413 26")).toBe(true);
  });
  it("tek hanesi değişmiş IBAN'ı reddeder", () => expect(ibanGecerliMi("TR330006100519786457841327")).toBe(false));
  it("biçimsiz metni reddeder", () => expect(ibanGecerliMi("TR33")).toBe(false));
  it("geçerli IBAN maskelenir, bozuk olan maskelenmez", () => {
    expect(maskele(`Hesap: ${IBAN}`).metin).toBe("Hesap: [IBAN-1]");
    expect(maskele("Hesap: TR330006100519786457841327").metin).not.toContain("[IBAN");
  });
});

describe("telefon, e-posta, öğrenci no", () => {
  it("telefon biçimlerini maskeler", () => {
    const s = maskele("Ara: +90 532 111 22 33 ya da 0532 111 22 33 ya da 05321112233.");
    expect(s.metin).toBe("Ara: [TELEFON-1] ya da [TELEFON-2] ya da [TELEFON-3].");
  });
  it("e-postayı maskeler", () => {
    expect(maskele("Yazın: ayse.ornek@ornek.edu.tr adresine.").metin).toBe("Yazın: [EPOSTA-1] adresine.");
  });
  it("kurumun öğrenci no desenini maskeler", () => {
    const s = maskele("Öğrenci 2021123456 başvurdu.", { ogrenciNoDesenleri: [/\b20\d{8}\b/u] });
    expect(s.metin).toBe("Öğrenci [ÖĞRENCİ-NO-1] başvurdu.");
  });
  it("kapatılan tür maskelenmez", () => {
    expect(maskele("ayse@ornek.org", { kapali: ["EPOSTA"] }).metin).toBe("ayse@ornek.org");
  });
});

describe("kişi adları", () => {
  it("Türkçe büyük/küçük harf duyarsız eşleşir: İLKNUR, ılgın", () => {
    const s = maskele("İLKNUR YAZ ve ılgın kaya geldi; Ilgın Kaya konuştu. ilknur yaz'ın raporu.", {
      adlar: ["İlknur Yaz", "Ilgın Kaya"],
    });
    expect(s.metin).toBe("[KİŞİ-1] ve [KİŞİ-2] geldi; [KİŞİ-3] konuştu. [KİŞİ-4]'ın raporu.");
    expect(s.eslemeler.map((e) => e.deger)).toEqual(["İLKNUR YAZ", "ılgın kaya", "Ilgın Kaya", "ilknur yaz"]);
  });
  it("kelime içinde eşleşmez", () => {
    expect(maskele("Denizli ilinde", { adlar: ["Deniz"] }).metin).toBe("Denizli ilinde");
  });
  it("aynı yazım aynı yer tutucuyu alır", () => {
    const s = maskele("Ali Veli geldi. Ali Veli gitti.", { adlar: ["Ali Veli"] });
    expect(s.metin).toBe("[KİŞİ-1] geldi. [KİŞİ-1] gitti.");
    expect(s.eslemeler).toHaveLength(1);
  });
  it("uzun ad kısa addan önce eşleşir", () => {
    expect(maskele("Ali Veli Can", { adlar: ["Ali", "Ali Veli Can"] }).metin).toBe("[KİŞİ-1]");
  });
});

describe("geri çevirme", () => {
  it("maskeKaldir(maskele(x)) === x (kayıpsız)", () => {
    const x = `İLKNUR Yaz (${TCKN}, ${IBAN}, 0532 111 22 33, ilknur@ornek.org) ile ılgın kaya görüştü.`;
    const s = maskele(x, { adlar: ["İlknur Yaz", "Ilgın Kaya"] });
    for (const parca of [TCKN, IBAN, "ilknur@ornek.org", "İLKNUR", "ılgın"]) expect(s.metin).not.toContain(parca);
    expect(maskeKaldir(s.metin, s.eslemeler)).toBe(x);
  });
  it("bilinmeyen yer tutucuya dokunmaz; eşleme yoksa metin aynen döner", () => {
    expect(maskeKaldir("[KİŞİ-9]", [{ yerTutucu: "[KİŞİ-1]", tur: "KİŞİ", deger: "A" }])).toBe("[KİŞİ-9]");
    expect(maskeKaldir("x", [])).toBe("x");
  });
  it("maskeleyici birden çok metinde tutarlı numara verir", () => {
    const m = maskeleyici({ adlar: ["Ali Veli"] });
    expect(m.maskele("Ali Veli")).toBe("[KİŞİ-1]");
    expect(m.maskele("Yine Ali Veli")).toBe("Yine [KİŞİ-1]");
    expect(m.kaldir("[KİŞİ-1] geldi")).toBe("Ali Veli geldi");
  });
});

describe("sabit hat telefonu (İP-27, inceleme dalga 1 #5)", () => {
  it("alan kodlu sabit hat ve 850 numaralarını maskeler", () => {
    // Uydurma numaralar.
    const s = maskele("Santral 0212 555 12 34, faks 0312-444-00-11, çağrı +90 850 123 45 67.");
    expect(s.metin).toBe("Santral [TELEFON-1], faks [TELEFON-2], çağrı [TELEFON-3].");
  });
  it("sıradan 10 haneli sayıyı telefon saymaz", () => {
    expect(maskele("Kayıt 1234567890 numaralı.").metin).toBe("Kayıt 1234567890 numaralı.");
  });
});
