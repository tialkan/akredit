// İP-47: disipline ya da programa özgü içeriğin ve EPDAD göstergelerinin ölçüt ağacına bağlanması (saf).

import { describe, expect, it } from "vitest";
import {
  belgeAdi,
  EPDAD_OGRETMEN_1_1,
  FEDEK_4_1,
  MUDEK_EK1,
  MUDEK_LISANS_3_1,
  type Olcut,
  olcutEkleri,
  ozguBagi,
  ozguBolumListesi,
  PROGRAM_BELGELERI,
  tumOlcutler,
} from "../src/index.ts";

const kodlar = (o: readonly Olcut[]) => tumOlcutler(o).map((x) => x.kod);

describe("özgü içerik bağları", () => {
  it("bağlı ölçüt çerçevenin ağacında var ve metni bağı söyler", () => {
    // MÜDEK 3.1 Ölçüt 5.1 metni "EK-1'de verilen disipline özgü konuları içermelidir" der; FEDEK 4.1 10.1
    // "Programa özgü ölçütlerin sağlandığı kanıtlanmış" der.
    const m = tumOlcutler(MUDEK_LISANS_3_1.olcutler).find((o) => o.kod === ozguBagi("mudek-lisans")?.olcutKod);
    expect(m?.metin).toContain("EK-1’de verilen disipline özgü konuları");
    const f = tumOlcutler(FEDEK_4_1.olcutler).find((o) => o.kod === ozguBagi("fedek-lisans")?.olcutKod);
    expect(f?.metin).toContain("Programa özgü ölçütlerin");
    expect(ozguBagi("epdad-ogretmen")).toBeNull();
  });

  it("seçim yoksa özgü konu gelmez; Akredit tahmin etmez", () => {
    expect(olcutEkleri("mudek-lisans", "5.1", [])).toEqual([]);
    expect(olcutEkleri("mudek-lisans", "5.2", ["bilgisayar-yazilim"])).toEqual([]);
    expect(olcutEkleri("mudek-lisans", "5.1", ["olmayan-kod"])).toEqual([]);
  });

  it("seçilen disiplinin konuları sırasıyla, kaynak sayfasıyla gelir", () => {
    const b = MUDEK_EK1.bolumler.find((x) => x.kod === "bilgisayar-yazilim");
    const e = olcutEkleri("mudek-lisans", "5.1", ["bilgisayar-yazilim"]);
    expect(e).toHaveLength(b?.konular.length ?? -1);
    expect(e[0]).toMatchObject({
      tur: "ozgu_konu",
      kimlik: "mudek-lisans/bilgisayar-yazilim/1",
      grup: "Ortak Konular:",
      kaynak: { dosya: PROGRAM_BELGELERI.mudekLisans31.dosya, sayfa: 11 },
    });
    // İki disiplin seçilince ikisinin konuları da gelir (belge: birden fazla disiplin kümesi).
    const iki = olcutEkleri("mudek-lisans", "5.1", [
      "bilgisayar-yazilim",
      ozguBolumListesi("mudek-lisans")[1]?.kod ?? "",
    ]);
    expect(iki.length).toBeGreaterThan(e.length);
  });

  it("EPDAD alt standardının göstergeleri gelir; düzeyi okunamayan null kalır", () => {
    const e = olcutEkleri("epdad-ogretmen", "1.1.1", []);
    expect(e.map((x) => (x.tur === "gosterge" ? x.no : 0))).toEqual([1, 2, 3, 4]);
    const bos = olcutEkleri("epdad-ogretmen", "2.1.1", []).find((x) => x.tur === "gosterge" && x.no === 1);
    expect(bos?.tur === "gosterge" && bos.duzeyler).toBeNull();
    // Her alt standart ağaçta var; alan düzeyinde gösterge yok.
    expect(olcutEkleri("epdad-ogretmen", "1", [])).toEqual([]);
    const agac = new Set(kodlar(EPDAD_OGRETMEN_1_1.olcutler));
    expect(agac.has("7.3.1")).toBe(true);
  });

  it("belge adı kaynak listesinden gelir", () => {
    expect(belgeAdi(PROGRAM_BELGELERI.fedek41.dosya ?? "")).toBe(PROGRAM_BELGELERI.fedek41.not);
    expect(belgeAdi("yok.pdf")).toBe("yok.pdf");
  });
});
