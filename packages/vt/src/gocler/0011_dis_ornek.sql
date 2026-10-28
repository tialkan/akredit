-- Başka kurumdan örnek (İP-37). Elle yazılmıştır.
-- Web aramasıyla bulunan başka kurum sayfaları ayrı bir öneri türüdür: `dis_ornek`. Bu bir kanıt değildir ve
-- kanıt yerine geçemez. Kural uygulama kodunda da vardır; veritabanı son savunma hattıdır:
--   1) `dis_ornek` önerisi kanıta atıf taşıyamaz, hedefi kanıt olamaz, içeriği `kanitDegildir: true` taşır.
--   2) `dis_ornek` önerisine verilen karar kanıt-ölçüt bağlantısının dayanağı olamaz.
--   3) Kaynağı "dış örnek" olan kanıt kaydı eklenemez.
-- Türün riski `oneri_turu_riski` işlevinin ELSE kolundan 'orta'dır (@akredit/cekirdek ONERI_RISKI ile aynı).
-- Değerler metin olarak karşılaştırılır: yeni enum değeri aynı işlemde kullanılamadığı için işlev gövdeleri
-- `tur::text` ile yazıldı.

ALTER TYPE oneri_turu ADD VALUE IF NOT EXISTS 'dis_ornek';
--> statement-breakpoint
CREATE OR REPLACE FUNCTION dis_ornek_oneri_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.tur::text = 'dis_ornek' THEN
    IF NEW.hedef_turu = 'kanit' THEN
      RAISE EXCEPTION 'Başka kurumdan örnek bir kanıtı hedefleyemez.' USING ERRCODE = 'check_violation';
    END IF;
    IF jsonb_typeof(NEW.atiflar) <> 'array' OR jsonb_array_length(NEW.atiflar) > 0 THEN
      RAISE EXCEPTION 'Başka kurumdan örnek kanıta atıf taşıyamaz.' USING ERRCODE = 'check_violation';
    END IF;
    IF coalesce(NEW.icerik ->> 'kanitDegildir', '') <> 'true' THEN
      RAISE EXCEPTION 'Başka kurumdan örnek "kanıt değildir" işaretini taşımalı.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER oneri_dis_ornek BEFORE INSERT ON oneri FOR EACH ROW EXECUTE FUNCTION dis_ornek_oneri_denetle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION kanit_baglantisi_dis_ornek_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM karar k JOIN oneri o ON o.id = k.oneri_id
    WHERE k.id = NEW.karar_id AND o.tur::text = 'dis_ornek'
  ) THEN
    RAISE EXCEPTION 'Başka kurumdan örnek kanıt olarak ölçüte bağlanamaz.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER kanit_baglantisi_dis_ornek BEFORE INSERT ON kanit_olcut_baglantisi FOR EACH ROW EXECUTE FUNCTION kanit_baglantisi_dis_ornek_denetle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION kanit_dis_ornek_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF coalesce(NEW.kaynak_ayrinti ->> 'tur', '') = 'dis_ornek' OR coalesce(NEW.kaynak_ayrinti ->> 'kanitDegildir', '') = 'true' THEN
    RAISE EXCEPTION 'Başka kurumdan örnek kanıt olarak kaydedilemez.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER kanit_dis_ornek BEFORE INSERT ON kanit FOR EACH ROW EXECUTE FUNCTION kanit_dis_ornek_denetle();
