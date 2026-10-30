-- İP-45 göçü, elle yazılmıştır. İdari birimlerden hesapsız belge isteme.
--
-- belge_istegi: komisyonun bir birime gönderdiği istek. Bağlantı belirteci açık hâlde saklanmaz, yalnız
--   SHA-256 özeti. Alıcı e-postası yoksa istek yine kaydedilir; gönderilmediği gönderim kaydından okunur.
-- belge_istegi_gonderimi: her e-posta denemesi (ilk ya da hatırlatma), gönderildi ya da gönderilmedi.
-- belge_istegi_yuklemesi: tek kullanım kaydı. Birincil anahtar (id) istek kimliğidir; ikinci yükleme (eşzamanlı olanı
--   da) birincil anahtar çakışmasıyla reddedilir. Yüklenen dosya kanıt olur ama "doğrulanmamış" kalır: kabul,
--   kanıt etiketi önerisine verilen insan kararıdır.
-- Üç tablo da yalnız eklenir ve kurum yalıtımlıdır.
-- kanit_olcut_baglantisi: dış birimden gelen doğrulanmamış kanıt (kaynak_ayrinti.dogrulama), onaylı kabul kararı olmadan ölçüte bağlanamaz.

CREATE TABLE belge_istegi (
  id uuid PRIMARY KEY NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  gereksinim_id uuid REFERENCES kanit_gereksinimi(id),
  istenen text NOT NULL,
  alici_eposta text,
  birim_adi text,
  isteyen_kisi_id uuid NOT NULL REFERENCES kisi(id),
  belirtec_ozet text NOT NULL UNIQUE,
  son timestamptz NOT NULL,
  olusturma timestamptz NOT NULL,
  CONSTRAINT belge_istegi_ozet_bicimi CHECK (belirtec_ozet ~ '^[0-9a-f]{64}$'),
  CONSTRAINT belge_istegi_eposta_kucuk CHECK (alici_eposta IS NULL OR alici_eposta = lower(alici_eposta)),
  CONSTRAINT belge_istegi_uzunluk CHECK (
    char_length(istenen) BETWEEN 3 AND 2000 AND char_length(coalesce(birim_adi, '')) <= 200
  ),
  CONSTRAINT belge_istegi_sure CHECK (son > olusturma AND son <= olusturma + interval '30 days')
);
--> statement-breakpoint
CREATE INDEX belge_istegi_kurum_zaman ON belge_istegi (kurum_id, olusturma);
--> statement-breakpoint
CREATE TABLE belge_istegi_gonderimi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  istek_id uuid NOT NULL REFERENCES belge_istegi(id),
  tur text NOT NULL,
  durum text NOT NULL,
  neden text,
  zaman timestamptz NOT NULL,
  CONSTRAINT belge_istegi_gonderimi_tur CHECK (tur IN ('ilk', 'hatirlatma')),
  CONSTRAINT belge_istegi_gonderimi_durum CHECK (durum IN ('gonderildi', 'gonderilmedi'))
);
--> statement-breakpoint
CREATE INDEX belge_istegi_gonderimi_istek ON belge_istegi_gonderimi (istek_id);
--> statement-breakpoint
CREATE TABLE belge_istegi_yuklemesi (
  id uuid PRIMARY KEY REFERENCES belge_istegi(id),
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  kanit_id uuid NOT NULL REFERENCES kanit(id),
  oneri_id uuid NOT NULL REFERENCES oneri(id),
  aciklama text,
  ag_izi text,
  zaman timestamptz NOT NULL,
  CONSTRAINT belge_istegi_yuklemesi_uzunluk CHECK (char_length(coalesce(aciklama, '')) <= 1000)
);
--> statement-breakpoint
CREATE INDEX belge_istegi_yuklemesi_ag ON belge_istegi_yuklemesi (kurum_id, ag_izi, zaman);
--> statement-breakpoint
CREATE TRIGGER belge_istegi_isteyen_kurumu BEFORE INSERT ON belge_istegi
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('isteyen_kisi_id');
--> statement-breakpoint
GRANT SELECT, INSERT ON belge_istegi, belge_istegi_gonderimi, belge_istegi_yuklemesi TO akredit_uygulama;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['belge_istegi', 'belge_istegi_gonderimi', 'belge_istegi_yuklemesi']
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
--> statement-breakpoint
-- Doğrulanmamış dış birim kanıtı, onaylı kabul kararı olmadan ölçüte bağlanamaz (rapora atıf bu bağdan geçer).
CREATE OR REPLACE FUNCTION dis_birim_kaniti_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM kanit k WHERE k.id = NEW.kanit_id AND k.kaynak_ayrinti ->> 'dogrulama' = 'dogrulanmamis'
  ) AND NOT EXISTS (
    SELECT 1 FROM belge_istegi_yuklemesi y
      JOIN karar k ON k.oneri_id = y.oneri_id
      WHERE y.kanit_id = NEW.kanit_id AND k.sonuc = 'onaylandi'
  ) THEN
    RAISE EXCEPTION 'Dış birimden gelen belge kabul edilmeden kanıt olarak bağlanamaz.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER kanit_olcut_dis_birim BEFORE INSERT ON kanit_olcut_baglantisi
  FOR EACH ROW EXECUTE FUNCTION dis_birim_kaniti_denetle();
