CREATE TYPE "public"."aktor_turu" AS ENUM('kisi', 'sistem', 'yz');--> statement-breakpoint
CREATE TYPE "public"."birim_turu" AS ENUM('fakulte', 'myo', 'enstitu', 'yuksekokul', 'bolum', 'anabilim_dali', 'idari');--> statement-breakpoint
CREATE TYPE "public"."cikti_turu" AS ENUM('pea', 'program', 'ders', 'tyyc');--> statement-breakpoint
CREATE TYPE "public"."kanit_isleme_durumu" AS ENUM('bekliyor', 'metin_cikarildi', 'ocr_gerekli', 'gomme_tamam', 'hata');--> statement-breakpoint
CREATE TYPE "public"."kanit_kaynak_turu" AS ENUM('yukleme', 'baglayici', 'eposta', 'uretilen');--> statement-breakpoint
CREATE TYPE "public"."kapsam_turu" AS ENUM('kurum', 'birim', 'program', 'ders');--> statement-breakpoint
CREATE TYPE "public"."karar_dayanagi" AS ENUM('dogrudan', 'politika');--> statement-breakpoint
CREATE TYPE "public"."karar_sonucu" AS ENUM('onaylandi', 'duzeltildi', 'reddedildi');--> statement-breakpoint
CREATE TYPE "public"."kisisel_veri_durumu" AS ENUM('yok', 'maskeli', 'var', 'bilinmiyor');--> statement-breakpoint
CREATE TYPE "public"."olcme_araci_turu" AS ENUM('ara_sinav', 'yariyil_sonu', 'odev', 'proje', 'kisa_sinav', 'uygulama', 'butunleme', 'diger');--> statement-breakpoint
CREATE TYPE "public"."oneri_turu" AS ENUM('kanit_etiketi', 'toplanti_tutanagi', 'anket_ozeti', 'matris_katkisi', 'soru_cikti_eslemesi', 'bologna_taslagi', 'rapor_bolumu', 'eylem', 'olgunluk_duzeyi', 'yazma_plani', 'dis_gonderim');--> statement-breakpoint
CREATE TYPE "public"."program_duzeyi" AS ENUM('onlisans', 'lisans', 'yuksek_lisans', 'doktora');--> statement-breakpoint
CREATE TYPE "public"."puko_asamasi" AS ENUM('planla', 'uygula', 'kontrol_et', 'onlem_al');--> statement-breakpoint
CREATE TYPE "public"."rapor_turu" AS ENUM('kidr', 'bidr', 'odr', 'ders_dosyasi', 'olcme_raporu', 'anket_raporu', 'eylem_plani', 'ziyaret_paketi');--> statement-breakpoint
CREATE TYPE "public"."risk_duzeyi" AS ENUM('dusuk', 'orta', 'yuksek');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('kurum_yoneticisi', 'kalite_komisyonu_baskani', 'kalite_komisyonu_uyesi', 'birim_kalite_sorumlusu', 'program_sorumlusu', 'ogretim_elemani', 'degerlendirici', 'gozlemci');--> statement-breakpoint
CREATE TYPE "public"."uretici_turu" AS ENUM('yz', 'kural', 'kisi');--> statement-breakpoint
CREATE TABLE "cerceve" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kod" text NOT NULL,
	"ad" text NOT NULL,
	"surum" text NOT NULL,
	"kaynak_adresi" text,
	"kaynak_ozeti" text,
	"kaynak_tarihi" timestamp with time zone,
	"dogrulandi" boolean DEFAULT false NOT NULL,
	"dogrulayan" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cerceve_kod_unique" UNIQUE("kod")
);
--> statement-breakpoint
CREATE TABLE "kanit_gereksinimi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"olcut_id" uuid NOT NULL,
	"duzey" smallint,
	"beklenen_kanit_turu" text NOT NULL,
	"otomatik_kaynak" text
);
--> statement-breakpoint
CREATE TABLE "olcut" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cerceve_id" uuid NOT NULL,
	"ust_olcut_id" uuid,
	"kod" text NOT NULL,
	"baslik" text NOT NULL,
	"resmi_aciklama" text,
	"sira" integer NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "olcut_cerceve_kod_tekil" UNIQUE("cerceve_id","kod")
);
--> statement-breakpoint
CREATE TABLE "olgunluk_duzeyi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"olcut_id" uuid NOT NULL,
	"duzey" smallint NOT NULL,
	"tanim" text NOT NULL,
	CONSTRAINT "olgunluk_olcut_duzey_tekil" UNIQUE("olcut_id","duzey")
);
--> statement-breakpoint
CREATE TABLE "gunluk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"sira" bigint DEFAULT 0 NOT NULL,
	"zaman" timestamp with time zone NOT NULL,
	"aktor_turu" "aktor_turu" NOT NULL,
	"aktor_id" text,
	"eylem" text NOT NULL,
	"hedef_turu" text,
	"hedef_id" text,
	"ayrinti" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"kanonik" text NOT NULL,
	"onceki_ozet" text,
	"ozet" text DEFAULT '' NOT NULL,
	CONSTRAINT "gunluk_sira_tekil" UNIQUE("kurum_id","sira")
);
--> statement-breakpoint
CREATE TABLE "takma_ad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"takma_ad" text NOT NULL,
	"numara_sifreli" "bytea" NOT NULL,
	"anahtar_surumu" text NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "takma_ad_tekil" UNIQUE("kurum_id","takma_ad")
);
--> statement-breakpoint
CREATE TABLE "kanit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ozet" text NOT NULL,
	"dosya_adi" text NOT NULL,
	"mime" text NOT NULL,
	"boyut" bigint NOT NULL,
	"depo_anahtari" text NOT NULL,
	"kaynak_turu" "kanit_kaynak_turu" NOT NULL,
	"kaynak_ayrinti" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"belge_tarihi" text,
	"kapsamlar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"yukleyen_kisi_id" uuid,
	"kisisel_veri" "kisisel_veri_durumu" DEFAULT 'bilinmiyor' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kanit_kurum_ozet_tekil" UNIQUE("kurum_id","ozet"),
	CONSTRAINT "kanit_ozet_bicimi" CHECK ("kanit"."ozet" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "kanit_isleme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kanit_id" uuid NOT NULL,
	"durum" "kanit_isleme_durumu" NOT NULL,
	"ayrinti" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanit_olcut_baglantisi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kanit_id" uuid NOT NULL,
	"parca_id" uuid,
	"olcut_id" uuid NOT NULL,
	"karar_id" uuid NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanit_parcasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kanit_id" uuid NOT NULL,
	"sira" integer NOT NULL,
	"capa" jsonb NOT NULL,
	"metin" text NOT NULL,
	"gomme" vector(1024),
	"dil" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kanit_parcasi_sira_tekil" UNIQUE("kanit_id","sira")
);
--> statement-breakpoint
CREATE TABLE "birim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ust_birim_id" uuid,
	"tur" "birim_turu" NOT NULL,
	"ad" text NOT NULL,
	"kod" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"kod" text NOT NULL,
	"ad" text NOT NULL,
	"akts" integer NOT NULL,
	"teorik" smallint DEFAULT 0 NOT NULL,
	"uygulama" smallint DEFAULT 0 NOT NULL,
	"laboratuvar" smallint DEFAULT 0 NOT NULL,
	"yariyil" smallint NOT NULL,
	"zorunlu" boolean DEFAULT true NOT NULL,
	"dil" text DEFAULT 'tr' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ders_program_kod_tekil" UNIQUE("program_id","kod")
);
--> statement-breakpoint
CREATE TABLE "ders_acilisi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ders_id" uuid NOT NULL,
	"donem_id" uuid NOT NULL,
	"sorumlu_kisi_idleri" uuid[] DEFAULT '{}' NOT NULL,
	"sube" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ad" text NOT NULL,
	"baslangic" date NOT NULL,
	"bitis" date NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kisi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ad_soyad" text NOT NULL,
	"unvan" text,
	"eposta" text,
	"avesis_adresi" text,
	"oturum_kullanici_id" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kurum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ad" text NOT NULL,
	"kisa_ad" text,
	"alan_adi" text,
	"ayarlar" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kurum_alan_adi_unique" UNIQUE("alan_adi")
);
--> statement-breakpoint
CREATE TABLE "program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"birim_id" uuid NOT NULL,
	"ad" text NOT NULL,
	"duzey" "program_duzeyi" NOT NULL,
	"dil" text DEFAULT 'tr' NOT NULL,
	"ogretim_turu" text,
	"bologna_adresi" text,
	"yok_atlas_kodu" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rol_atamasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kisi_id" uuid NOT NULL,
	"rol" "rol" NOT NULL,
	"kapsam_turu" "kapsam_turu" NOT NULL,
	"kapsam_id" uuid NOT NULL,
	"baslangic" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cikti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"tur" "cikti_turu" NOT NULL,
	"sahip_id" uuid NOT NULL,
	"kod" text NOT NULL,
	"metin" text NOT NULL,
	"surum" integer DEFAULT 1 NOT NULL,
	"onceki_surum_id" uuid,
	"kaynak_kanit_id" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cikti_surum_tekil" UNIQUE("sahip_id","kod","surum"),
	CONSTRAINT "cikti_surum_pozitif" CHECK ("cikti"."surum" >= 1)
);
--> statement-breakpoint
CREATE TABLE "katki" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ders_cikti_id" uuid NOT NULL,
	"program_cikti_id" uuid NOT NULL,
	"deger" text NOT NULL,
	"karar_id" uuid NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "katki_deger" CHECK ("katki"."deger" in ('1','2','3','4','5','iliskisiz','yetersiz_kanit'))
);
--> statement-breakpoint
CREATE TABLE "ogrenci_puani" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"olcme_araci_id" uuid NOT NULL,
	"soru_id" uuid,
	"ogrenci_takma_ad" text NOT NULL,
	"puan" numeric(8, 3),
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ogrenci_puani_tekil" UNIQUE("olcme_araci_id","soru_id","ogrenci_takma_ad")
);
--> statement-breakpoint
CREATE TABLE "olcme_araci" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ders_acilisi_id" uuid NOT NULL,
	"tur" "olcme_araci_turu" NOT NULL,
	"ad" text,
	"agirlik" numeric(6, 3) NOT NULL,
	"tarih" date,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "olcme_sonucu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ders_acilisi_id" uuid,
	"hesap_surumu" text NOT NULL,
	"girdi_ozeti" text NOT NULL,
	"sonuc" jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soru" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"olcme_araci_id" uuid NOT NULL,
	"numara" text NOT NULL,
	"tam_puan" numeric(8, 3) NOT NULL,
	"cikti_eslemesi" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "soru_numara_tekil" UNIQUE("olcme_araci_id","numara")
);
--> statement-breakpoint
CREATE TABLE "karar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"oneri_id" uuid NOT NULL,
	"sonuc" "karar_sonucu" NOT NULL,
	"duzeltme" jsonb,
	"karar_veren_kisi_id" uuid NOT NULL,
	"dayanak" "karar_dayanagi" NOT NULL,
	"politika_id" uuid,
	"gerekce" text,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "karar_oneri_tekil" UNIQUE("oneri_id"),
	CONSTRAINT "karar_politika_dayanagi" CHECK (("karar"."dayanak" = 'politika' and "karar"."politika_id" is not null) or ("karar"."dayanak" = 'dogrudan' and "karar"."politika_id" is null)),
	CONSTRAINT "karar_duzeltme" CHECK (("karar"."sonuc" = 'duzeltildi') = ("karar"."duzeltme" is not null))
);
--> statement-breakpoint
CREATE TABLE "oneri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"tur" "oneri_turu" NOT NULL,
	"hedef_turu" text NOT NULL,
	"hedef_id" text NOT NULL,
	"icerik" jsonb NOT NULL,
	"gerekce" text NOT NULL,
	"atiflar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guven" real,
	"uretici_turu" "uretici_turu" NOT NULL,
	"uretici" jsonb NOT NULL,
	"risk" "risk_duzeyi" NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oneri_guven_araligi" CHECK ("oneri"."guven" is null or ("oneri"."guven" >= 0 and "oneri"."guven" <= 1))
);
--> statement-breakpoint
CREATE TABLE "yetki_politikasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"ad" text NOT NULL,
	"oneri_turleri" "oneri_turu"[] NOT NULL,
	"en_yuksek_risk" "risk_duzeyi" NOT NULL,
	"en_dusuk_guven" real NOT NULL,
	"birim_idleri" uuid[],
	"program_idleri" uuid[],
	"imzalayan_kisi_id" uuid NOT NULL,
	"baslangic" timestamp with time zone NOT NULL,
	"bitis" timestamp with time zone,
	"iptal_ettigi_id" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "politika_yuksek_risk_yok" CHECK ("yetki_politikasi"."en_yuksek_risk" <> 'yuksek'),
	CONSTRAINT "politika_guven_araligi" CHECK ("yetki_politikasi"."en_dusuk_guven" >= 0 and "yetki_politikasi"."en_dusuk_guven" <= 1)
);
--> statement-breakpoint
CREATE TABLE "anket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"baslik" text NOT NULL,
	"kapsam" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"baslangic" timestamp with time zone,
	"bitis" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anket_sorusu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"anket_id" uuid NOT NULL,
	"sira" integer NOT NULL,
	"metin" text NOT NULL,
	"tur" text NOT NULL,
	"secenekler" jsonb
);
--> statement-breakpoint
CREATE TABLE "anket_yaniti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"anket_id" uuid NOT NULL,
	"yanitlar" jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bildirim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kisi_id" uuid NOT NULL,
	"tur" text NOT NULL,
	"icerik" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"okundu" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eylem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kaynak" jsonb NOT NULL,
	"tanim" text NOT NULL,
	"sorumlu_kisi_id" uuid,
	"hedef_tarih" timestamp with time zone,
	"puko_asamasi" "puko_asamasi" DEFAULT 'planla' NOT NULL,
	"kanit_idleri" uuid[] DEFAULT '{}' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gorev" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"surec_ornegi_id" uuid,
	"baslik" text NOT NULL,
	"atanan_kisi_id" uuid,
	"durum" text DEFAULT 'acik' NOT NULL,
	"ayrinti" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gosterge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kod" text NOT NULL,
	"ad" text NOT NULL,
	"birim" text,
	"hesap_tanimi" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gosterge_olcumu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"gosterge_id" uuid NOT NULL,
	"donem_id" uuid,
	"deger" numeric,
	"kaynak" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"tur" "rapor_turu" NOT NULL,
	"cerceve_id" uuid,
	"kapsam" jsonb NOT NULL,
	"donem_id" uuid,
	"baslik" text,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapor_bolumu_surumu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"rapor_id" uuid NOT NULL,
	"olcut_id" uuid,
	"bolum_kodu" text,
	"metin" text NOT NULL,
	"atiflar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"denetim_sonucu" jsonb,
	"oneri_id" uuid,
	"onceki_surum_id" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "son_tarih" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"gorev_id" uuid,
	"ad" text NOT NULL,
	"tarih" timestamp with time zone NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surec_ornegi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"surec_tanimi_id" uuid NOT NULL,
	"kapsam" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"durum" text DEFAULT 'acik' NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surec_tanimi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"kod" text NOT NULL,
	"ad" text NOT NULL,
	"tanim" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"surum" integer DEFAULT 1 NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "toplanti" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kurum_id" uuid NOT NULL,
	"baslik" text NOT NULL,
	"zaman" timestamp with time zone NOT NULL,
	"katilimci_kisi_idleri" uuid[] DEFAULT '{}' NOT NULL,
	"gundem" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tutanak_kanit_id" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanit_gereksinimi" ADD CONSTRAINT "kanit_gereksinimi_olcut_id_olcut_id_fk" FOREIGN KEY ("olcut_id") REFERENCES "public"."olcut"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olcut" ADD CONSTRAINT "olcut_cerceve_id_cerceve_id_fk" FOREIGN KEY ("cerceve_id") REFERENCES "public"."cerceve"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olcut" ADD CONSTRAINT "olcut_ust_olcut_id_olcut_id_fk" FOREIGN KEY ("ust_olcut_id") REFERENCES "public"."olcut"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olgunluk_duzeyi" ADD CONSTRAINT "olgunluk_duzeyi_olcut_id_olcut_id_fk" FOREIGN KEY ("olcut_id") REFERENCES "public"."olcut"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gunluk" ADD CONSTRAINT "gunluk_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takma_ad" ADD CONSTRAINT "takma_ad_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit" ADD CONSTRAINT "kanit_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_isleme" ADD CONSTRAINT "kanit_isleme_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_isleme" ADD CONSTRAINT "kanit_isleme_kanit_id_kanit_id_fk" FOREIGN KEY ("kanit_id") REFERENCES "public"."kanit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_olcut_baglantisi" ADD CONSTRAINT "kanit_olcut_baglantisi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_olcut_baglantisi" ADD CONSTRAINT "kanit_olcut_baglantisi_kanit_id_kanit_id_fk" FOREIGN KEY ("kanit_id") REFERENCES "public"."kanit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_olcut_baglantisi" ADD CONSTRAINT "kanit_olcut_baglantisi_parca_id_kanit_parcasi_id_fk" FOREIGN KEY ("parca_id") REFERENCES "public"."kanit_parcasi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_olcut_baglantisi" ADD CONSTRAINT "kanit_olcut_baglantisi_olcut_id_olcut_id_fk" FOREIGN KEY ("olcut_id") REFERENCES "public"."olcut"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_parcasi" ADD CONSTRAINT "kanit_parcasi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanit_parcasi" ADD CONSTRAINT "kanit_parcasi_kanit_id_kanit_id_fk" FOREIGN KEY ("kanit_id") REFERENCES "public"."kanit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birim" ADD CONSTRAINT "birim_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birim" ADD CONSTRAINT "birim_ust_birim_id_birim_id_fk" FOREIGN KEY ("ust_birim_id") REFERENCES "public"."birim"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ders" ADD CONSTRAINT "ders_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ders" ADD CONSTRAINT "ders_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ders_acilisi" ADD CONSTRAINT "ders_acilisi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ders_acilisi" ADD CONSTRAINT "ders_acilisi_ders_id_ders_id_fk" FOREIGN KEY ("ders_id") REFERENCES "public"."ders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ders_acilisi" ADD CONSTRAINT "ders_acilisi_donem_id_donem_id_fk" FOREIGN KEY ("donem_id") REFERENCES "public"."donem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donem" ADD CONSTRAINT "donem_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kisi" ADD CONSTRAINT "kisi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_birim_id_birim_id_fk" FOREIGN KEY ("birim_id") REFERENCES "public"."birim"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_atamasi" ADD CONSTRAINT "rol_atamasi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rol_atamasi" ADD CONSTRAINT "rol_atamasi_kisi_id_kisi_id_fk" FOREIGN KEY ("kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cikti" ADD CONSTRAINT "cikti_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cikti" ADD CONSTRAINT "cikti_onceki_surum_id_cikti_id_fk" FOREIGN KEY ("onceki_surum_id") REFERENCES "public"."cikti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cikti" ADD CONSTRAINT "cikti_kaynak_kanit_id_kanit_id_fk" FOREIGN KEY ("kaynak_kanit_id") REFERENCES "public"."kanit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "katki" ADD CONSTRAINT "katki_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "katki" ADD CONSTRAINT "katki_ders_cikti_id_cikti_id_fk" FOREIGN KEY ("ders_cikti_id") REFERENCES "public"."cikti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "katki" ADD CONSTRAINT "katki_program_cikti_id_cikti_id_fk" FOREIGN KEY ("program_cikti_id") REFERENCES "public"."cikti"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ogrenci_puani" ADD CONSTRAINT "ogrenci_puani_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ogrenci_puani" ADD CONSTRAINT "ogrenci_puani_olcme_araci_id_olcme_araci_id_fk" FOREIGN KEY ("olcme_araci_id") REFERENCES "public"."olcme_araci"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ogrenci_puani" ADD CONSTRAINT "ogrenci_puani_soru_id_soru_id_fk" FOREIGN KEY ("soru_id") REFERENCES "public"."soru"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olcme_araci" ADD CONSTRAINT "olcme_araci_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olcme_araci" ADD CONSTRAINT "olcme_araci_ders_acilisi_id_ders_acilisi_id_fk" FOREIGN KEY ("ders_acilisi_id") REFERENCES "public"."ders_acilisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olcme_sonucu" ADD CONSTRAINT "olcme_sonucu_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "olcme_sonucu" ADD CONSTRAINT "olcme_sonucu_ders_acilisi_id_ders_acilisi_id_fk" FOREIGN KEY ("ders_acilisi_id") REFERENCES "public"."ders_acilisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soru" ADD CONSTRAINT "soru_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soru" ADD CONSTRAINT "soru_olcme_araci_id_olcme_araci_id_fk" FOREIGN KEY ("olcme_araci_id") REFERENCES "public"."olcme_araci"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karar" ADD CONSTRAINT "karar_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karar" ADD CONSTRAINT "karar_oneri_id_oneri_id_fk" FOREIGN KEY ("oneri_id") REFERENCES "public"."oneri"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karar" ADD CONSTRAINT "karar_karar_veren_kisi_id_kisi_id_fk" FOREIGN KEY ("karar_veren_kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karar" ADD CONSTRAINT "karar_politika_id_yetki_politikasi_id_fk" FOREIGN KEY ("politika_id") REFERENCES "public"."yetki_politikasi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oneri" ADD CONSTRAINT "oneri_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yetki_politikasi" ADD CONSTRAINT "yetki_politikasi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yetki_politikasi" ADD CONSTRAINT "yetki_politikasi_imzalayan_kisi_id_kisi_id_fk" FOREIGN KEY ("imzalayan_kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anket" ADD CONSTRAINT "anket_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anket_sorusu" ADD CONSTRAINT "anket_sorusu_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anket_sorusu" ADD CONSTRAINT "anket_sorusu_anket_id_anket_id_fk" FOREIGN KEY ("anket_id") REFERENCES "public"."anket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anket_yaniti" ADD CONSTRAINT "anket_yaniti_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anket_yaniti" ADD CONSTRAINT "anket_yaniti_anket_id_anket_id_fk" FOREIGN KEY ("anket_id") REFERENCES "public"."anket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bildirim" ADD CONSTRAINT "bildirim_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bildirim" ADD CONSTRAINT "bildirim_kisi_id_kisi_id_fk" FOREIGN KEY ("kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eylem" ADD CONSTRAINT "eylem_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eylem" ADD CONSTRAINT "eylem_sorumlu_kisi_id_kisi_id_fk" FOREIGN KEY ("sorumlu_kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorev" ADD CONSTRAINT "gorev_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorev" ADD CONSTRAINT "gorev_surec_ornegi_id_surec_ornegi_id_fk" FOREIGN KEY ("surec_ornegi_id") REFERENCES "public"."surec_ornegi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gorev" ADD CONSTRAINT "gorev_atanan_kisi_id_kisi_id_fk" FOREIGN KEY ("atanan_kisi_id") REFERENCES "public"."kisi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gosterge" ADD CONSTRAINT "gosterge_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gosterge_olcumu" ADD CONSTRAINT "gosterge_olcumu_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gosterge_olcumu" ADD CONSTRAINT "gosterge_olcumu_gosterge_id_gosterge_id_fk" FOREIGN KEY ("gosterge_id") REFERENCES "public"."gosterge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gosterge_olcumu" ADD CONSTRAINT "gosterge_olcumu_donem_id_donem_id_fk" FOREIGN KEY ("donem_id") REFERENCES "public"."donem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapor" ADD CONSTRAINT "rapor_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapor" ADD CONSTRAINT "rapor_cerceve_id_cerceve_id_fk" FOREIGN KEY ("cerceve_id") REFERENCES "public"."cerceve"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapor" ADD CONSTRAINT "rapor_donem_id_donem_id_fk" FOREIGN KEY ("donem_id") REFERENCES "public"."donem"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapor_bolumu_surumu" ADD CONSTRAINT "rapor_bolumu_surumu_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapor_bolumu_surumu" ADD CONSTRAINT "rapor_bolumu_surumu_rapor_id_rapor_id_fk" FOREIGN KEY ("rapor_id") REFERENCES "public"."rapor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapor_bolumu_surumu" ADD CONSTRAINT "rapor_bolumu_surumu_olcut_id_olcut_id_fk" FOREIGN KEY ("olcut_id") REFERENCES "public"."olcut"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "son_tarih" ADD CONSTRAINT "son_tarih_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "son_tarih" ADD CONSTRAINT "son_tarih_gorev_id_gorev_id_fk" FOREIGN KEY ("gorev_id") REFERENCES "public"."gorev"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surec_ornegi" ADD CONSTRAINT "surec_ornegi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surec_ornegi" ADD CONSTRAINT "surec_ornegi_surec_tanimi_id_surec_tanimi_id_fk" FOREIGN KEY ("surec_tanimi_id") REFERENCES "public"."surec_tanimi"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surec_tanimi" ADD CONSTRAINT "surec_tanimi_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toplanti" ADD CONSTRAINT "toplanti_kurum_id_kurum_id_fk" FOREIGN KEY ("kurum_id") REFERENCES "public"."kurum"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kanit_parcasi_kanit_idx" ON "kanit_parcasi" USING btree ("kanit_id");