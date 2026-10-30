-- Sınav taramasının bağlantısı (İP-43 açık kalanları, inceleme dalga 8 bulgu 3 ve 4). Elle yazılmıştır.
-- Bu iş 0120-0129 aralığını kullanır.
--
-- 1. `sinav_tarama_istegi`: panelden yüklenen tarama dosyası. Web sunucusu dosyayı depoya koyar ve bu satırı
--    yazar; işçi dosyayı `kanitAl` ile (amaç: sinav_taramasi) kanıt olarak alır ve taramayı çalıştırır.
-- 2. `sinav_tarama_istegi_sonucu`: isteğin sonucu (tamam ya da hata), istek başına bir kez.
-- 3. `sinav_ozet_onayi`: otomatik okunan hücrelerin aktarımdan önce kişiye tek ekranda gösterilen özetinin onayı
--    (Katman 1, yalnız doğrudan). Aktarım bu satırla birlikte yazılır; satır varsa taramaya yeni karar girmez.
-- 4. Hücre kararı: otomatik okunan hücre artık düzeltilebilir (yalnız `duzeltildi`); onaylanmış özetten sonra
--    hiçbir hücreye karar girmez.
--
-- Üç tablo da kiracı tablosu, yalnız eklenir.

CREATE TABLE sinav_tarama_istegi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  olcme_araci_id uuid NOT NULL REFERENCES olcme_araci(id),
  depo_anahtari text NOT NULL,
  ozet text NOT NULL,
  dosya_adi text NOT NULL,
  mime text NOT NULL,
  boyut integer NOT NULL,
  esik real,
  isteyen_kisi_id uuid NOT NULL REFERENCES kisi(id),
  olusturma timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT sinav_tarama_istegi_ozet CHECK (ozet ~ '^[0-9a-f]{64}$'),
  CONSTRAINT sinav_tarama_istegi_boyut CHECK (boyut > 0),
  CONSTRAINT sinav_tarama_istegi_esik CHECK (esik IS NULL OR (esik >= 0.5 AND esik <= 1))
);
--> statement-breakpoint
CREATE TABLE sinav_tarama_istegi_sonucu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  istek_id uuid NOT NULL REFERENCES sinav_tarama_istegi(id),
  durum text NOT NULL,
  kanit_id uuid REFERENCES kanit(id),
  tarama_id uuid REFERENCES sinav_taramasi(id),
  ileti text,
  olusturma timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT sinav_tarama_istegi_sonucu_tekil UNIQUE (istek_id),
  CONSTRAINT sinav_tarama_istegi_sonucu_durum CHECK (
    (durum = 'tamam' AND tarama_id IS NOT NULL) OR (durum = 'hata' AND ileti IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE sinav_ozet_onayi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  tarama_id uuid NOT NULL REFERENCES sinav_taramasi(id),
  otomatik_sayisi integer NOT NULL,
  ozet text NOT NULL,
  katman smallint DEFAULT 1 NOT NULL,
  kural text NOT NULL,
  dayanak text DEFAULT 'dogrudan' NOT NULL,
  onaylayan_kisi_id uuid NOT NULL REFERENCES kisi(id),
  zaman timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT sinav_ozet_onayi_tekil UNIQUE (tarama_id),
  CONSTRAINT sinav_ozet_onayi_katman CHECK (katman = 1),
  CONSTRAINT sinav_ozet_onayi_dayanak CHECK (dayanak = 'dogrudan'),
  CONSTRAINT sinav_ozet_onayi_sayi CHECK (otomatik_sayisi >= 0),
  CONSTRAINT sinav_ozet_onayi_ozet CHECK (ozet ~ '^[0-9a-f]{64}$')
);
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
  IF h.durum <> 'onay_bekliyor' AND NEW.sonuc <> 'duzeltildi' THEN
    RAISE EXCEPTION 'Otomatik okunan hücre yalnız düzeltilebilir.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM sinav_ozet_onayi o WHERE o.tarama_id = h.tarama_id) THEN
    RAISE EXCEPTION 'Puanlar aktarıldı; bu taramaya yeni karar girilemez.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER sinav_tarama_istegi_kisi_kurumu BEFORE INSERT ON sinav_tarama_istegi
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('isteyen_kisi_id');
--> statement-breakpoint
CREATE TRIGGER sinav_ozet_onayi_kisi_kurumu BEFORE INSERT ON sinav_ozet_onayi
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('onaylayan_kisi_id');
--> statement-breakpoint
CREATE INDEX sinav_tarama_istegi_arac ON sinav_tarama_istegi (olcme_araci_id, olusturma);
--> statement-breakpoint
GRANT SELECT, INSERT ON sinav_tarama_istegi, sinav_tarama_istegi_sonucu, sinav_ozet_onayi TO akredit_uygulama;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sinav_tarama_istegi', 'sinav_tarama_istegi_sonucu', 'sinav_ozet_onayi']
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
