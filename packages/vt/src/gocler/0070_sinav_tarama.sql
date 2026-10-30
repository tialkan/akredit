-- Toplu sınav kâğıdı taraması (İP-43). Elle yazılmıştır. Bu İP 0070-0079 aralığını kullanır.
--
-- Dört kiracı tablosu, dördü de yalnız eklenir (güncelleme, silme, boşaltma reddedilir). Öğrenci numarası hiçbir
-- sütuna yazılmaz: yalnız HMAC takma ad. Hücre kararı yalnız onay bekleyen hücreye, yalnız doğrudan (kişi) dayanakla
-- ve hücre başına bir kez verilir; kararı veren aynı kurumun kişisidir.

CREATE TABLE sinav_sablonu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  olcme_araci_id uuid NOT NULL REFERENCES olcme_araci(id),
  sablon jsonb NOT NULL,
  olusturan_kisi_id uuid REFERENCES kisi(id),
  olusturma timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE sinav_taramasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  olcme_araci_id uuid NOT NULL REFERENCES olcme_araci(id),
  sablon_id uuid NOT NULL REFERENCES sinav_sablonu(id),
  kanit_id uuid NOT NULL REFERENCES kanit(id),
  saglayici text NOT NULL,
  model text NOT NULL,
  esik real NOT NULL,
  kagit_sayisi integer NOT NULL,
  baslatan_kisi_id uuid REFERENCES kisi(id),
  olusturma timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT sinav_taramasi_esik CHECK (esik >= 0 AND esik <= 1),
  CONSTRAINT sinav_taramasi_kagit CHECK (kagit_sayisi >= 0)
);
--> statement-breakpoint
CREATE TABLE sinav_hucresi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  tarama_id uuid NOT NULL REFERENCES sinav_taramasi(id),
  kagit_sira integer NOT NULL,
  ogrenci_takma_ad text,
  alan text NOT NULL,
  deger numeric(8, 3),
  guven real NOT NULL,
  durum text NOT NULL,
  katman smallint NOT NULL,
  nedenler text[] DEFAULT '{}' NOT NULL,
  kirpinti_ozeti text,
  olusturma timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT sinav_hucresi_tekil UNIQUE (tarama_id, kagit_sira, alan),
  CONSTRAINT sinav_hucresi_durum CHECK (durum IN ('otomatik', 'onay_bekliyor')),
  CONSTRAINT sinav_hucresi_guven CHECK (guven >= 0 AND guven <= 1),
  -- Onaya düşen hücre her zaman Katman 2'dir (devredilemez); otomatik hücre Katman 0.
  CONSTRAINT sinav_hucresi_katman CHECK ((durum = 'onay_bekliyor' AND katman = 2) OR (durum = 'otomatik' AND katman = 0)),
  -- Takma ad HMAC onaltılık biçimindedir; açık numara (yalnız rakam) yazılamaz.
  CONSTRAINT sinav_hucresi_takma_ad CHECK (ogrenci_takma_ad IS NULL OR ogrenci_takma_ad ~ '^[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE TABLE sinav_hucre_karari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  hucre_id uuid NOT NULL REFERENCES sinav_hucresi(id),
  sonuc text NOT NULL,
  deger numeric(8, 3),
  ogrenci_takma_ad text,
  karar_veren_kisi_id uuid NOT NULL REFERENCES kisi(id),
  dayanak text DEFAULT 'dogrudan' NOT NULL,
  zaman timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT sinav_hucre_karari_tekil UNIQUE (hucre_id),
  CONSTRAINT sinav_hucre_karari_sonuc CHECK (sonuc IN ('onaylandi', 'duzeltildi')),
  CONSTRAINT sinav_hucre_karari_dayanak CHECK (dayanak = 'dogrudan'),
  CONSTRAINT sinav_hucre_karari_takma_ad CHECK (ogrenci_takma_ad IS NULL OR ogrenci_takma_ad ~ '^[0-9a-f]{32}$')
);
--> statement-breakpoint
CREATE INDEX sinav_hucresi_tarama ON sinav_hucresi (tarama_id, durum);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sinav_hucre_karari_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  h sinav_hucresi;
BEGIN
  SELECT * INTO h FROM sinav_hucresi WHERE id = NEW.hucre_id;
  IF NOT FOUND OR h.kurum_id <> NEW.kurum_id THEN
    RAISE EXCEPTION 'Karar, aynı kuruma ait bir hücreye bağlanmalı.' USING ERRCODE = 'check_violation';
  END IF;
  IF h.durum <> 'onay_bekliyor' THEN
    RAISE EXCEPTION 'Bu hücre onay beklemiyor.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER sinav_hucre_karari_hucre BEFORE INSERT ON sinav_hucre_karari
  FOR EACH ROW EXECUTE FUNCTION sinav_hucre_karari_denetle();
--> statement-breakpoint
CREATE TRIGGER sinav_hucre_karari_kisi_kurumu BEFORE INSERT ON sinav_hucre_karari
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('karar_veren_kisi_id');
--> statement-breakpoint
GRANT SELECT, INSERT ON sinav_sablonu, sinav_taramasi, sinav_hucresi, sinav_hucre_karari TO akredit_uygulama;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sinav_sablonu', 'sinav_taramasi', 'sinav_hucresi', 'sinav_hucre_karari']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY kiraci_yalitimi ON %I USING (kurum_id = etkin_kurum()) WITH CHECK (kurum_id = etkin_kurum())', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION yalniz_ekleme()',
                   t || '_degismez', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION yalniz_ekleme()',
                   t || '_bosaltilamaz', t);
  END LOOP;
END
$$;
