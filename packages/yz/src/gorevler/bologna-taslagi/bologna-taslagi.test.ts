import { taslakDenetle } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import { sahteSaglayici } from "../../saglayicilar/sahte.ts";
import { bolognaTaslagi, bolognaTaslagiUret } from "./index.ts";
import { BEYAN_OZET, ornekCikti, ornekGirdi, ornekKaynak } from "./ornek.ts";

const girdi = ornekGirdi();

describe("bologna-taslagi görevi", () => {
  it("örnek taslak K1-K12'den hatasız ve atıflarıyla geçer", async () => {
    const s = await bolognaTaslagiUret(girdi, sahteSaglayici([JSON.stringify(ornekCikti())]));
    expect(s.sorunlar).toEqual([]);
    expect(s.gecerli).toBe(true);
    expect(s.tur).toBe(1);
    expect(taslakDenetle(s.taslak).bulgular.filter((b) => b.duzey === "hata")).toEqual([]);
    // Sistem alanları modelden değil girdiden gelir.
    expect(s.taslak.kod).toBe("TBP201");
    expect(s.taslak.yetkililer).toEqual(girdi.sabit.yetkililer);
  });

  it("K8 hatası onarım turuna döner, ikinci turda düzelir", async () => {
    const bozuk = ornekCikti();
    // Sınıf dışı çalışma 14×2 → 14×3: toplam 150 + 14 = 164 ≠ 5 × 30.
    (bozuk.isyuku[1] as { sure: number }).sure = 3;
    const sag = sahteSaglayici([JSON.stringify(bozuk), JSON.stringify(ornekCikti())]);
    const s = await bolognaTaslagiUret(girdi, sag);
    expect(s.tur).toBe(2);
    expect(s.gecerli).toBe(true);
    expect(JSON.stringify(sag.istekler[1]?.mesajlar)).toContain("164 saat");
  });

  it("onarım sınırı aşılırsa sorunlarla döner", async () => {
    const bozuk = ornekCikti();
    bozuk.ciktilar = bozuk.ciktilar.slice(0, 5);
    const sag = sahteSaglayici([JSON.stringify(bozuk)], { sonuTekrarla: true });
    const s = await bolognaTaslagiUret(girdi, sag, { enCokOnarim: 1 });
    expect(s.tur).toBe(2);
    expect(s.gecerli).toBe(false);
    expect(s.sorunlar.some((x) => x.alan === "K5")).toBe(true);
  });

  it("okumada geçmeyen kaynak kitap reddedilir", () => {
    const c = ornekCikti();
    c.kaynaklar.push({ yazar: "Uydurma Yazar", eser: "Var Olmayan Kitap", atif: ornekKaynak() });
    expect(bolognaTaslagi.denetle(c, girdi).some((x) => x.aciklama.includes("Var Olmayan Kitap"))).toBe(true);
  });

  it("dayanaksız bölüm ve olmayan kanıta atıf sorun verir", () => {
    const c = ornekCikti();
    c.dayanaklar = [{ bolum: "amac", atif: "[K:99999999 b.x]" }];
    const s = bolognaTaslagi.denetle(c, girdi);
    expect(s.some((x) => x.alan === "dayanaklar.icerik")).toBe(true);
    expect(s.some((x) => x.alan === "dayanaklar.0")).toBe(true);
  });

  it("beyana atıf geçerlidir; beyandaki e-posta modele maskeli gider, yetkili gitmez", () => {
    const c = ornekCikti();
    c.dayanaklar.push({ bolum: "yontem", atif: `[K:${BEYAN_OZET.slice(0, 8)} b.beyan]` });
    expect(bolognaTaslagi.denetle(c, girdi)).toEqual([]);
    const m = JSON.stringify(bolognaTaslagi.istem(girdi));
    expect(m).not.toContain("deneme@ornek.edu.tr");
    expect(m).not.toContain("ad.soyad@uni.edu.tr");
  });
});
