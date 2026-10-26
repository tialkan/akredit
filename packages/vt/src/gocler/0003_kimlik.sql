-- Kimlik altyapısı (İP-09): drizzle-kit ile üretildi, sonuna elle güvenlik bölümü eklendi.
CREATE TABLE "kimlik_api_anahtari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bagli_kurum_id" uuid NOT NULL,
	"kisi_id" uuid NOT NULL,
	"ad" text NOT NULL,
	"onek" text NOT NULL,
	"ozet" text NOT NULL,
	"kapsam" text[] NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"iptal" timestamp with time zone,
	"son_kullanim" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kimlik_api_anahtari_onek_unique" UNIQUE("onek")
);
--> statement-breakpoint
CREATE TABLE "kimlik_davet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bagli_kurum_id" uuid NOT NULL,
	"eposta" text NOT NULL,
	"ad_soyad" text NOT NULL,
	"rol" "rol" NOT NULL,
	"kapsam_turu" "kapsam_turu" NOT NULL,
	"kapsam_id" uuid NOT NULL,
	"rol_bitis" timestamp with time zone,
	"belirtec_ozeti" text NOT NULL,
	"son_gecerlilik" timestamp with time zone NOT NULL,
	"davet_eden_kisi_id" uuid NOT NULL,
	"kabul_zamani" timestamp with time zone,
	"kabul_eden_kullanici_id" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kimlik_davet_belirtec_ozeti_unique" UNIQUE("belirtec_ozeti")
);
--> statement-breakpoint
CREATE TABLE "kimlik_dogrulama" (
	"id" text PRIMARY KEY NOT NULL,
	"tanimlayici" text NOT NULL,
	"deger" text NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kimlik_giris_izi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kullanici_id" text NOT NULL,
	"ag" text,
	"cihaz" text NOT NULL,
	"ayrinti" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kimlik_hesap" (
	"id" text PRIMARY KEY NOT NULL,
	"hesap_kimligi" text NOT NULL,
	"saglayici" text NOT NULL,
	"kullanici_id" text NOT NULL,
	"erisim_belirteci" text,
	"yenileme_belirteci" text,
	"kimlik_belirteci" text,
	"erisim_belirteci_bitis" timestamp with time zone,
	"yenileme_belirteci_bitis" timestamp with time zone,
	"kapsam" text,
	"parola" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kimlik_kullanici" (
	"id" text PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"eposta" text NOT NULL,
	"eposta_dogrulandi" boolean DEFAULT false NOT NULL,
	"resim" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kimlik_kullanici_eposta_unique" UNIQUE("eposta")
);
--> statement-breakpoint
CREATE TABLE "kimlik_oturum" (
	"id" text PRIMARY KEY NOT NULL,
	"bitis" timestamp with time zone NOT NULL,
	"belirtec" text NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_adresi" text,
	"tarayici" text,
	"kullanici_id" text NOT NULL,
	CONSTRAINT "kimlik_oturum_belirtec_unique" UNIQUE("belirtec")
);
--> statement-breakpoint
CREATE TABLE "kimlik_sso_saglayici" (
	"id" text PRIMARY KEY NOT NULL,
	"yayinci" text NOT NULL,
	"oidc_ayari" text,
	"saml_ayari" text,
	"kullanici_id" text,
	"saglayici" text NOT NULL,
	"organizasyon" text,
	"alan_adi" text NOT NULL,
	"alan_adi_dogrulandi" boolean,
	CONSTRAINT "kimlik_sso_saglayici_saglayici_unique" UNIQUE("saglayici")
);
--> statement-breakpoint
CREATE TABLE "kimlik_uyelik" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kullanici_id" text,
	"eposta" text NOT NULL,
	"bagli_kurum_id" uuid NOT NULL,
	"kisi_id" uuid NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kimlik_uyelik_kurum_eposta" UNIQUE("bagli_kurum_id","eposta")
);
--> statement-breakpoint
ALTER TABLE "kimlik_api_anahtari" ADD CONSTRAINT "kimlik_api_anahtari_bagli_kurum_id_kurum_id_fk" FOREIGN KEY ("bagli_kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_api_anahtari" ADD CONSTRAINT "kimlik_api_anahtari_kisi_id_kisi_id_fk" FOREIGN KEY ("kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_davet" ADD CONSTRAINT "kimlik_davet_bagli_kurum_id_kurum_id_fk" FOREIGN KEY ("bagli_kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_davet" ADD CONSTRAINT "kimlik_davet_davet_eden_kisi_id_kisi_id_fk" FOREIGN KEY ("davet_eden_kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_davet" ADD CONSTRAINT "kimlik_davet_kabul_eden_kullanici_id_kimlik_kullanici_id_fk" FOREIGN KEY ("kabul_eden_kullanici_id") REFERENCES "public"."kimlik_kullanici"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_giris_izi" ADD CONSTRAINT "kimlik_giris_izi_kullanici_id_kimlik_kullanici_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kimlik_kullanici"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_hesap" ADD CONSTRAINT "kimlik_hesap_kullanici_id_kimlik_kullanici_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kimlik_kullanici"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_oturum" ADD CONSTRAINT "kimlik_oturum_kullanici_id_kimlik_kullanici_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kimlik_kullanici"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_sso_saglayici" ADD CONSTRAINT "kimlik_sso_saglayici_kullanici_id_kimlik_kullanici_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kimlik_kullanici"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_uyelik" ADD CONSTRAINT "kimlik_uyelik_kullanici_id_kimlik_kullanici_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kimlik_kullanici"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_uyelik" ADD CONSTRAINT "kimlik_uyelik_bagli_kurum_id_kurum_id_fk" FOREIGN KEY ("bagli_kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kimlik_uyelik" ADD CONSTRAINT "kimlik_uyelik_kisi_id_kisi_id_fk" FOREIGN KEY ("kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kimlik_dogrulama_tanimlayici" ON "kimlik_dogrulama" USING btree ("tanimlayici");--> statement-breakpoint
CREATE INDEX "kimlik_giris_izi_kullanici" ON "kimlik_giris_izi" USING btree ("kullanici_id");--> statement-breakpoint
CREATE INDEX "kimlik_hesap_kullanici" ON "kimlik_hesap" USING btree ("kullanici_id");--> statement-breakpoint
CREATE INDEX "kimlik_oturum_kullanici" ON "kimlik_oturum" USING btree ("kullanici_id");--> statement-breakpoint
CREATE INDEX "kimlik_uyelik_eposta" ON "kimlik_uyelik" USING btree ("eposta");--> statement-breakpoint

-- ---------- Kimlik katmanı güvenliği (elle yazılmıştır) ----------
-- Kimlik tabloları kiracı tablosu değildir; uygulama rolü (`akredit_uygulama`) bunlara hiç erişemez.
-- Yalnız kimlik katmanı, tablo sahibi bağlantısıyla (`akredit_sahip`) okur ve yazar. Satır güvenliği açık
-- ve ilke tanımsızdır: sahip dışındaki her rol için tablo boş görünür (yetki verilse bile).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['kimlik_kullanici','kimlik_oturum','kimlik_hesap','kimlik_dogrulama',
                            'kimlik_sso_saglayici','kimlik_uyelik','kimlik_davet','kimlik_api_anahtari',
                            'kimlik_giris_izi']
  LOOP
    EXECUTE format('REVOKE ALL ON %I FROM akredit_uygulama', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
--> statement-breakpoint
-- Akredit parola saklamaz: giriş sihirli bağlantı ya da kurumsal tek oturum (OIDC/SAML) ile yapılır.
ALTER TABLE kimlik_hesap ADD CONSTRAINT kimlik_hesap_parola_yok CHECK (parola IS NULL);
--> statement-breakpoint
ALTER TABLE kimlik_davet ADD CONSTRAINT kimlik_davet_degerlendirici_sureli
  CHECK (rol <> 'degerlendirici' OR rol_bitis IS NOT NULL);
--> statement-breakpoint
ALTER TABLE kimlik_api_anahtari ADD CONSTRAINT kimlik_api_anahtari_kapsam_dolu CHECK (cardinality(kapsam) > 0);
--> statement-breakpoint
ALTER TABLE kimlik_api_anahtari ADD CONSTRAINT kimlik_api_anahtari_ozet_bicimi CHECK (ozet ~ '^[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE kimlik_davet ADD CONSTRAINT kimlik_davet_ozet_bicimi CHECK (belirtec_ozeti ~ '^[0-9a-f]{64}$');
