-- Kriptografik silme (İP-40). Elle yazılmıştır.
-- Kişiye özgü veri anahtarı `kisi_anahtari` tablosunda, kurum ana anahtarıyla sarılı olarak durur. Kişiye ait
-- şifreli değerler (takma ad eşlemesi, değiştirilemez kayıtlardaki şifreli alanlar) bu anahtarla şifrelenir.
-- Silme hakkı kullanıldığında yalnız anahtar satırı (ve ona bağlı takma ad eşlemeleri) silinir; değiştirilemez
-- tablolar (gunluk, kanit, karar...) dokunulmadan kalır ve günlüğe yeni bir "kvkk.silme_uygulandi" kaydı eklenir.
-- Anahtar satırı güncellenemez: yalnız eklenir ya da silinir.

CREATE TABLE kisi_anahtari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  -- Kişinin kurum içi takma kimliği (HMAC ya da kişi kaydı kimliği); ad, numara gibi açık veri yazılmaz.
  konu text NOT NULL,
  anahtar_sarili bytea NOT NULL,
  olusturma timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT kisi_anahtari_tekil UNIQUE (kurum_id, konu)
);
--> statement-breakpoint
ALTER TABLE takma_ad ADD COLUMN kisi_anahtari_id uuid REFERENCES kisi_anahtari(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE kisi_anahtari ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE kisi_anahtari FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY kiraci_yalitimi ON kisi_anahtari USING (kurum_id = etkin_kurum()) WITH CHECK (kurum_id = etkin_kurum());
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON kisi_anahtari TO akredit_uygulama;
