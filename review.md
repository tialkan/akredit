# Akredit depo incelemesi (2026-11-11)

Amaç: son haftadaki yoğun değişikliklerden sonra deponun tamamını okuyup **bozuk, tutarsız, verimsiz ya da artık
gereksiz** olan her şeyi bulmak. Emin olunanlar düzeltilir, geri kalanı kurucunun kararına bırakılır.

Başlangıç: `060ac7e` (main). MCP 0.8.0 canlıda.

## Çalışma düzeni

Orkestratör bu dosyayı yazar ve birleştirir. Beş alt ajan aynı anda, **birbirine değmeyen yollarda** çalışır. Her
ajan bulgularını `review/<alan>.md` dosyasına yazar; orkestratör sonunda buraya özetler.

| # | Alan | Yollar | Parça dosyası |
|---|---|---|---|
| 1 | Açık MCP | `apps/acik-mcp/**` | `review/1-acik-mcp.md` |
| 2 | Tanıtım sitesi ve tarayıcı araçları | `apps/web/src/app/(site)/**`, `apps/web/src/site/**`, `apps/web/src/deneyin/**`, `apps/web/public/**`, `apps/web/e2e/**` | `review/2-site.md` |
| 3 | Uygulamalar (panel, işçi, kurum MCP, CLI) | `apps/web/src/**` (2. alan dışı), `apps/isci/**`, `apps/mcp/**`, `apps/cli/**` | `review/3-uygulamalar.md` |
| 4 | Paketler | `packages/**` | `review/4-paketler.md` |
| 5 | Belgeler, plan, altyapı, kök | `docs/**`, `plan/**`, `plan.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `SECURITY.md`, `infra/**`, `.github/**`, kök yapılandırma | `review/5-belgeler-altyapi.md` |

## Ortak kurallar (her ajan için)

1. `CLAUDE.md`'deki değişmez ilkeler esnemez. Kanıtı, onayı, günlüğü silen ya da zayıflatan değişiklik yok.
2. **Yalnız kendi yollarında** dosya değiştir. Başka alanda sorun görürsen düzeltme, parça dosyana "başka alan" diye yaz.
3. **Yalnız emin olduğunu düzelt:** kanıtı dosyada görünen, davranışı değiştirmeyen ya da testle doğrulanan şeyler
   (ölü kod, kullanılmayan dışa aktarım, eskimiş yorum ve belge, çelişen metin, yanlış bağlantı, bariz hata).
   Ürün kararı, davranış değişikliği, silme şüphesi olan her şey "kurucu kararı" listesine gider.
4. ADR-0008: askıdaki barındırma kodu (`packages/vt`, `servis`, `apps/isci`, panel) **silinmez**. Orada yalnız
   gerçek hata düzeltilir.
5. Test zayıflatılmaz, `skip` bırakılmaz. Değişiklikten sonra kendi paket(ler)inin testini, `tsc`'sini ve Biome'u çalıştır.
6. Commit atma, push etme, sürüm yükseltme, bağımlılık ekleme. Orkestratör birleştirip tek commit atar.
7. Uydurma yok: emin olmadığın dış bilgiyi `DOĞRULANMADI` diye işaretle.
8. Kullanıcıya görünen metin Türkçe, kısa, sade.

## Parça dosyası biçimi

```
# <Alan>
## Düzeltildi
- `yol:satır` ne yanlıştı → ne yapıldı (doğrulama: hangi test/komut)
## Kurucu kararı gerekiyor
- [önem: yüksek|orta|düşük] `yol:satır` sorun, seçenekler, öneri
## Başka alan
- `yol` kısa not
## Bakıldı, sorun yok
- kısa liste
## Doğrulama
- çalıştırılan komutlar ve sonuçları
```

## Sonuç (2026-11-11)

Beş alan tamamlandı. Yaklaşık 75 düzeltme, 60 dosya. Ayrıntı ve kanıt her alanın parça dosyasında:
[1 Açık MCP](review/1-acik-mcp.md) · [2 Site](review/2-site.md) · [3 Uygulamalar](review/3-uygulamalar.md) ·
[4 Paketler](review/4-paketler.md) · [5 Belgeler ve altyapı](review/5-belgeler-altyapi.md)

### Doğrulama

- `pnpm check`: hata yok (15 uyarı, 6 bilgi; önceden vardı). `pnpm typecheck`: temiz.
- Testler: paketler 1.301, `acik-mcp` 121, `web` 382, `isci` 70, `mcp` 23, `ornek-veri` 21, `cli` 38. Hepsi geçti.
- `packages/servis` içinde "kanıt görünümü işleme durumunu…" testi bütün depo aynı anda koşarken bir kez düştü;
  tek başına ve paket olarak iki kez geçti. Yük altında kararsız, bu incelemeden önce de vardı (aşağıda 12. madde).
- e2e yerelde çalışmaz (tarayıcı yok); CI'da sınanır.
- Süreç notu: 1. alanın ajanı bir an `git stash` / `pop` çalıştırdı. Sonrasında her alanın değişikliği tek tek
  denetlendi; kayıp yok.

### Düzeltilen gerçek hatalar

| Yer | Hata |
|---|---|
| `apps/acik-mcp/src/temel.ts` | Peşin onay "kaydetme", "sen halletme", "onaylamıyorum" sözlerini de onay sayıyordu. Olumsuz söz artık onay değil. |
| `apps/acik-mcp/src/promptlar.ts` | Peşin onay her odakta açılıyordu (dil denetiminde "OBS'ye kaydederim" diyordu). Artık yalnız Bologna ve öğrenme çıktısı. |
| `apps/web/src/demo/uc.ts` ve çevresi | Demo hataları eski `/deneyin?hata=`'ya yönleniyordu; ileti hiç görünmüyordu. Artık `/kurum-demosu`. |
| `apps/web/src/kimlik/erisim.ts` | Bozuk `Referer` başlığı 500 döndürüyordu; artık yazmada 403. |
| `apps/web/src/app/onay/eposta/route.ts` | Satır içi stil nonce'suzdu, CSP engelliyordu (sayfa biçimsiz). Tarayıcıda denenmedi. |
| `packages/cekirdek/src/bologna/taslak.ts` | Türkçe karakter denetimi doğru yazılmış "devamını", "notlarının", "incelenmesi" sözcüklerini hata sayıyordu. |
| `packages/baglayicilar/.../ayristir.ts` | Geçersiz HTML varlığı (`&#99999999;`) bütün sayfa ayrıştırmasını düşürüyordu. |
| `packages/belge/src/parcala.ts` | Tek satırlı tabloda atıf hep 1. satırı gösteriyordu. |
| `apps/web/.../kimler-icin` | `/#donem` çapası kırıktı. |

Geri kalan düzeltmeler: eskimiş MCP anlatımı (site, `llms.txt`, README: 22 araç, yeni akış, peşin onay), çelişen
talimat metinleri, sıra numaraları, ölü kod, eksik dizin kayıtları (ADR 0009), `SON_GUNCELLEME`, `verify:canli`
süzgeci, `CLAUDE.md` depo haritası, strateji raporuna uygulama durumu tablosu, İP-49 rapor eki.

### Senin incelediğin üç davranış değişikliği (ajan kendi kararıyla yaptı, istersen geri alınır)

- `kurulum_yardimi` ve eksik bilgi varken `not_tablosu_ayristir` artık `hocayaSimdiSor: true` döndürüyor.
- Peşin onayda `obs_ders_listesi` rapor biçimini, `bologna_toplu_ozet` seçenek menüsünü göndermiyor.

### Uygulanan kararlar (2026-11-12)

- Madde 1: peşin onay yalnız kayıt ya da yetki sözüyle ("kaydet", "sen hallet", "tam yetki", "onaylıyorum").
- Madde 2: `olcmeGirdiSorunlari` (`packages/olcme/src/girdi.ts`); `ck_pc_hesapla` ve `/deneyin` ÇK paneli bozuk
  girdiyi hesaplamadan reddeder. `dersiOlc` ve `HESAP_SURUMU` değişmedi.
- Madde 3: `infra/coolify/docker-compose.yml`'de `web` artık `vt` ve `goc`'u beklemiyor.
- Madde 5: "her menüde 4) Hepsini akıllıca doldur" kuralı kalktı; yerine "varsayılan akıllı doldurmadır, alan alan menü
  sorulmaz" (`AKILLI_DOLDURMA_KURALI`). Tarama raporu seçenekleri tek kaynak: `TARAMA_SECENEKLERI` (`apps/acik-mcp/src/temel.ts`).
- Madde 6: web'deki beş istemci adresi kopyası `apps/web/src/guvenlik/istemci-adresi.ts`'te toplandı; sıra MCP ile aynı
  (`cf-connecting-ip` → `x-real-ip` → XFF'nin güvenilen vekil öğesi).
- Madde 8: barındırma kapalıyken oturumsuz panel `/kurum-demosu`'na yönlenir; panel şeridinde "Demodan çık" düğmesi
  (`/api/deneyin/cikis`); `/api/deneyin` form hatasında ham JSON yerine `/kurum-demosu?hata=hazir`.
- Madde 9: Mükerrer Frekans tanıtımı yalnız ana sayfada; DOM'da içeriğin önünde, klavyeyle ulaşılır, odak ötesine
  geçince kapanır.
- Madde 10: `/deneyin` ve `/kurum-demosu` `SAYFALAR`'da (başlık, açıklama, paylaşım kartı, yapısal veri);
  `/kurum-demosu` askıda olduğu için site haritasında yok.
- Madde 11: Bologna rehberi kodla aynı: K1, K10, K11 "araç denetlemez" diye işaretli, "farkındalık" uyarı, K12 eşiği
  koddaki gibi. `apps/acik-mcp/test/bologna-rehber-kod.test.ts` ikisinin ayrışmasını yakalar.
- Madde 12: tarayıcı isteyen Bologna yazma testi `yazma.tarayici.test.ts`'e ayrıldı; `pnpm test` tarayıcısız geçer,
  CI'da `test:tarayici` adımıyla koşmaya devam eder (94 + 4 = 98 test).
- Madde 20: gövde yazı tipi Lato 2.015 (yazarın LatoLatin web dosyaları, değiştirilmeden); ğ Ğ ş Ş İ artık Lato'dan.
- Ek: ana sayfa Chrome eklentisini "gerekli" adım olarak öne çıkarıyor; MCP tarayıcı yoksa önce eklenti kurulumunu öneriyor.

### Kesinti (2026-11-11/12)

- yarenler-01'in diski doldu (`No space left on device`); 611cb1c, 8c40d59 ve 3aa50e4 dağıtımları klonlamada düştü,
  site ve /mcp yaklaşık 40 dakika bakım sayfasında kaldı. Coolify "Docker Cleanup" ~3,3 GB derleme önbelleği ve
  eski imaj sildi; af9fe2c dağıtımı başarılı.
- Kök neden (terminalde doğrulandı): akredit veritabanı biriminde veri 75 MB, `pg_wal` 61 GB (3.864 dosya). Ayar
  dosyasındaki `archive_command '/yedek/wal-arsivle.sh'` Coolify'da bağlı olmayan yedek birimine dayanıyor; arşivleme
  hep başarısız olunca PostgreSQL WAL'ları silemedi, `archive_timeout=300` günde ~4,6 GB biriktirdi. Veritabanı
  `postmaster.pid` yazamayıp yeniden başlama döngüsünde. Bu kurulumun WAL yedeği hiç olmadı.
- Düzeltme: `infra/coolify/docker-compose.yml`'de veritabanı `archive_mode=off`, `archive_timeout=0` ile başlar;
  açılınca eski WAL'ları kendisi temizler. Elle WAL silinmez.

### Kurucu kararı gerekiyor (önem sırasıyla)

**Yüksek**

1. **Peşin onay hâlâ kayıt sözü olmadan açılıyor.** "hepsini tara", "otonom", "sormadan tara" onay sayılıyor.
   Öneri: `kaydet`, `sen hallet`, `tam yetki` ya da `onaylıyorum` zorunlu olsun. (review/1)
2. **`ck_pc_hesapla` bozuk girdiyi sessizce hesaplıyor.** Puan tam puandan büyükse başarı %150 çıkıyor; yinelenen
   satırda sonuncu kazanıyor; bilinmeyen soruya yazılan puan atılıp öğrenci 0 sayılıyor; aynı ÇK iki kez verilirse PÇ'ye
   iki kez giriyor. Düzeltmek hesabın çıktısını değiştirir. Öneri: bu girdiler reddedilsin. (review/4)
3. **Canlı Coolify dağıtımı askıdaki hizmetlere bağlı.** `web`, `vt` ve `goc`'a `depends_on` ile bağlı; `isci` de
   çalışıyor. Veritabanı düşerse site ve MCP de açılmaz. (review/5)
4. **`plan.md` ile İP dosyaları çelişiyor.** 22 İP tabloda "tamam", kendi dosyasında "inceleme". (review/5)
5. **"Her menüde 4) Hepsini akıllıca doldur" kuralı hiçbir gerçek menüye uymuyor**; tarama raporunun seçenekleri de
   istemde 3, araçta 4. Öneri: kural "varsayılan akıllı doldurmadır" olsun, seçeneklerin tek kaynağı araç. (review/1)

**Orta**

6. İstemci adresi: web'de beş kopya `cf-connecting-ip`'ye bakmıyor, MCP bakıyor. Tek yardımcıda toplanmalı. (review/3)
7. Barındırma kapalıyken `/api/kimlik/sign-in/*`, `/api/davet`, `/api/kurulum/*`, `/api/v1/*` bayrağa bakmıyor (hepsi
   oturum ya da jeton istiyor; demo bir kısmına muhtaç). En azından giriş uçları kapansın mı? (review/3)
8. Demo oturumu bitince askıdaki `/giris`'e düşüyor; "demodan çık" yok. Öneri: `/kurum-demosu`. (review/3)
9. Mükerrer Frekans tanıtımı KVKK ve `/deneyin` dahil her sayfada; ilk Sekme tuşunda kapandığı için klavyeyle
   bağlantıya ulaşılamıyor. Öneri: yalnız ana sayfa. (review/2)
10. `/deneyin` ve `/kurum-demosu` `SAYFALAR`'da yok: paylaşım kartı genel, yapısal veri yok. (review/2)
11. K kuralları ile rehber çelişiyor: K1 ve K11 kodda yok, K10 denetlenmiyor, "farkındalık" rehberde yasak kodda
    uyarı, CLI seti hâlâ 8-12 çıktı istiyor. (review/4)
12. Kararsız ve ortama bağlı testler: `servis` testi yük altında; `baglayicilar` Playwright testi tarayıcısız makinede
    kırmızı. Öneri: uçtan uca bloğu ayrı betiğe almak. (review/4)
13. CI hâlâ tam seti koşuyor; `yayin.yml` her itmede kullanılmayan imajı GHCR'ye yolluyor. (review/5)
14. Hukuk: sayfalar tarayıcı araçlarını ve tanıtım bağlantısını anmıyor; indirilen paket "TASLAK" iken sayfa
    "yayında"; iki yorumdaki "avukat incelemesinden geçti" ifadesinin dayanağı depoda yok. (review/2)
15. `degerlendirmeTeyitli` kapısı yalnız sayının kanıt metninde geçmesine bakıyor; kalem adı aranmıyor. (review/1)
16. Geri açmadan önce bağlanması gerekenler: `politikaIscisi`, `dersDosyasiIscisi`, virüs taraması ve OCR üretim
    işçisine kurulmamış; değerlendirici soru-cevabı hep 503. (review/3)
17. `pnpm audit --prod`: 2 orta, 1 düşük, hepsi geçişli (`esbuild`, `uuid`, `fast-xml-parser`). (review/5)
18. npm'de yayınlı sürüm 0.6.0 (0.5.0 değil); depo 0.8.0. Yayın insan işi. (review/5)
19. Terim: ana sayfa "Bağdaştırıcılar", `/mcp-kullan` ve MCP rehberi "Bağlayıcılar" diyor. (review/2)

20. **Gövde yazı tipinde Türkçe harf eksik (yüksek, görünür).** `@fontsource/lato` (Google'ın Lato 1.x'i) `ğ Ğ ş Ş İ`
    içermiyor; bu harfler bütün paragraflarda sistem yazı tipiyle çiziliyor. Başlıktaki Oswald tam. Seçenekler: Lato 2.0
    dosyalarını (OFL) depoya eklemek ya da gövdeyi Türkçe destekli bir yazı tipine (Source Sans 3, Noto Sans) çevirmek.

**Düşük** (parça dosyalarında): atıfsız ~1,6 MB görsel ve 12 MB ekran görüntüsü, yetim `packages/kiyaslama`, yalnız
testte geçen sabitler, `bologna_durum` aracının gerekliliği, sabitlenmemiş imaj etiketleri, çift Dockerfile, danışmanlık
notlarındaki yerel mutlak yollar, eksik çerçeve SHA kayıtları, `apps/cli`'deki aynı Türkçe karakter hatası.

### Bu dosyalar

`review.md` ve `review/` geçici inceleme kaydıdır. Kararlar verilince `docs/raporlar/` altına taşınabilir ya da
silinebilir.
