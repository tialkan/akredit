-- İP-42 göçü, elle yazılmıştır. akredit.org'daki pilot kurum başvurusu.
--
-- Kurum henüz yoktur, bu yüzden kiracı tablosu değildir (kurum_acilis_talebi gibi). Kayıt yalnız eklenir:
-- uygulama rolleri güncelleyemez ve silemez. IP adresi saklanmaz, yalnız tuzlu ağ izi (hız sınırı için).
-- Bildirim e-postasının gidip gitmediği ayrı bir sütunda değil, sunucu günlüğündedir; kayıt değişmez.

CREATE TABLE pilot_basvurusu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  kurum text NOT NULL,
  birim text NOT NULL,
  rol text NOT NULL,
  eposta text NOT NULL,
  surec text NOT NULL,
  aciklama text,
  kvkk_onayi timestamptz NOT NULL,
  ag_izi text,
  olusturma timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pilot_basvurusu_eposta_kucuk CHECK (eposta = lower(eposta)),
  CONSTRAINT pilot_basvurusu_uzunluk CHECK (
    char_length(kurum) <= 200 AND char_length(birim) <= 200 AND char_length(coalesce(aciklama, '')) <= 1000
  )
);
--> statement-breakpoint
CREATE INDEX pilot_basvurusu_zaman ON pilot_basvurusu (olusturma);
--> statement-breakpoint
REVOKE ALL ON pilot_basvurusu FROM akredit_uygulama;
--> statement-breakpoint
ALTER TABLE pilot_basvurusu ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON pilot_basvurusu TO akredit_oturum;
--> statement-breakpoint
CREATE POLICY oturum_okuma ON pilot_basvurusu FOR SELECT TO akredit_oturum USING (true);
--> statement-breakpoint
CREATE POLICY oturum_ekleme ON pilot_basvurusu FOR INSERT TO akredit_oturum WITH CHECK (true);
