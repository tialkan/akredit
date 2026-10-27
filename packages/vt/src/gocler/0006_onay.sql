-- İP-13 göçü, elle yazılmıştır.
-- 1) Yetki politikasının birim/program kapsamı veritabanında da uygulanır (inceleme dalga 1, bulgu 2).
--    Önerinin yeri `oneri_konumu()` ile hedefinden hesaplanır (servis `hedefVeKonum` ile aynı kural):
--    ders → program → birim zinciri; program → birim zinciri; birim → üst birimler; kanıt → en özgül kapsamı;
--    çıktı → sahibi. Yeri bilinmeyen öneri (kurum geneli) kapsamlı bir politikayla karara bağlanamaz.
-- 2) İmzalı e-posta onay bağlantıları: bağlantı kaydı ve tek kullanım kaydı. İkisi de yalnız eklenir;
--    ikinci kullanım birincil anahtar çakışmasıyla reddedilir. Yüksek riskli öneriye bağlantı üretilemez.

CREATE OR REPLACE FUNCTION birim_ustleri(b uuid) RETURNS uuid[]
  LANGUAGE sql STABLE
  AS $$
  WITH RECURSIVE z(id, ust, derinlik) AS (
    SELECT id, ust_birim_id, 1 FROM birim WHERE id = b
    UNION ALL
    SELECT bi.id, bi.ust_birim_id, z.derinlik + 1 FROM birim bi JOIN z ON bi.id = z.ust WHERE z.derinlik < 10
  )
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) FROM z $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION birim_ustleri(uuid) TO akredit_uygulama;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION oneri_konumu(o oneri, OUT birimler uuid[], OUT program uuid)
  LANGUAGE plpgsql STABLE
  AS $$
DECLARE
  t text := o.hedef_turu;
  hid text := o.hedef_id;
  h uuid;
  k jsonb;
BEGIN
  birimler := ARRAY[]::uuid[];
  program := NULL;
  IF hid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN;
  END IF;
  h := hid::uuid;
  IF t = 'kanit' THEN
    SELECT kapsamlar INTO k FROM kanit WHERE id = h;
    t := NULL;
    -- En özgül kapsam: ders > program > birim.
    SELECT x ->> 'tur', x ->> 'id' INTO t, hid
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(k) = 'array' THEN k ELSE '[]'::jsonb END) x
      WHERE x ->> 'tur' IN ('ders', 'program', 'birim')
        AND (x ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      ORDER BY CASE x ->> 'tur' WHEN 'ders' THEN 1 WHEN 'program' THEN 2 ELSE 3 END
      LIMIT 1;
    IF t IS NULL THEN RETURN; END IF;
    h := hid::uuid;
  ELSIF t = 'cikti' THEN
    t := NULL;
    SELECT c.tur::text, c.sahip_id INTO t, h FROM cikti c WHERE c.id = h;
    IF t IS NULL OR t NOT IN ('ders', 'program') THEN RETURN; END IF;
  END IF;
  IF t = 'ders' THEN
    SELECT d.program_id INTO program FROM ders d WHERE d.id = h;
    IF program IS NULL THEN RETURN; END IF;
    SELECT birim_ustleri(p.birim_id) INTO birimler FROM program p WHERE p.id = program;
  ELSIF t = 'program' THEN
    SELECT p.id, birim_ustleri(p.birim_id) INTO program, birimler FROM program p WHERE p.id = h;
  ELSIF t = 'birim' THEN
    birimler := birim_ustleri(h);
  END IF;
  birimler := coalesce(birimler, ARRAY[]::uuid[]);
END
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION oneri_konumu(oneri) TO akredit_uygulama;
--> statement-breakpoint
-- Karar tetikleyicisi: gövde 0003 ile aynı; politika kararına birim/program kapsamı denetimi eklendi ve
-- iptal kaydının kendisi dayanak gösterilemez.
CREATE OR REPLACE FUNCTION karar_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  o oneri;
  p yetki_politikasi;
  r risk_duzeyi;
  yer_birimler uuid[];
  yer_program uuid;
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
--> statement-breakpoint
CREATE TABLE onay_baglantisi (
  id uuid PRIMARY KEY,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  oneri_id uuid NOT NULL REFERENCES oneri(id),
  kisi_id uuid NOT NULL REFERENCES kisi(id),
  sonuc karar_sonucu NOT NULL,
  son timestamptz NOT NULL,
  olusturma timestamptz NOT NULL,
  CONSTRAINT onay_baglantisi_sonuc CHECK (sonuc IN ('onaylandi', 'reddedildi')),
  CONSTRAINT onay_baglantisi_sure CHECK (son > olusturma AND son <= olusturma + interval '14 days')
);
--> statement-breakpoint
CREATE TABLE onay_baglantisi_kullanimi (
  id uuid PRIMARY KEY REFERENCES onay_baglantisi(id),
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  karar_id uuid NOT NULL REFERENCES karar(id),
  zaman timestamptz NOT NULL
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION onay_baglantisi_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  o oneri;
BEGIN
  -- Satır etkin kurumun değilse satır güvenliği zaten reddeder; hata kodu onunki kalsın.
  IF NEW.kurum_id IS DISTINCT FROM etkin_kurum() THEN
    RETURN NEW;
  END IF;
  SELECT * INTO o FROM oneri WHERE id = NEW.oneri_id;
  IF NOT FOUND OR o.kurum_id <> NEW.kurum_id THEN
    RAISE EXCEPTION 'Bağlantı, aynı kuruma ait bir öneriye bağlanmalı.' USING ERRCODE = 'check_violation';
  END IF;
  IF greatest(o.risk, oneri_turu_riski(o.tur)) = 'yuksek' THEN
    RAISE EXCEPTION 'Yüksek riskli öneri e-postayla karara bağlanamaz.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER onay_baglantisi_riski BEFORE INSERT ON onay_baglantisi
  FOR EACH ROW EXECUTE FUNCTION onay_baglantisi_denetle();
--> statement-breakpoint
CREATE TRIGGER onay_baglantisi_kisi_kurumu BEFORE INSERT ON onay_baglantisi
  FOR EACH ROW EXECUTE FUNCTION kisi_kurumu_denetle('kisi_id');
--> statement-breakpoint
GRANT SELECT, INSERT ON onay_baglantisi, onay_baglantisi_kullanimi TO akredit_uygulama;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['onay_baglantisi', 'onay_baglantisi_kullanimi']
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
