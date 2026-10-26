-- İP-12 göçü, elle yazılmıştır.
-- 1) Kişi kimlikleri kiracı sınırını aşamaz (inceleme dalga 1, bulgu 1): yabancı anahtar denetimi satır
--    güvenliğini atladığı için başka kurumun kişisi karar veren, politika imzalayan, rol sahibi vb. olarak
--    yazılabiliyordu. Tetikleyici, verilen sütundaki kişinin aynı kuruma ait olduğunu denetler.
-- 2) API idempotens kayıtları (`istek_tekrari`): kimlik tabloları gibi kiracı tablosu değildir, yalnız
--    servis katmanı sahip bağlantısıyla erişir.

CREATE OR REPLACE FUNCTION kisi_kurumu_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  sutun text := TG_ARGV[0];
  v uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I::uuid', sutun) USING NEW INTO v;
  -- Satır etkin kurumun değilse satır güvenliği zaten reddeder; hata kodu onunki kalsın.
  IF v IS NULL OR NEW.kurum_id IS DISTINCT FROM etkin_kurum() THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM kisi k WHERE k.id = v AND k.kurum_id = NEW.kurum_id) THEN
    RAISE EXCEPTION 'Kişi bu kuruma ait değil (%).', sutun USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER karar_veren_kurumu BEFORE INSERT ON karar
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('karar_veren_kisi_id');
--> statement-breakpoint
CREATE TRIGGER politika_imzalayan_kurumu BEFORE INSERT ON yetki_politikasi
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('imzalayan_kisi_id');
--> statement-breakpoint
CREATE TRIGGER rol_atamasi_kisi_kurumu BEFORE INSERT OR UPDATE ON rol_atamasi
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('kisi_id');
--> statement-breakpoint
CREATE TRIGGER kanit_yukleyen_kurumu BEFORE INSERT ON kanit
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('yukleyen_kisi_id');
--> statement-breakpoint
CREATE TRIGGER gorev_atanan_kurumu BEFORE INSERT OR UPDATE ON gorev
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('atanan_kisi_id');
--> statement-breakpoint
CREATE TRIGGER bildirim_kisi_kurumu BEFORE INSERT OR UPDATE ON bildirim
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('kisi_id');
--> statement-breakpoint
CREATE TRIGGER eylem_sorumlu_kurumu BEFORE INSERT OR UPDATE ON eylem
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('sorumlu_kisi_id');
--> statement-breakpoint
CREATE TABLE istek_tekrari (
  bagli_kurum_id uuid NOT NULL REFERENCES kurum(id),
  kisi_id uuid NOT NULL,
  anahtar text NOT NULL,
  istek_ozeti text NOT NULL,
  durum smallint,
  yanit jsonb,
  olusturma timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bagli_kurum_id, kisi_id, anahtar),
  CONSTRAINT istek_tekrari_anahtar_bicimi CHECK (length(anahtar) BETWEEN 8 AND 200)
);
--> statement-breakpoint
REVOKE ALL ON istek_tekrari FROM akredit_uygulama;
--> statement-breakpoint
ALTER TABLE istek_tekrari ENABLE ROW LEVEL SECURITY;
