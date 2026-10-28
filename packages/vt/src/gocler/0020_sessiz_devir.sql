-- Sessiz devir ve süreli varsayılan onay (İP-38). Elle yazılmıştır. Bu İP 0020-0029 aralığını kullanır.
--
-- 1) Yeni öneri türü `bologna_devri`: geçen dönemin onaylı ders paketinden yeni dönem taslağı. Riski düşüktür
--    (@akredit/cekirdek ONERI_RISKI ile aynı); öneri ayrıca kendi riskini taşır (akademik değişiklik varsa orta).
-- 2) Yeni karar dayanağı `sure_dolumu`: hoca süre içinde itiraz etmediği için, kurumun imzalı yetki devri
--    politikasına dayanarak verilen varsayılan onay. Koşullar (tetikleyici, son savunma hattı):
--      - yalnız `bologna_devri` türünde, yalnız `onaylandi` sonucuyla, yalnız etkin risk `dusuk` iken;
--      - politika kimliği zorunlu; politika aynı kurumun, iptal edilmemiş, karar anında yürürlükte, türü kapsar;
--      - karar veren politikayı imzalayan kişidir (kim adına);
--      - karar zamanı öneri içeriğindeki `sureSonu`ndan önce olamaz.
--    `bologna_devri` politikayla hemen (dayanak `politika`) karara bağlanamaz: varsayılan onay yalnız süre dolumuyla.
-- 3) Politikaya itiraz süresi (iş günü) sütunu: boşsa 5 iş günü.
--
-- Yeni enum değeri aynı işlemde kullanılamadığı için karşılaştırmalar `::text` ile yazıldı (0011 ile aynı yol).

ALTER TYPE oneri_turu ADD VALUE IF NOT EXISTS 'bologna_devri';
--> statement-breakpoint
ALTER TYPE karar_dayanagi ADD VALUE IF NOT EXISTS 'sure_dolumu';
--> statement-breakpoint
ALTER TABLE yetki_politikasi ADD COLUMN itiraz_suresi_is_gunu smallint;
--> statement-breakpoint
ALTER TABLE yetki_politikasi ADD CONSTRAINT politika_itiraz_suresi
  CHECK (itiraz_suresi_is_gunu IS NULL OR (itiraz_suresi_is_gunu >= 1 AND itiraz_suresi_is_gunu <= 30));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION oneri_turu_riski(t oneri_turu) RETURNS risk_duzeyi
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT CASE t::text
    WHEN 'kanit_etiketi' THEN 'dusuk' WHEN 'toplanti_tutanagi' THEN 'dusuk' WHEN 'anket_ozeti' THEN 'dusuk'
    WHEN 'bologna_devri' THEN 'dusuk'
    WHEN 'olgunluk_duzeyi' THEN 'yuksek' WHEN 'yazma_plani' THEN 'yuksek' WHEN 'dis_gonderim' THEN 'yuksek'
    ELSE 'orta' END::risk_duzeyi $$;
--> statement-breakpoint
ALTER TABLE karar DROP CONSTRAINT karar_politika_dayanagi;
--> statement-breakpoint
ALTER TABLE karar ADD CONSTRAINT karar_politika_dayanagi CHECK (
  (dayanak::text IN ('politika', 'sure_dolumu') AND politika_id IS NOT NULL)
  OR (dayanak::text = 'dogrudan' AND politika_id IS NULL)
);
--> statement-breakpoint
-- Karar tetikleyicisi: gövde 0006 ile aynı; `sure_dolumu` dayanağı politika denetimlerinden geçer ve ek koşullar
-- uygulanır; `bologna_devri` politika dayanağıyla (hemen) karara bağlanamaz.
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
