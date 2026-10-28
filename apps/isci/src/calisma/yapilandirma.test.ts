// Ortam doğrulaması: eksik zorunlu değişken açık hata, önemli eksikler uyarı; gizli değer iletiye girmez.
import { describe, expect, it } from "vitest";
import { yapilandirmaOku } from "./yapilandirma.ts";

const VT = "postgres://uygulama:uydurma-parola-123@vt:5432/akredit";
const S3 = {
  S3_UC_NOKTASI: "http://depo:9000",
  S3_KOVA: "akredit-kanit",
  S3_ERISIM_ANAHTARI: "uydurma-erisim",
  S3_GIZLI_ANAHTAR: "uydurma-gizli-deger",
};

describe("işçi yapılandırması", () => {
  it("veritabanı adresi yoksa açık hata verir", () => {
    const s = yapilandirmaOku({ NODE_ENV: "production", ...S3 });
    expect(s.tamam).toBe(false);
    if (!s.tamam) expect(s.hatalar.join(" ")).toMatch(/AKREDIT_VT_ADRES tanımlı değil/u);
  });

  it("boş dize tanımsız sayılır", () => {
    const s = yapilandirmaOku({ AKREDIT_VT_ADRES: "  ", ...S3 });
    expect(s.tamam).toBe(false);
  });

  it("üretimde nesne deposu zorunludur; geliştirmede uyarıdır", () => {
    const u = yapilandirmaOku({ NODE_ENV: "production", AKREDIT_VT_ADRES: VT });
    expect(u.tamam).toBe(false);
    if (!u.tamam) expect(u.hatalar.join(" ")).toMatch(/Nesne deposu tanımlı değil/u);
    const g = yapilandirmaOku({ AKREDIT_VT_ADRES: VT });
    expect(g.tamam).toBe(true);
    expect(g.uyarilar.join(" ")).toMatch(/Nesne deposu/u);
  });

  it("eksik S3 parçası hata, gizli değer iletide yok", () => {
    const s = yapilandirmaOku({
      AKREDIT_VT_ADRES: VT,
      S3_UC_NOKTASI: "http://depo:9000",
      S3_GIZLI_ANAHTAR: "cok-gizli-777",
    });
    expect(s.tamam).toBe(false);
    expect(JSON.stringify(s)).not.toContain("cok-gizli-777");
    expect(JSON.stringify(s)).not.toContain("uydurma-parola-123");
  });

  it("tam üretim ortamı: S3, varsayılan port ve zamanlama; eksik kasa/SMTP uyarı olur", () => {
    const s = yapilandirmaOku({ NODE_ENV: "production", AKREDIT_VT_ADRES: VT, ...S3 });
    expect(s.tamam).toBe(true);
    if (!s.tamam) return;
    expect(s.yapilandirma.depo?.tur).toBe("s3");
    expect(s.yapilandirma.ortam.AKREDIT_ISCI_PORT).toBe(8080);
    expect(s.yapilandirma.ortam.AKREDIT_ISCI_ZAMANLAMA).toBe("1");
    expect(s.uyarilar.join(" ")).toMatch(/AKREDIT_ANAHTAR_KASASI/u);
    expect(s.uyarilar.join(" ")).toMatch(/AKREDIT_SMTP_SUNUCU/u);
    expect(s.uyarilar.join(" ")).toMatch(/AKREDIT_BAGLAYICI_ANAHTARI/u);
  });

  it("bağlayıcı anahtarı 32 bayt olmalı; yerel depo imzası en az 32 karakter", () => {
    const k = yapilandirmaOku({
      AKREDIT_VT_ADRES: VT,
      AKREDIT_BAGLAYICI_ANAHTARI: Buffer.alloc(16).toString("base64"),
    });
    expect(k.tamam).toBe(false);
    const d = yapilandirmaOku({
      AKREDIT_VT_ADRES: VT,
      AKREDIT_DEPO_DIZINI: "/tmp/x",
      AKREDIT_DEPO_IMZA_GIZLISI: "kisa",
    });
    expect(d.tamam).toBe(false);
    const t = yapilandirmaOku({
      AKREDIT_VT_ADRES: VT,
      AKREDIT_DEPO_DIZINI: "/tmp/x",
      AKREDIT_DEPO_IMZA_GIZLISI: "x".repeat(32),
      AKREDIT_BAGLAYICI_ANAHTARI: Buffer.alloc(32, 7).toString("base64"),
    });
    expect(t.tamam).toBe(true);
    if (t.tamam) {
      expect(t.yapilandirma.depo?.tur).toBe("yerel");
      expect(t.yapilandirma.baglayiciAnahtari?.length).toBe(32);
    }
  });

  it("kurum içi model adresi hazır ayarsız verilemez", () => {
    const s = yapilandirmaOku({ AKREDIT_VT_ADRES: VT, AKREDIT_YZ_ADRES: "http://model:11434/v1" });
    expect(s.tamam).toBe(false);
  });
});
