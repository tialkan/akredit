-- İnceleme dalga 8, bulgu 7: kabul kuralı tek anlamlı. Dış birim kanıtının kabul önerisine verilen
-- `onaylandi` ve `duzeltildi` kararları ikisi de kabuldür (servis: belge-istegi KABUL_SONUCLARI).
-- 0080'deki gövdenin aynısı; yalnız sonuç denetimi genişler.
CREATE OR REPLACE FUNCTION dis_birim_kaniti_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM kanit k WHERE k.id = NEW.kanit_id AND k.kaynak_ayrinti ->> 'dogrulama' = 'dogrulanmamis'
  ) AND NOT EXISTS (
    SELECT 1 FROM belge_istegi_yuklemesi y
      JOIN karar k ON k.oneri_id = y.oneri_id
      WHERE y.kanit_id = NEW.kanit_id AND k.sonuc IN ('onaylandi', 'duzeltildi')
  ) THEN
    RAISE EXCEPTION 'Dış birimden gelen belge kabul edilmeden kanıt olarak bağlanamaz.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
