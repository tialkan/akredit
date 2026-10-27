-- İP-17 göçü, elle yazılmıştır. Anket katılım belirteci ve anonim yanıt güvenceleri.
-- 1) `anket_belirteci`: tekrar yanıt engeli. Yalnız belirtecin SHA-256 özeti ve "kullanıldı" bayrağı tutulur;
--    kişi, e-posta, zaman ya da yanıt kimliği sütunu yoktur. Bayrak yalnız false → true değişir.
-- 2) `anket_yaniti`: zaman damgası güne yuvarlanır (gönderim kayıtlarıyla saat eşleştirmesi yapılamasın),
--    kişiyi tanıtabilecek alan adları reddedilir, satır değiştirilemez ve silinemez.

CREATE TABLE anket_belirteci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  anket_id uuid NOT NULL REFERENCES anket(id),
  ozet text NOT NULL,
  kaynak text NOT NULL,
  kullanildi boolean NOT NULL DEFAULT false,
  CONSTRAINT anket_belirteci_tekil UNIQUE (anket_id, ozet),
  CONSTRAINT anket_belirteci_ozet_bicimi CHECK (ozet ~ '^[0-9a-f]{64}$'),
  CONSTRAINT anket_belirteci_kaynak CHECK (kaynak IN ('davet', 'baglanti'))
);
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON anket_belirteci TO akredit_uygulama;
--> statement-breakpoint
ALTER TABLE anket_belirteci ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE anket_belirteci FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY kiraci_yalitimi ON anket_belirteci USING (kurum_id = etkin_kurum()) WITH CHECK (kurum_id = etkin_kurum());
--> statement-breakpoint
CREATE OR REPLACE FUNCTION anket_belirteci_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.ozet IS DISTINCT FROM OLD.ozet OR NEW.anket_id IS DISTINCT FROM OLD.anket_id
     OR NEW.kurum_id IS DISTINCT FROM OLD.kurum_id OR NEW.kaynak IS DISTINCT FROM OLD.kaynak
     OR (OLD.kullanildi AND NOT NEW.kullanildi) THEN
    RAISE EXCEPTION 'Anket belirteci yalnız kullanıldı olarak işaretlenebilir.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER anket_belirteci_degismez BEFORE UPDATE ON anket_belirteci
  FOR EACH ROW EXECUTE FUNCTION anket_belirteci_denetle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION anket_yaniti_anonimlestir() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.olusturma := date_trunc('day', NEW.olusturma AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  IF jsonb_typeof(NEW.yanitlar) <> 'object' THEN
    RAISE EXCEPTION 'Anket yanıtı nesne olmalı.' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(NEW.yanitlar) k
    WHERE lower(k) ~ '^(kisi|kisi_id|eposta|e_posta|email|ad|ad_soyad|ogrenci_no|tckn|ip|ipaddr|belirtec|token)$'
  ) THEN
    RAISE EXCEPTION 'Anket yanıtında kişisel bilgi alanı olamaz.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER anket_yaniti_anonim BEFORE INSERT ON anket_yaniti
  FOR EACH ROW EXECUTE FUNCTION anket_yaniti_anonimlestir();
--> statement-breakpoint
REVOKE UPDATE, DELETE ON anket_yaniti FROM akredit_uygulama;
