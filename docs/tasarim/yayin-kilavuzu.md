# Sıfırdan Site Yayınlama Kılavuzu

Bu belge; bir Git deposundaki web uygulamasını Hetzner VPS üzerinde Coolify ile çalıştırmak, alan adını Cloudflare üzerinden yönlendirmek, HTTPS açmak, otomatik dağıtım, yedekleme ve temel güvenliği kurmak için tekrar kullanılabilir bir devir belgesidir.

Belge hem teknik bilgisi olmayan site sahibi hem de işi devralan bir yapay zekâ ajanı için yazılmıştır. Projeye özel değerleri aşağıdaki tabloda doldurup belgeyi ajana verin.

> Güvenlik kuralı: Parola, API token'ı, SSH özel anahtarı, veritabanı parolası veya `.env` içeriği sohbete, Git deposuna, ekran görüntüsüne ya da görev raporuna yazılmaz. Kullanıcı bunları kendi bilgisayarındaki ayrı dosyalara kaydeder ve yalnızca dosya yolunu ajana verir.

## 1. Proje bilgi kartı

Kuruluma başlamadan önce bu alanları doldurun:

```text
PROJE_ADI=
GIT_REPOSU=https://github.com/KULLANICI/REPO
GIT_DALI=main
ALAN_ADI=ornek.com
WWW_KULLANILSIN_MI=evet
SUNUCU_SAGLAYICI=Hetzner
SUNUCU_IP=
COOLIFY_ADRESI=https://coolify.ornek.com
UYGULAMA_SAGLIK_UCU=/health
UYGULAMA_PORTU=
VERITABANI_TURU=
YEDEK_HEDEFI=
```

Bu bilgiler eksikse ajan yalnızca sonucu gerçekten değiştiren soruları sormalı; bilinen değerleri yeniden sormamalıdır.

## 2. Ajanın çalışma kuralları

Bu belgeyi alan ajan:

1. Önce depoyu ve mevcut altyapıyı salt okunur yöntemlerle inceler.
2. İşleme başlamadan önce servislerin güncel resmî belgelerini kontrol eder. Panel menüleri, API alanları ve kurulum komutları zamanla değişebilir.
3. Mümkün olan işlemlerde panel yerine resmî API veya CLI kullanır.
4. API token'ını geniş yetkili istemez; yalnızca yapılacak işlem için gereken en dar izinleri tarif eder.
5. Kullanıcıdan token değerini sohbete yapıştırmasını istemez. Örnek olarak `~/Desktop/proje-cloudflare-api.txt` gibi yerel bir dosyaya kaydetmesini ve yalnızca dosya yolunu vermesini ister.
6. Token'ı komut satırı çıktısında, işlem listesinde, logda veya Git geçmişinde göstermeden okur.
7. Her değişiklikten önce mevcut değeri okur. Güncellemede ilgisiz ayarları korur.
8. Silme, sunucuyu kapatma, disk büyütme, DNS'i başka hedefe taşıma veya erişim yetkisi değiştirme gibi geri dönüşü zor işlemlerde kesin hedefi doğrular.
9. Bir API işlemi başarısız olursa önce hata kodunu ve eksik izni belirler; kullanıcıdan Global API Key istemez.
10. “İstek gönderildi”yi başarı saymaz. DNS, TLS, uygulama sağlığı ve dışarıdan erişimi ayrıca doğrular.
11. Yapılan değişiklikleri, değiştirilmeyen kritik alanları ve geri alma yolunu kısa bir raporla teslim eder.

## 3. Kurulum sırası

Sıra önemlidir:

```text
Git deposu
  → Hetzner VPS
  → SSH ve temel güvenlik
  → Coolify
  → Uygulama ve veritabanı
  → Cloudflare bölgesi ve DNS
  → Alan adı kayıt kuruluşunda nameserver
  → HTTPS / TLS
  → Otomatik dağıtım
  → Yedekleme ve izleme
  → Dışarıdan kabul testleri
```

DNS'i, uygulama sunucuda sağlıklı çalışmadan önce üretim sunucusuna yönlendirmeyin.

## 4. Gerekli hesaplar

Kullanıcı aşağıdaki hesaplara sahip olmalıdır:

- GitHub veya kullanılan Git sağlayıcısı
- Hetzner Cloud
- Cloudflare
- Alan adı kayıt kuruluşu
- Yedeklerin tutulacağı S3 uyumlu depolama hizmeti

İki aşamalı doğrulama mümkün olan bütün hesaplarda açılmalıdır. Kurtarma kodları parola yöneticisinde saklanmalıdır.

## 5. Git deposunu hazırlama

### Kullanıcının yapacağı işler

1. GitHub'da projeyi açın.
2. Kodun doğru dalda bulunduğunu kontrol edin.
3. Özel depo kullanılacaksa Coolify'ın depoya erişebilmesi için GitHub App veya salt-okunur deploy key bağlantısına izin verin.

### Ajanın kontrol edeceği işler

- Çalıştırma yöntemi açık mı: `Dockerfile`, `docker-compose.yml`, Nixpacks veya build/start komutları?
- `.env`, özel anahtar, token ve üretim verisi `.gitignore` içinde mi?
- Uygulama `0.0.0.0` üzerinde dinliyor mu?
- Sağlık ucu var mı ve bağımlılıklar hazır değilse doğru hata kodunu veriyor mu?
- Veritabanı migration işlemi tekrar çalıştırılabilir mi?
- Üretim bağımlılıkları sabitlenmiş mi?
- Testler geçiyor mu?

Önerilen asgari uç:

```text
GET /health
200: uygulama ve zorunlu bağımlılıklar hazır
503: uygulama çalışıyor fakat zorunlu bir bağımlılık hazır değil
```

## 6. Hetzner VPS oluşturma

### Kullanıcının yapacağı işler

1. `https://console.hetzner.cloud` adresinde bir proje oluşturun.
2. **Add Server** seçin.
3. Kullanıcı kitlenize yakın bir konum seçin.
4. Coolify'ın güncel resmî gereksinimlerini karşılayan desteklenen Ubuntu LTS sürümünü seçin.
5. Uygulamaya uygun sunucu boyutunu seçin. Küçük bir site için başlangıç boyutu seçilebilir; tarayıcı otomasyonu, görsel işleme veya büyük Docker imajları kullanılıyorsa daha geniş disk ve RAM gerekir.
6. Parola yerine SSH public key ekleyin.
7. Sunucu adını proje adıyla ilişkilendirin.
8. Sunucuyu oluşturun ve IPv4 adresini proje bilgi kartına yazın.

### Ağ güvenliği

Hetzner Firewall oluşturun. Yalnızca gerçekten gereken girişleri açın:

- SSH: tercihen yalnızca yönetici IP adreslerinden
- HTTP: TCP 80, herkese açık
- HTTPS: TCP 443, herkese açık
- Coolify'ın güncel resmî kurulumunun açıkça gerektirdiği diğer portlar

Rastgele yönetim, veritabanı veya Docker portlarını internete açmayın. PostgreSQL, Redis ve benzeri servisler yalnızca özel Docker ağı üzerinden erişilebilir olmalıdır.

## 7. SSH ve sunucu hazırlığı

Ajan önce sunucunun kimliğini ve işletim sistemini kontrol eder:

```bash
ssh root@SUNUCU_IP
cat /etc/os-release
df -h /
free -h
```

Ardından:

- Sistem güncellemelerini uygular.
- Saat dilimini ve NTP durumunu kontrol eder.
- SSH anahtar erişimini doğrulamadan parola girişini kapatmaz.
- Güvenlik duvarı değişikliğinden önce mevcut SSH oturumunu açık tutar.
- Disk doluluğu ve inode kullanımını kaydeder.

Coolify ana sunucuyu yöneteceği için Docker'ı veya ağ kurallarını gelişigüzel değiştirmeyin. Aynı işi yapan iki otomatik güvenlik/temizlik sistemi kurmayın.

## 8. Coolify kurulumu

Kurulumdan hemen önce `https://coolify.io/docs` üzerindeki güncel self-hosted kurulum talimatını kullanın. Eski blog yazılarındaki kurulum komutlarını kopyalamayın.

### Kullanıcının yapacağı işler

1. Kurulum tamamlandıktan sonra verilen Coolify adresini açın.
2. İlk yönetici hesabını oluşturun.
3. İki aşamalı doğrulamayı açın.
4. Coolify için `coolify.ornek.com` gibi ayrı bir alt alan adı belirleyin.

### Ajanın yapacağı işler

- Sunucunun Coolify'da **reachable/validated** olduğunu doğrular.
- Proxy'nin çalıştığını kontrol eder.
- Proje ve `production` ortamını oluşturur.
- Git kaynağını bağlar.
- Uygulamayı oluşturur; dalı, build yöntemi, port ve sağlık kontrolünü ayarlar.
- Uygulama sırlarını Coolify ortam değişkenlerinde **secret** olarak kaydeder.
- Veritabanı varsa kalıcı volume ve iç ağ bağlantısını kurar.

### Coolify API token'ı

Panel işlemleri yerine API kullanılacaksa kullanıcıya şu yönerge verilir:

1. Coolify → profil/ayarlar → **API Tokens** bölümünü açın.
2. Yalnızca gerekli kaynak ve işlemleri kapsayan token oluşturun.
3. Token'ı `~/Desktop/proje-coolify-api.txt` dosyasına kaydedin.
4. Sohbete token'ı değil yalnızca dosya yolunu yazın.

Dosya biçimi:

```text
COOLIFY_URL=https://coolify.ornek.com
COOLIFY_API_TOKEN=buraya_token
```

Ajan token'ı önce zararsız bir listeleme/kimlik uç noktasında doğrular. HTTPS olmayan bir Coolify adresine token göndermez.

## 9. Coolify uygulama ayarları

Her uygulama için en az şunları tanımlayın:

- Kaynak depo ve dal
- Build yöntemi
- Container'ın dinlediği port
- Alan adı: `https://ornek.com`
- Sağlık kontrolü: örneğin `/health`
- Restart politikası
- CPU, RAM ve disk beklentisi
- Üretim ortam değişkenleri
- Kalıcı dizinler/volume'lar
- Migration veya başlangıç komutu

Sırlar Git deposuna yazılmaz. Örnek değerler `.env.example` içinde açıklanabilir fakat gerçek değer bulunmaz.

İlk dağıtımda alan adı bağlanmadan önce Coolify'ın geçici adresi veya sunucu içi sağlık kontrolüyle uygulamanın çalıştığı doğrulanır.

## 10. Alan adını Cloudflare'a ekleme

### Kullanıcının yapacağı işler

1. Cloudflare Dashboard → **Add a domain** seçin.
2. Alan adını uzantısıyla yazın: `ornek.com`.
3. Uygun planı seçin.
4. Cloudflare'ın verdiği iki nameserver adresini kopyalayın.
5. Alan adını satın aldığınız kayıt kuruluşunda **Nameserver / Ad Sunucuları** bölümünü açın.
6. Eski nameserver'ları Cloudflare'ın verdiği iki adresle değiştirin.
7. DNSSEC daha önce açıksa geçiş sırasında eski DS kaydını kontrol edin; yanlış DS kaydı alan adını erişilemez yapabilir.

Nameserver yayılımı dakikalar veya saatler sürebilir. Sürekli yeni değişiklik yapmayın; yetkili DNS cevabını ölçün.

## 11. Cloudflare API token'ı oluşturma

Global API Key kullanmayın. Her proje için ayrı, alan adıyla sınırlandırılmış token oluşturun.

Kullanıcıya şu adımları verin:

1. Cloudflare profil menüsü → **API Tokens**.
2. **Create Token** → **Create Custom Token**.
3. Token adı: `PROJE_ADI altyapı kurulumu`.
4. Aşağıdaki izinlerden yalnızca yapılacak işlemler için gerekenleri ekleyin.
5. **Zone Resources** → **Include** → **Specific zone** → ilgili alan adını seçin.
6. Mümkünse token'a makul bir bitiş tarihi verin.
7. Özeti kontrol edip token'ı oluşturun.
8. Token'ı `~/Desktop/proje-cloudflare-api.txt` dosyasına kaydedin ve ajana yalnızca dosya yolunu verin.

Örnek dosya:

```text
CLOUDFLARE_API_TOKEN=buraya_token
```

### İşleme göre gereken Cloudflare izinleri

| İşlem | En dar izin |
|---|---|
| Bölgeyi kimliğiyle bulma | Zone → Zone → Read |
| DNS kayıtlarını okuma | Zone → DNS → Read |
| DNS kaydı oluşturma/değiştirme | Zone → DNS → Edit |
| SSL ve HTTPS ayarları | Zone → Zone Settings → Edit |
| Bot/AI robots ayarı | Zone → Bot Management → Edit |
| Bot ayarını önce okumak | Zone → Bot Management → Read veya Edit |
| Önbellek temizlemek | Zone → Cache Purge → Purge |

Cloudflare arayüzünde `Edit` bazı hesaplarda `Write` olarak görünebilir. Ajan güncel resmî izin listesini kontrol etmelidir.

Token şu sırayla kullanılır:

1. Token etkin mi?
2. Yalnızca hedef bölge görülebiliyor mu?
3. Mevcut ayar/DNS kaydı nedir?
4. Gerekli en küçük değişiklik uygulanabilir mi?
5. Değer API'den tekrar okunarak doğrulanabilir mi?

## 12. DNS kayıtları

Tipik yapı:

| Tür | Ad | Hedef | Proxy |
|---|---|---|---|
| A | `@` | Hetzner IPv4 | Açık |
| CNAME | `www` | `ornek.com` | Açık |
| A veya CNAME | `coolify` | Sunucu IP/ana alan | Gereksinime göre |

Sunucuda çalışan bir IPv6 yapılandırması yoksa sırf görünmesi için AAAA kaydı eklemeyin. Yanlış AAAA kaydı bazı ziyaretçileri bozuk hedefe yönlendirir.

E-posta kullanılıyorsa MX, SPF, DKIM ve DMARC kayıtlarını değiştirmeden önce mevcut kayıtları yedekleyin. Web sitesi kurulumu e-posta DNS kayıtlarını silmek için gerekçe değildir.

## 13. TLS ve HTTPS

Önerilen son durum:

- Cloudflare SSL/TLS modu: **Full (strict)**
- Origin tarafında geçerli sertifika
- **Always Use HTTPS** açık
- **Automatic HTTPS Rewrites** yalnızca uygulamayla uyumluysa açık
- HTTP → HTTPS tek yönlendirme
- `www` için seçilen kanonik adrese tek yönlendirme

`Flexible` SSL kullanmayın; yönlendirme döngülerine ve origin bağlantısının şifresiz kalmasına yol açabilir.

HSTS'yi ancak HTTPS bütün alt alanlarda düzgün çalıştıktan sonra açın. `includeSubDomains` ve `preload` geri dönüşü zor kararlardır; otomatik açılmamalıdır.

## 14. Cloudflare AI botları ve robots.txt

Önce ürün hedefini açıkça seçin:

- Arama motorlarında ve yapay zekâ yanıtlarında bulunmak mı?
- Eğitime izin vermeden yalnızca arama/atıf erişimi mi?
- Bütün AI tarayıcılarını engellemek mi?

Cloudflare yönetilen `robots.txt` özelliği origin'in dosyasının önüne ek içerik koyabilir. Bu nedenle canlı dosya mutlaka dışarıdan okunmalıdır:

```bash
curl -fsS https://ornek.com/robots.txt
```

Site kendi `robots.txt` dosyasını yönetiyorsa ve Cloudflare'ın ek bloğu çelişiyorsa API ile hedef bölgenin mevcut Bot Management ayarı okunur. Kullanıcının seçimine göre yalnızca ilgili alanlar değiştirilir:

```json
{
  "is_robots_txt_managed": false,
  "bot_preference_sync_enabled": false,
  "cf_robots_variant": "off"
}
```

Bu örnek otomatik uygulanacak evrensel tercih değildir. Yalnızca site kendi politikasını origin `robots.txt` üzerinden yönetmek istiyorsa kullanılır. WAF/bot engelleme ile gönüllü `robots.txt` kuralları birbirinden farklıdır.

## 15. Otomatik dağıtım

Önerilen akış:

```text
main dalına doğrulanmış push
  → Git sağlayıcısı webhook'u
  → Coolify build
  → sağlık kontrolü
  → yeni container'a trafik
  → eski container'ın güvenli biçimde kaldırılması
```

Kurallar:

- Pull request testleri geçmeden üretime otomatik dağıtım yapılmamalı.
- Migration geriye dönük uyumlu olmalı.
- Aynı commit için birden fazla dağıtım kuyruğu oluşturulmamalı.
- Sağlıksız yeni sürüm eski sağlıklı sürümün yerini almamalı.
- Dağıtım sonunda çalışan commit kimliği doğrulanmalı.

## 16. Docker disk yönetimi

Önce ölçün:

```bash
df -h /
df -ih /
docker system df
docker ps --format '{{.Names}}\t{{.Status}}'
```

Coolify'ın kendi **Server → Docker Cleanup** özelliği tercih edilir. Güvenli varsayılan temizlik:

- Kullanılmayan imajlar
- Build cache
- Coolify tarafından yönetilen durmuş container'lar

Kalıcı volume ve ağ temizliği varsayılan olarak kapalı kalmalıdır. `docker volume prune`, veritabanı verisini geri getirilemez biçimde silebilir.

Temizlikten sonra disk hâlâ yetersizse:

1. En çok alan kullanan dizinleri ölçün.
2. Log büyümesini ve Docker katmanlarını inceleyin.
3. Yedeklerin aynı diski doldurmadığını kontrol edin.
4. Hetzner volume eklemek ile ana diski büyütmek arasındaki farkı belirleyin.
5. Disk/partition/filesystem büyütme adımlarını sunucu imajına göre güncel Hetzner belgesiyle doğrulayın.

Disk büyütme veri kaybı riski taşıdığı için otomatik varsayım yapılmaz; yedek ve kesin disk aygıtı doğrulanır.

## 17. Veritabanı ve kalıcı dosyalar

- Veritabanı container katmanında tutulmaz; kalıcı volume kullanılır.
- Veritabanı portu internete açılmaz.
- Parolalar Coolify secret değişkenlerinde tutulur.
- Migration dağıtımdan önce veya kontrollü başlangıç adımında çalıştırılır.
- Kullanıcı yüklemeleri kalıcı depoda veya nesne depolamada tutulur.
- Volume adı, mount yolu ve sahipliği devir belgesinde yazılı olmalıdır.

## 18. Yedekleme

Yedek alınmamış sistem tamamlanmış sayılmaz.

Asgari plan:

- Veritabanı: günlük
- Kullanıcı dosyaları: günlük veya değişim sıklığına göre
- Coolify yapılandırması: düzenli
- Saklama: örneğin 7 günlük + 4 haftalık + 6 aylık
- Hedef: sunucudan bağımsız S3 uyumlu depo
- Şifreleme: aktarımda ve depoda
- Geri yükleme testi: en az üç ayda bir

Başarılı yedek kaydı geri yüklenebilirlik kanıtı değildir. Ajan geçici bir hedefe geri yükleme testi tasarlamalıdır.

## 19. İzleme ve bakım

En az şunlar izlenmelidir:

- `/health` yanıtı
- HTTP durum kodları ve yanıt süresi
- TLS sertifika süresi
- Disk doluluğu ve inode
- RAM ve swap baskısı
- Container restart sayısı
- Veritabanı yedeklerinin yaşı
- Coolify dağıtım başarısızlıkları

Bildirimler yalnızca anlamlı değişiklikte gönderilmelidir; sürekli aynı “her şey yolunda” mesajı üretilmemelidir.

Bakım takvimi:

- Haftalık: başarısız dağıtım ve restart kontrolü
- Aylık: güvenlik güncellemeleri, disk ve yedek kontrolü
- Üç aylık: geri yükleme testi, API token ve erişim denetimi
- Yıllık: alan adı, sunucu, depolama ve sertifika yenileme kontrolleri

## 20. Dışarıdan kabul testleri

Kurulum aşağıdakiler doğrulanmadan tamamlandı denmez:

```bash
curl -fsSI https://ornek.com/
curl -fsS https://ornek.com/health
curl -fsS https://ornek.com/robots.txt
curl -fsS https://ornek.com/sitemap.xml
```

Kontrol listesi:

- Alan adı doğru sunucuya çözülüyor.
- HTTP, HTTPS'e tek adımda yönleniyor.
- TLS sertifikası alan adıyla eşleşiyor.
- Ana sayfa ve sağlık ucu 200 dönüyor.
- `www` davranışı kanonik alan adıyla uyumlu.
- Güvenlik başlıkları uygulamanın ihtiyacına uygun.
- Gizli dosyalar (`/.env`, `/.git/`) erişilemiyor.
- Veritabanı ve yönetim portları internetten kapalı.
- Canlı sürüm beklenen Git commit'ini çalıştırıyor.
- `robots.txt` Cloudflare ve origin politikasını çelişkili sunmuyor.
- Sitemap gerçek, kanonik ve erişilebilir URL'ler içeriyor.
- Yedek çalışıyor ve son başarılı çalışma zamanı görülüyor.

## 21. Yaygın sorunlar

### Cloudflare 522

- DNS yanlış IP'ye bakıyor olabilir.
- Sunucu kapalı veya proxy çalışmıyor olabilir.
- Firewall Cloudflare trafiğini engelliyor olabilir.
- Uygulama yalnızca localhost üzerinde dinliyor olabilir.

### Yönlendirme döngüsü

- Cloudflare SSL modu `Flexible` olabilir.
- Origin ve Cloudflare birbirini ters yönlendiriyor olabilir.
- Uygulama proxy başlıklarına güvenmiyor olabilir.

### Sertifika çıkmıyor

- DNS henüz yayılmamış olabilir.
- A/AAAA kayıtlarından biri yanlış olabilir.
- 80/443 kapalı olabilir.
- Coolify alan adı yapılandırması yanlış olabilir.

### Docker build sırasında “no space left” veya layer extract hatası

- `df -h`, `df -ih` ve `docker system df` ölçülür.
- Coolify Docker Cleanup çalıştırılır.
- Kullanılmayan image/build cache ve durmuş container'lar temizlenir.
- Volume'lar açık kullanıcı onayı ve yedek olmadan silinmez.

### Cloudflare API bölgeyi bulamıyor

Token'a hedef alan adıyla sınırlı **Zone → Zone → Read** ekleyin. DNS veya Bot Management izni tek başına bölge listesini göstermeyebilir.

### Dağıtım kuyruğu ilerlemiyor

- Aynı kaynak için mükerrer kuyruklar kontrol edilir.
- Eski takılı iş güvenle iptal edilir.
- Coolify worker, disk, Docker daemon ve build logları incelenir.
- Sağlıklı çalışan mevcut container durdurulmaz.

## 22. Geri alma planı

Her değişiklik için geri dönüş noktası bulunmalıdır:

- DNS: önceki kayıtların JSON veya ekran dışa aktarımı
- Uygulama: son sağlıklı commit ve image
- Veritabanı: migration öncesi yedek
- Cloudflare: güncelleme öncesi ayar cevabı
- Coolify: eski sağlıklı deployment
- Sunucu: büyük yükseltme öncesi snapshot

Rollback sonrasında da sağlık ve veri bütünlüğü test edilir.

## 23. İş bitiminde teslim edilecek rapor

Ajan aşağıdaki biçimde rapor vermelidir:

```markdown
## Sonuç
- Canlı adres:
- Çalışan sürüm/commit:
- Sağlık durumu:

## Yapılanlar
- Sunucu:
- Coolify:
- Cloudflare/DNS:
- TLS:
- Yedekleme:

## Özellikle dokunulmayanlar
- Veritabanı volume'ları:
- E-posta DNS kayıtları:
- Diğer projeler:

## Kullanıcının saklaması gerekenler
- Kurtarma kodlarının yeri:
- Token dosyalarının yeri:
- Yedek hedefi:

## Açık işler
- İş, gerekçe ve kesin sonraki adım
```

Token değerleri, parolalar, özel IP kısıtları ve tam `.env` içeriği rapora yazılmaz.

## 24. Başka bir yapay zekâya verilecek başlangıç promptu

Aşağıdaki metni bu dosyayla birlikte kullanın:

```text
Bu projeyi sıfırdan güvenli biçimde yayına almanı veya mevcut kurulumu denetleyip tamamlamanı istiyorum. Önce siteyarat.md dosyasını eksiksiz oku ve oradaki sıraya uy.

Mümkün olan işlemleri resmî API/CLI ile kendin yap. Benden parola veya token'ı sohbete yapıştırmamı isteme. Gereken her servis için en dar API token izinlerini, panelde hangi menüden oluşturacağımı ve token'ı bilgisayarımda hangi örnek TXT dosyasına kaydedeceğimi tarif et; benden yalnızca dosya yolunu iste.

Önce mevcut durumu salt okunur yöntemlerle ölç. İlgisiz ayarları, başka projeleri, çalışan container'ları, veritabanı volume'larını ve e-posta DNS kayıtlarını değiştirme. Her değişiklikten sonra API'den ve dışarıdan doğrulama yap. Bir işlemi yalnızca başlatmış olmayı tamamlanmış sayma.

Teknik bilgim olmadığını varsay. Benim zorunlu olarak yapmam gereken panel veya ödeme adımlarını tam URL, menü, düğme ve alan adıyla numaralı biçimde anlat. Güvenli biçimde kendin yapabileceğin işlemleri bana devretme.

Kurulum sonunda canlı adresi, sağlık durumunu, çalışan sürümü, yedeklemeyi, dokunmadığın kritik kaynakları ve gerçekten kalan işleri kısa bir raporla teslim et.
```

## 25. Son güvenlik notları

- Her proje için ayrı token kullanın.
- Global API Key kullanmayın.
- Kurulum token'larını iş bittikten sonra iptal edin veya yetkilerini daraltın.
- Token dosyalarını Git deposunun dışında tutun.
- Yerel token dosyalarının izinlerini yalnızca kullanıcı okuyabilecek şekilde sınırlandırın.
- SSH özel anahtarını hiçbir servise yüklemeyin; yalnızca public key paylaşılır.
- Üretim verisini hata ayıklama amacıyla üçüncü taraf servislere göndermeyin.
- “Her şeyi yönetebilir” türü kalıcı token yerine kısa ömürlü ve kaynakla sınırlı token tercih edin.
- Başarı iddiasını her zaman bağımsız sağlık, DNS ve TLS kontrolüyle destekleyin.

