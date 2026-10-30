-- İnceleme 4-7 düşük bulgu #4 (elle yazılmıştır). Bu göç 0100-0109 aralığındadır.
--
-- Süre dolumuyla varsayılan onay ancak fark özeti en az bir kişiye bildirildiyse verilebilir: kimse
-- bildirilmediyse itiraz edecek kimse yoktur ve "itirazsız onay" insan kararını atlar (ilke 3). Servis bu
-- koşulu zaten uygular; tetikleyici son savunma hattıdır. Gövde 0020 ile aynıdır, yalnız `bildirilen`
-- denetimi eklenmiştir.

CREATE OR REPLACE FUNCTION karar_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  o oneri;
  p yetki_politikasi;
  r risk_duzeyi;
  yer_birimler uuid[];
  yer_program uuid;
  son timestamptz;
BEGIN
  SELECT * INTO o FROM oneri WHERE id = NEW.oneri_id;
  IF NOT FOUND OR o.kurum_id <> NEW.kurum_id THEN
    RAISE EXCEPTION 'Karar, aynı kuruma ait bir öneriye bağlanmalı.' USING ERRCODE = 'check_violation';
  END IF;
  r := greatest(o.risk, oneri_turu_riski(o.tur));
  IF NEW.dayanak::text = 'politika' AND o.tur::text = 'bologna_devri' THEN
    RAISE EXCEPTION 'Dönem devri taslağı yalnız süre dolumuyla varsayılan onay alabilir.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.dayanak::text = 'sure_dolumu' THEN
    IF o.tur::text <> 'bologna_devri' THEN
      RAISE EXCEPTION 'Süre dolumuyla onay yalnız dönem devri taslağında kullanılır.' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.sonuc <> 'onaylandi' THEN
      RAISE EXCEPTION 'Süre dolumuyla yalnız onay verilir.' USING ERRCODE = 'check_violation';
    END IF;
    IF r <> 'dusuk' THEN
      RAISE EXCEPTION 'Yalnız düşük riskli taslak süre dolumuyla onaylanır; kararı öğretim elemanı vermeli.'
        USING ERRCODE = 'check_violation';
    END IF;
    BEGIN
      son := (o.icerik ->> 'sureSonu')::timestamptz;
    EXCEPTION WHEN others THEN
      son := NULL;
    END;
    IF son IS NULL OR NEW.zaman < son THEN
      RAISE EXCEPTION 'İtiraz süresi dolmadan varsayılan onay verilemez.' USING ERRCODE = 'check_violation';
    END IF;
    IF jsonb_typeof(o.icerik -> 'bildirilen') IS DISTINCT FROM 'array'
       OR jsonb_array_length(o.icerik -> 'bildirilen') = 0 THEN
      RAISE EXCEPTION 'Fark özeti kimseye bildirilmediği için varsayılan onay verilemez; kararı öğretim elemanı vermeli.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.dayanak::text IN ('politika', 'sure_dolumu') THEN
    IF NEW.politika_id IS NULL THEN
      RAISE EXCEPTION 'Politika dayanaklı kararda politika kimliği zorunlu.' USING ERRCODE = 'check_violation';
    END IF;
    IF r = 'yuksek' THEN
      RAISE EXCEPTION 'Yüksek riskli öneri yetki devriyle karara bağlanamaz; kararı yetkili kişi vermeli.'
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO p FROM yetki_politikasi WHERE id = NEW.politika_id;
    IF NOT FOUND OR p.kurum_id <> NEW.kurum_id OR p.iptal_ettigi_id IS NOT NULL THEN
      RAISE EXCEPTION 'Karara dayanak olan yetki politikası bulunamadı.' USING ERRCODE = 'check_violation';
    END IF;
    IF r > p.en_yuksek_risk OR NOT (o.tur = ANY (p.oneri_turleri))
       OR o.guven IS NULL OR o.guven < p.en_dusuk_guven THEN
      RAISE EXCEPTION 'Öneri, yetki politikasının kapsamında değil.' USING ERRCODE = 'check_violation';
    END IF;
    IF coalesce(cardinality(p.birim_idleri), 0) > 0 OR coalesce(cardinality(p.program_idleri), 0) > 0 THEN
      SELECT ok.birimler, ok.program INTO yer_birimler, yer_program FROM oneri_konumu(o) ok;
      IF coalesce(cardinality(p.birim_idleri), 0) > 0 AND NOT (coalesce(yer_birimler, ARRAY[]::uuid[]) && p.birim_idleri) THEN
        RAISE EXCEPTION 'Öneri, yetki politikasının birim kapsamında değil.' USING ERRCODE = 'check_violation';
      END IF;
      IF coalesce(cardinality(p.program_idleri), 0) > 0
         AND (yer_program IS NULL OR NOT (yer_program = ANY (p.program_idleri))) THEN
        RAISE EXCEPTION 'Öneri, yetki politikasının program kapsamında değil.' USING ERRCODE = 'check_violation';
      END IF;
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
