-- İP-35 göçü, elle yazılmıştır. Self-servis kurum açılışı ve birim/program düzeltme kaydı.
--
-- 1) `kurum_acilis_talebi`: akredit.org'daki "Kurumunuzu açın" başvurusu. Kurum henüz yoktur, bu yüzden
--    kiracı tablosu değildir (kimlik tabloları gibi). Belirtecin yalnız SHA-256 özeti saklanır; IP adresi
--    saklanmaz, yalnız tuzlu ağ izi (hız sınırı için). Aynı alan adına ikinci kurum açılamaz: tamamlanmış
--    talepte alan adı tekildir, ayrıca `kurum.alan_adi` tekildir.
-- 2) `kurum_olustur(...)`: uygulama rolünün `kurum` tablosuna ekleme yetkisi yoktur. Kurum yalnız bu işlevle,
--    doğrulanmış talep üzerinden açılır. İşlev tanımlayıcı haklarıyla çalışır ve yalnız oturum rolüne açıktır.
-- 3) `kayit_duzeltmesi`: birim ve program düzeltmeleri. Eski ve yeni değer yeni kayıt olarak eklenir; kayıt
--    değiştirilemez ve silinemez.

CREATE TABLE kurum_acilis_talebi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_adi text NOT NULL,
  alan_adi text NOT NULL,
  yonetici_adi text NOT NULL,
  eposta text NOT NULL,
  belirtec_ozeti text NOT NULL UNIQUE,
  ag_izi text,
  son_gecerlilik timestamptz NOT NULL,
  dogrulama timestamptz,
  acilan_kurum_id uuid REFERENCES kurum(id) DEFERRABLE INITIALLY DEFERRED,
  olusturma timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kurum_acilis_talebi_ozet_bicimi CHECK (belirtec_ozeti ~ '^[0-9a-f]{64}$'),
  CONSTRAINT kurum_acilis_talebi_alan_kucuk CHECK (alan_adi = lower(alan_adi)),
  CONSTRAINT kurum_acilis_talebi_eposta_kucuk CHECK (eposta = lower(eposta))
);
--> statement-breakpoint
CREATE UNIQUE INDEX kurum_acilis_talebi_alan_tekil ON kurum_acilis_talebi (alan_adi) WHERE acilan_kurum_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX kurum_acilis_talebi_zaman ON kurum_acilis_talebi (olusturma);
--> statement-breakpoint
REVOKE ALL ON kurum_acilis_talebi FROM akredit_uygulama;
--> statement-breakpoint
ALTER TABLE kurum_acilis_talebi ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON kurum_acilis_talebi TO akredit_oturum;
--> statement-breakpoint
CREATE POLICY oturum_erisimi ON kurum_acilis_talebi TO akredit_oturum USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION kurum_olustur(p_id uuid, p_ad text, p_alan_adi text) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kurum_acilis_talebi
    WHERE alan_adi = p_alan_adi AND dogrulama IS NOT NULL AND acilan_kurum_id = p_id
  ) THEN
    RAISE EXCEPTION 'Kurum yalnız doğrulanmış açılış talebiyle açılır.' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM set_config('app.kurum_id', p_id::text, true);
  INSERT INTO kurum (id, ad, alan_adi) VALUES (p_id, p_ad, p_alan_adi);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION kurum_olustur(uuid, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kurum_olustur(uuid, text, text) TO akredit_oturum;
--> statement-breakpoint
CREATE TABLE kayit_duzeltmesi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum_id uuid NOT NULL REFERENCES kurum(id),
  hedef_turu text NOT NULL,
  hedef_id uuid NOT NULL,
  onceki jsonb NOT NULL,
  yeni jsonb NOT NULL,
  duzelten_kisi_id uuid NOT NULL REFERENCES kisi(id),
  olusturma timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kayit_duzeltmesi_hedef CHECK (hedef_turu IN ('birim', 'program'))
);
--> statement-breakpoint
GRANT SELECT, INSERT ON kayit_duzeltmesi TO akredit_uygulama;
--> statement-breakpoint
ALTER TABLE kayit_duzeltmesi ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE kayit_duzeltmesi FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY kiraci_yalitimi ON kayit_duzeltmesi USING (kurum_id = etkin_kurum()) WITH CHECK (kurum_id = etkin_kurum());
--> statement-breakpoint
CREATE TRIGGER kayit_duzeltmesi_degismez BEFORE UPDATE OR DELETE ON kayit_duzeltmesi
  FOR EACH ROW EXECUTE FUNCTION yalniz_ekleme();
--> statement-breakpoint
CREATE TRIGGER kayit_duzeltmesi_bosaltilamaz BEFORE TRUNCATE ON kayit_duzeltmesi
  FOR EACH STATEMENT EXECUTE FUNCTION yalniz_ekleme();
