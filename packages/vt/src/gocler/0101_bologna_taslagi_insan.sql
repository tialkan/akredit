-- Dalga 3 inceleme bulgusu #7 (elle yazılmıştır). Bu göç 0100-0109 aralığındadır.
--
-- Modelin yazdığı Bologna taslağı (`bologna_taslagi`, üretici `yz`) değerlendirme yüzdeleri ve iş yükü saatleri
-- taşır. Bu sayılar modelden gelir (ilke 2); yetki devri politikasıyla ya da süre dolumuyla onaylanamaz, kararı
-- öğretim elemanı doğrudan verir. Politika motoru bu öneriyi zaten atlar; tetikleyici son savunma hattıdır.
-- Kişinin kendi yazdığı taslak (Word paketi, üretici `kisi`) bu kuraldan etkilenmez.

CREATE OR REPLACE FUNCTION karar_yz_bologna_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.dayanak::text <> 'dogrudan' AND EXISTS (
    SELECT 1 FROM oneri o
    WHERE o.id = NEW.oneri_id AND o.tur::text = 'bologna_taslagi' AND o.uretici_turu::text = 'yz'
  ) THEN
    RAISE EXCEPTION 'Modelin yazdığı Bologna taslağı yetki devriyle onaylanamaz; kararı öğretim elemanı vermeli.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER karar_yz_bologna BEFORE INSERT ON karar FOR EACH ROW EXECUTE FUNCTION karar_yz_bologna_denetle();
