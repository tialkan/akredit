-- İnceleme (dalga 1) göçü, elle yazılmıştır: öneri türünün riski veritabanında da uygulanır.
-- Önceden `oneri.risk` türün riskinden düşük yazılabildiği için türü yüksek riskli bir öneri (ör. dis_gonderim)
-- yetki politikasıyla karara bağlanabiliyordu. Tür riskleri @akredit/cekirdek ONERI_RISKI ile aynıdır.

CREATE OR REPLACE FUNCTION oneri_turu_riski(t oneri_turu) RETURNS risk_duzeyi
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT CASE t
    WHEN 'kanit_etiketi' THEN 'dusuk' WHEN 'toplanti_tutanagi' THEN 'dusuk' WHEN 'anket_ozeti' THEN 'dusuk'
    WHEN 'olgunluk_duzeyi' THEN 'yuksek' WHEN 'yazma_plani' THEN 'yuksek' WHEN 'dis_gonderim' THEN 'yuksek'
    ELSE 'orta' END::risk_duzeyi $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION oneri_turu_riski(oneri_turu) TO akredit_uygulama;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION oneri_riski_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.risk < oneri_turu_riski(NEW.tur) THEN
    RAISE EXCEPTION 'Önerinin riski türünün riskinden düşük olamaz.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER oneri_riski BEFORE INSERT ON oneri FOR EACH ROW EXECUTE FUNCTION oneri_riski_denetle();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION politika_turleri_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW.oneri_turleri) t WHERE oneri_turu_riski(t) = 'yuksek') THEN
    RAISE EXCEPTION 'Yetki politikası yüksek riskli öneri türünü kapsayamaz.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER politika_turleri BEFORE INSERT ON yetki_politikasi FOR EACH ROW EXECUTE FUNCTION politika_turleri_denetle();
--> statement-breakpoint
-- Karar tetikleyicisi: etkin risk = greatest(öneri riski, tür riski). Gövde 0002 ile aynı, yalnız risk denetimi değişti.
CREATE OR REPLACE FUNCTION karar_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  o oneri;
  p yetki_politikasi;
  r risk_duzeyi;
BEGIN
  SELECT * INTO o FROM oneri WHERE id = NEW.oneri_id;
  IF NOT FOUND OR o.kurum_id <> NEW.kurum_id THEN
    RAISE EXCEPTION 'Karar, aynı kuruma ait bir öneriye bağlanmalı.' USING ERRCODE = 'check_violation';
  END IF;
  r := greatest(o.risk, oneri_turu_riski(o.tur));
  IF NEW.dayanak = 'politika' THEN
    IF NEW.politika_id IS NULL THEN
      RAISE EXCEPTION 'Politika dayanaklı kararda politika kimliği zorunlu.' USING ERRCODE = 'check_violation';
    END IF;
    IF r = 'yuksek' THEN
      RAISE EXCEPTION 'Yüksek riskli öneri yetki devriyle karara bağlanamaz; kararı yetkili kişi vermeli.'
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO p FROM yetki_politikasi WHERE id = NEW.politika_id;
    IF NOT FOUND OR p.kurum_id <> NEW.kurum_id THEN
      RAISE EXCEPTION 'Karara dayanak olan yetki politikası bulunamadı.' USING ERRCODE = 'check_violation';
    END IF;
    IF r > p.en_yuksek_risk OR NOT (o.tur = ANY (p.oneri_turleri))
       OR o.guven IS NULL OR o.guven < p.en_dusuk_guven THEN
      RAISE EXCEPTION 'Öneri, yetki politikasının kapsamında değil.' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.zaman < p.baslangic OR (p.bitis IS NOT NULL AND NEW.zaman >= p.bitis) THEN
      RAISE EXCEPTION 'Yetki politikası bu tarihte geçerli değil.' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM yetki_politikasi i WHERE i.iptal_ettigi_id = p.id AND i.baslangic <= NEW.zaman) THEN
      RAISE EXCEPTION 'Yetki politikası iptal edilmiş.' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.karar_veren_kisi_id <> p.imzalayan_kisi_id THEN
      RAISE EXCEPTION 'Politika kararında karar veren, politikayı imzalayan kişi olmalı.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
