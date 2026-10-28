-- Demo kiracısı (İP-41). Elle yazılmıştır.
-- 1) `kurum.demo`: yalnız sentetik Örnek Üniversitesi için true. Değeri yalnız `demo_kurumu_ac()` verir;
--    güncellemeyle değiştirilemez (gerçek kurum demoya, demo kurum gerçeğe dönüşemez).
-- 2) `demo_nesli`: her gece yüklenen demo neslinin kaydı. Kiracı tablosu değildir (sütun `demo_kurum_id`);
--    yalnız kimlik/oturum katmanı (akredit_oturum) okur ve yazar. Etkin nesil, hazır olan en yenisidir.
--    Kanıt, öneri ve günlük yalnız eklendiği için eski nesil silinmez; etkinliğini yitirir.
-- 3) `kimlik_uyelik.demo_bitis`, `demo_rolu`: demo ziyaretçisinin üyeliği. Bitişten sonra istek bağlamı
--    kurulmaz (oturum yenilense bile).
-- 4) `isci_kurumlari()` demo kurumlarını vermez: işçinin olağan turları (e-posta, bağlayıcı, YZ) demoya girmez.

ALTER TABLE kurum ADD COLUMN demo boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION kurum_demo_sabit() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.demo IS DISTINCT FROM OLD.demo THEN
    RAISE EXCEPTION 'Kurumun demo işareti değiştirilemez.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER kurum_demo_sabit BEFORE UPDATE ON kurum FOR EACH ROW EXECUTE FUNCTION kurum_demo_sabit();
--> statement-breakpoint
CREATE TABLE demo_nesli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_kurum_id uuid NOT NULL UNIQUE REFERENCES kurum(id),
  tohum integer NOT NULL,
  veri_surumu text NOT NULL,
  hazir timestamptz,
  olusturma timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE demo_nesli ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE demo_nesli FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, UPDATE ON demo_nesli TO akredit_oturum;
--> statement-breakpoint
CREATE POLICY oturum_erisimi ON demo_nesli TO akredit_oturum USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE kimlik_uyelik ADD COLUMN demo_bitis timestamptz;
--> statement-breakpoint
ALTER TABLE kimlik_uyelik ADD COLUMN demo_rolu text;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION demo_kurumu_ac(p_id uuid, p_ad text, p_tohum integer, p_surum text) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  PERFORM set_config('app.kurum_id', p_id::text, true);
  INSERT INTO kurum (id, ad, kisa_ad, demo) VALUES (p_id, p_ad, 'ÖRNEK', true);
  INSERT INTO demo_nesli (demo_kurum_id, tohum, veri_surumu) VALUES (p_id, p_tohum, p_surum);
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION demo_kurumu_ac(uuid, text, integer, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION demo_kurumu_ac(uuid, text, integer, text) TO akredit_oturum;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION etkin_demo_kurumu() RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT n.demo_kurum_id FROM demo_nesli n JOIN kurum k ON k.id = n.demo_kurum_id
    WHERE n.hazir IS NOT NULL AND k.demo
    ORDER BY n.hazir DESC, n.olusturma DESC LIMIT 1
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION etkin_demo_kurumu() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION etkin_demo_kurumu() TO akredit_oturum;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION demo_kurumu_mu(p_id uuid) RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$ SELECT coalesce((SELECT demo FROM kurum WHERE id = p_id), false) $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION demo_kurumu_mu(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION demo_kurumu_mu(uuid) TO akredit_oturum;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION isci_kurumlari() RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$ SELECT id FROM kurum WHERE NOT demo ORDER BY id $$;
