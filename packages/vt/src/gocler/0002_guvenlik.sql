-- Güvenlik göçü (elle yazılmıştır): yetkiler, kiracı yalıtımı (RLS), yalnız-ekleme tetikleyicileri,
-- karar/politika kuralları ve günlük özet zinciri. Ayrıntı: packages/vt/README.md.

-- ---------- Karar kimliğine yabancı anahtarlar (döngüsel içe aktarmayı önlemek için şemada değil burada) ----------
ALTER TABLE kanit_olcut_baglantisi
  ADD CONSTRAINT kanit_olcut_baglantisi_karar_fk FOREIGN KEY (karar_id) REFERENCES karar(id);
--> statement-breakpoint
ALTER TABLE katki ADD CONSTRAINT katki_karar_fk FOREIGN KEY (karar_id) REFERENCES karar(id);
--> statement-breakpoint

-- ---------- Yetkiler ----------
GRANT USAGE ON SCHEMA public TO akredit_uygulama;
--> statement-breakpoint
DO $$
DECLARE
  t record;
  yalniz_ekleme text[] := ARRAY['kanit','kanit_parcasi','oneri','karar','cikti','rapor_bolumu_surumu',
                                'gunluk','olcme_sonucu','yetki_politikasi'];
BEGIN
  FOR t IN
    SELECT c.relname,
           EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'kurum_id' AND NOT a.attisdropped) AS kiraci
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'akredit_goc'
  LOOP
    IF t.relname = ANY (yalniz_ekleme) THEN
      EXECUTE format('GRANT SELECT, INSERT ON %I TO akredit_uygulama', t.relname);
    ELSIF t.relname = 'kurum' THEN
      EXECUTE format('GRANT SELECT, UPDATE ON %I TO akredit_uygulama', t.relname);
    ELSIF t.kiraci THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO akredit_uygulama', t.relname);
    ELSE
      -- Kurumlar arası ortak tablolar (çerçeveler): uygulama yalnız okur.
      EXECUTE format('GRANT SELECT ON %I TO akredit_uygulama', t.relname);
    END IF;
  END LOOP;
END
$$;
--> statement-breakpoint

-- ---------- Kiracı yalıtımı ----------
-- Etkin kurum, işlem başına `SET LOCAL app.kurum_id` ile verilir. Ayarlanmamışsa (NULL ya da boş) hiçbir satır görünmez.
CREATE OR REPLACE FUNCTION etkin_kurum() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.kurum_id', true), '')::uuid $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION etkin_kurum() TO akredit_uygulama;
--> statement-breakpoint
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'kurum_id' AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.relname);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t.relname);
    EXECUTE format('DROP POLICY IF EXISTS kiraci_yalitimi ON %I', t.relname);
    EXECUTE format(
      'CREATE POLICY kiraci_yalitimi ON %I USING (kurum_id = etkin_kurum()) WITH CHECK (kurum_id = etkin_kurum())',
      t.relname);
  END LOOP;
END
$$;
--> statement-breakpoint
ALTER TABLE kurum ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE kurum FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY kiraci_yalitimi ON kurum USING (id = etkin_kurum()) WITH CHECK (id = etkin_kurum());
--> statement-breakpoint

-- ---------- Yalnız-ekleme tabloları ----------
CREATE OR REPLACE FUNCTION yalniz_ekleme() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  RAISE EXCEPTION 'Bu kayıt değiştirilemez ve silinemez (%). Düzeltme için yeni kayıt ekleyin.', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END
$$;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['kanit','kanit_parcasi','oneri','karar','cikti','rapor_bolumu_surumu',
                            'gunluk','olcme_sonucu','yetki_politikasi']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION yalniz_ekleme()',
                   t || '_degismez', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION yalniz_ekleme()',
                   t || '_bosaltilamaz', t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- ---------- Karar kuralları ----------
-- Tekillik `karar_oneri_tekil`, politika kimliği zorunluluğu `karar_politika_dayanagi`,
-- politikada yüksek risk yasağı `politika_yuksek_risk_yok` kısıtlarıyla; aşağıdakiler tetikleyiciyle.
CREATE OR REPLACE FUNCTION karar_denetle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  o oneri;
  p yetki_politikasi;
BEGIN
  SELECT * INTO o FROM oneri WHERE id = NEW.oneri_id;
  IF NOT FOUND OR o.kurum_id <> NEW.kurum_id THEN
    RAISE EXCEPTION 'Karar, aynı kuruma ait bir öneriye bağlanmalı.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.dayanak = 'politika' THEN
    IF NEW.politika_id IS NULL THEN
      -- CHECK kısıtı (karar_politika_dayanagi) da yakalar; tetikleyici ondan önce çalıştığı için burada da denetlenir.
      RAISE EXCEPTION 'Politika dayanaklı kararda politika kimliği zorunlu.' USING ERRCODE = 'check_violation';
    END IF;
    IF o.risk = 'yuksek' THEN
      RAISE EXCEPTION 'Yüksek riskli öneri yetki devriyle karara bağlanamaz; kararı yetkili kişi vermeli.'
        USING ERRCODE = 'check_violation';
    END IF;
    SELECT * INTO p FROM yetki_politikasi WHERE id = NEW.politika_id;
    IF NOT FOUND OR p.kurum_id <> NEW.kurum_id THEN
      RAISE EXCEPTION 'Karara dayanak olan yetki politikası bulunamadı.' USING ERRCODE = 'check_violation';
    END IF;
    IF o.risk > p.en_yuksek_risk OR NOT (o.tur = ANY (p.oneri_turleri))
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
--> statement-breakpoint
CREATE TRIGGER karar_denetimi BEFORE INSERT ON karar FOR EACH ROW EXECUTE FUNCTION karar_denetle();
--> statement-breakpoint

-- ---------- Günlük özet zinciri ----------
-- Kanonik kayıt (uygulama @akredit/cekirdek kanonikJson ile üretir):
--   {"aktor":{"id":..,"tur":..},"ayrinti":{..},"eylem":..,"hedef":{"id":..,"tur":..}|null,"id":..,"kurumId":..,"zaman":"ISO"}
-- ozet = sha256(UTF-8(coalesce(onceki_ozet, '') || kanonik)), onaltılık.
CREATE OR REPLACE FUNCTION gunluk_ozeti(onceki text, kanonik text) RETURNS text
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT encode(sha256(convert_to(coalesce(onceki, '') || kanonik, 'UTF8')), 'hex') $$;
--> statement-breakpoint
-- Sütunlar kanonik metinle uyuşuyor mu? (jsonb karşılaştırması anlamsaldır; özet girdisi kanonik metindir.)
CREATE OR REPLACE FUNCTION gunluk_uyumlu(g gunluk) RETURNS boolean
  LANGUAGE plpgsql STABLE
  AS $$
DECLARE
  j jsonb;
BEGIN
  j := g.kanonik::jsonb;
  RETURN j = jsonb_build_object(
      'id', g.id::text,
      'kurumId', g.kurum_id::text,
      'zaman', j -> 'zaman',
      'aktor', jsonb_build_object('tur', g.aktor_turu::text, 'id', g.aktor_id),
      'eylem', g.eylem,
      'hedef', CASE WHEN g.hedef_turu IS NULL AND g.hedef_id IS NULL THEN 'null'::jsonb
                    ELSE jsonb_build_object('tur', g.hedef_turu, 'id', g.hedef_id) END,
      'ayrinti', g.ayrinti)
    AND (j ->> 'zaman')::timestamptz = g.zaman;
EXCEPTION WHEN others THEN
  RETURN false;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION gunluk_zincirle() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  son record;
BEGIN
  -- Aynı kurumun eklemeleri sıraya girer; zincir çatallanmaz.
  PERFORM pg_advisory_xact_lock(hashtextextended('akredit.gunluk:' || NEW.kurum_id::text, 0));
  BEGIN
    NEW.zaman := (NEW.kanonik::jsonb ->> 'zaman')::timestamptz;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Günlük kaydı geçersiz: kanonik metin okunamadı.' USING ERRCODE = 'check_violation';
  END;
  IF NOT gunluk_uyumlu(NEW) THEN
    RAISE EXCEPTION 'Günlük kaydı geçersiz: alanlar kanonik metinle uyuşmuyor.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT g.sira, g.ozet INTO son FROM gunluk g WHERE g.kurum_id = NEW.kurum_id ORDER BY g.sira DESC LIMIT 1;
  IF FOUND THEN
    NEW.sira := son.sira + 1;
    NEW.onceki_ozet := son.ozet;
  ELSE
    NEW.sira := 1;
    NEW.onceki_ozet := NULL;
  END IF;
  NEW.ozet := gunluk_ozeti(NEW.onceki_ozet, NEW.kanonik);
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER gunluk_zinciri BEFORE INSERT ON gunluk FOR EACH ROW EXECUTE FUNCTION gunluk_zincirle();
--> statement-breakpoint
-- İlk bozuk kaydın kimliğini, zincir sağlamsa NULL döndürür. Silinmiş kayıt, ardından gelen kaydın
-- sıra ya da önceki özet uyuşmazlığıyla yakalanır.
CREATE OR REPLACE FUNCTION gunluk_zinciri_dogrula(p_kurum uuid) RETURNS uuid
  LANGUAGE plpgsql STABLE
  AS $$
DECLARE
  r gunluk;
  onceki text := NULL;
  beklenen bigint := 1;
BEGIN
  FOR r IN SELECT * FROM gunluk WHERE kurum_id = p_kurum ORDER BY sira LOOP
    IF r.sira <> beklenen
       OR r.onceki_ozet IS DISTINCT FROM onceki
       OR r.ozet IS DISTINCT FROM gunluk_ozeti(onceki, r.kanonik)
       OR NOT gunluk_uyumlu(r) THEN
      RETURN r.id;
    END IF;
    onceki := r.ozet;
    beklenen := beklenen + 1;
  END LOOP;
  RETURN NULL;
END
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION gunluk_ozeti(text, text), gunluk_uyumlu(gunluk), gunluk_zinciri_dogrula(uuid)
  TO akredit_uygulama;
