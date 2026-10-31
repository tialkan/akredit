// İP-47: ÖDR tablo eşleme önerisi görevi. Sahte sağlayıcıyla, ağsız. Ders kodları, adlar ve metinler uydurmadır.
import { describe, expect, it } from "vitest";
import { sahteSaglayici } from "../saglayicilar/sahte.ts";
import {
  type EslemeOnerisiGirdisi,
  eslemeOnerileriniAyikla,
  eslemeOnerisi,
  eslemeVeriBloklari,
  gerekceSorunu,
} from "./esleme-onerisi.ts";
import { gorevCalistir } from "./gorev.ts";

const girdi: EslemeOnerisiGirdisi = {
  dersEslemeAdi: "kategori",
  dersKodlari: ["MTB", "MK", "GE"],
  kurulCiktilari: [
    { kod: "3.C1", etiket: "Matematik ve fen bilgisini uygulama becerisi" },
    { kod: "3.C2", etiket: "Takım çalışması becerisi" },
  ],
  dersler: [
    { kod: "MAT101", ad: "Matematik I", bilgi: "Dersin Amacı: limit ve türev. Sorumlu: Dr. Ayşe Yılmaz" },
    { kod: "PRJ201", ad: "Proje", bilgi: "Dersin Amacı: takım içinde tasarım projesi." },
  ],
  programCiktilari: [
    { kod: "P1", metin: "Matematik bilgisini mühendislik problemlerinde uygular." },
    { kod: "P2", metin: "Takım içinde etkin çalışır." },
  ],
};

describe("gerekçe kuralı", () => {
  it("kaynağı olmayan sayı ve atıf biçimi geçmez; kodların rakamları sayı sayılmaz", () => {
    expect(gerekceSorunu("MAT101 limit ve türev işler, temel bilimdir.", "limit ve türev", ["MAT101"])).toBeNull();
    expect(gerekceSorunu("Dersin yüzde 40'ı matematik.", "limit", [])).toMatch(/sayı/u);
    expect(gerekceSorunu("Ders [K:1a2b3c4d] matematiktir.", "", [])).toMatch(/atıf/u);
  });
});

describe("eşleme önerisi görevi (sahte sağlayıcı)", () => {
  it("geçerli öneriler alınır; kaynaksız, listede olmayan ve uydurma sayılı öğe ayıklanır", async () => {
    const s = sahteSaglayici([
      JSON.stringify({
        dersler: [
          {
            dersKod: "MAT101",
            deger: "MTB",
            gerekce: "Limit ve türev işleyen temel matematik dersi.",
            kaynaklar: ["ders:MAT101"],
          },
          // Değer çerçevenin listesinde yok.
          { dersKod: "PRJ201", deger: "XYZ", gerekce: "Takım içinde tasarım projesi.", kaynaklar: ["ders:PRJ201"] },
        ],
        pcKurul: [
          {
            pcKod: "P1",
            kurulCiktilari: ["3.C1"],
            gerekce: "Program çıktısı matematik bilgisini uygulamayı söyler.",
            kaynaklar: ["pc:P1", "kurul:3.C1"],
          },
          // Önerilen kurul çıktısının metnine dayanmıyor.
          { pcKod: "P2", kurulCiktilari: ["3.C2"], gerekce: "Takım içinde çalışmayı söyler.", kaynaklar: ["pc:P2"] },
        ],
      }),
    ]);
    const r = await gorevCalistir(eslemeOnerisi, girdi, s);
    expect(r.gecerli).toBe(false);
    const a = eslemeOnerileriniAyikla(r.veri, girdi);
    expect(a.dersler).toEqual([
      {
        dersKod: "MAT101",
        deger: "MTB",
        gerekce: "Limit ve türev işleyen temel matematik dersi.",
        kaynaklar: ["ders:MAT101"],
      },
    ]);
    expect(a.pcKurul.map((x) => x.pcKod)).toEqual(["P1"]);
    expect(a.reddedilen.map((x) => x.alan)).toEqual(["dersler.1", "pcKurul.1"]);
  });

  it("modele giden metin maskelenir ve veri olarak sarılır (ilke 5, 7)", async () => {
    const s = sahteSaglayici([JSON.stringify({ dersler: [], pcKurul: [] })]);
    await gorevCalistir(eslemeOnerisi, { ...girdi, maske: { adlar: ["Ayşe Yılmaz"] } }, s);
    const tum = (s.istekler[0]?.mesajlar ?? []).map((m) => m.icerik).join("\n");
    expect(tum).not.toContain("Ayşe Yılmaz");
    expect(tum).toContain("[KİŞİ-1]");
    expect(tum).toContain("<akredit-veri");
    expect(eslemeVeriBloklari(girdi).dersler).toContain("[ders:MAT101]");
  });

  it("kaynak kimliği uyduran ya da dersin kaydına dayanmayan öneri ayıklanır", () => {
    const a = eslemeOnerileriniAyikla(
      {
        dersler: [
          { dersKod: "MAT101", deger: "MTB", gerekce: "Temel matematik dersi olduğu için.", kaynaklar: ["web:ornek"] },
          { dersKod: "PRJ201", deger: "MK", gerekce: "Takım içinde tasarım projesi.", kaynaklar: ["pc:P2"] },
        ],
        pcKurul: [],
      },
      girdi,
    );
    expect(a.dersler).toEqual([]);
    expect(a.reddedilen.map((x) => x.aciklama)).toEqual([
      "Öneri verilmeyen bir kaynağa dayanıyor.",
      "Öneri dersin Bologna kaydına dayanmalı.",
    ]);
  });

  it("şemada sayı ya da seçmeli yer alanı yok: ek alanlı çıktı şemayı geçmez", () => {
    const c = eslemeOnerisi.sema.safeParse({ dersler: [], pcKurul: [], secmeliYer: [{ yariyil: "3", sayi: 2 }] });
    expect(c.success).toBe(false);
  });
});
