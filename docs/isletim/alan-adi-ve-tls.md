# akredit.org: alan adı, TLS ve e-posta

Alan adı ve DNS yönetimi kullanıcıdadır (İP-26 notları). Bu belge girilecek kayıtları verir. **Bu İP'de DNS kaydı girilmedi; aşağıdaki değerler şablondur.** `SUNUCU_IPV4`/`SUNUCU_IPV6` üretim sunucusunun adresleridir.

## Alt alan adları

| Ad | Kullanım | Hizmet |
|---|---|---|
| `akredit.org` | Tanıtım sitesi | web |
| `www.akredit.org` | `akredit.org`'a kalıcı yönlendirme | Caddy |
| `uygulama.akredit.org` | Uygulama paneli | web |
| `belgeler.akredit.org` | Belgeler (şimdilik tanıtım sitesine yönlendirir) | Caddy |
| `durum.akredit.org` | Durum sayfası | gatus |
| `hazirlik.akredit.org` (+ `*.hazirlik`) | Hazırlık ortamı | hazırlık sunucusu |

Hazırlık ortamı için `ornek.env`'deki alan adları `hazirlik.akredit.org`, `uygulama.hazirlik.akredit.org` vb. olarak verilir.

## DNS kayıtları

```
; Üretim
akredit.org.              300  A      SUNUCU_IPV4
akredit.org.              300  AAAA   SUNUCU_IPV6        ; IPv6 varsa
www.akredit.org.          300  CNAME  akredit.org.
uygulama.akredit.org.     300  CNAME  akredit.org.
belgeler.akredit.org.     300  CNAME  akredit.org.
durum.akredit.org.        300  CNAME  akredit.org.
; Hazırlık
hazirlik.akredit.org.     300  A      HAZIRLIK_IPV4
*.hazirlik.akredit.org.   300  CNAME  hazirlik.akredit.org.

; Sertifika yetkisi: yalnız Let's Encrypt sertifika verebilir
akredit.org.              3600 CAA    0 issue "letsencrypt.org"
akredit.org.              3600 CAA    0 iodef "mailto:GUVENLIK_EPOSTA"
```

Kurulum oturduktan sonra TTL 3600'e çıkarılabilir. Taşıma öncesinde 300'e indirilir.

Doğrulama:

```bash
dig +short akredit.org A
dig +short uygulama.akredit.org
dig +short akredit.org CAA
```

## TLS

- Caddy, `infra/uretim/Caddyfile`'daki her alan adı için Let's Encrypt sertifikasını kendisi alır ve yeniler (HTTP-01/TLS-ALPN-01; 80 ve 443 açık olmalı). Sertifikalar `caddy-veri` biriminde kalır.
- HSTS bir yıl, `includeSubDomains`. **HSTS ön yükleme (preload) listesine başvuru yapılmadı**; bütün alt alanlar HTTPS'e kesin geçtikten sonra karar verilmeli (geri alınması aylar sürer).
- Sertifika süresi Gatus'ta izlenir (`[CERTIFICATE_EXPIRATION] > 336h`, yani 14 gün) ve `TlsSertifikasiBitiyor` uyarısı vardır.
- Doğrulama: `curl -sSI https://akredit.org` ve https://www.ssllabs.com/ssltest/ ile en az A notu.

## E-posta (SPF, DKIM, DMARC)

Uygulama e-postası (davet, hatırlatma, uyarı) bir SMTP sağlayıcısıyla gönderilir. Sağlayıcı seçimi kullanıcıdadır; kişisel veri içerdiği için sağlayıcının veri konumu [yurt-disi-aktarim.md](../hukuk/yurt-disi-aktarim.md) açısından değerlendirilmelidir.

Gönderen adres önerisi: `bildirim@akredit.org`. Kayıtlar (sağlayıcının verdiği değerlerle doldurulur):

```
; SPF: yalnız seçilen sağlayıcı gönderebilir; diğerleri reddedilir
akredit.org.                       3600 TXT  "v=spf1 include:SAGLAYICI_SPF_ALANI -all"
; DKIM: sağlayıcı panelinden alınan seçici ve açık anahtar
SECICI._domainkey.akredit.org.     3600 TXT  "v=DKIM1; k=rsa; p=SAGLAYICI_ACIK_ANAHTARI"
; DMARC: önce izleme, 2-4 hafta rapor temizse quarantine, sonra reject
_dmarc.akredit.org.                3600 TXT  "v=DMARC1; p=none; rua=mailto:dmarc@akredit.org; adkim=s; aspf=s"
```

Alan adından e-posta **gönderilmeyecekse** bile sahteciliği önlemek için: `v=spf1 -all` ve `v=DMARC1; p=reject;` yazılır.

DMARC aşamaları:

1. `p=none`: raporları (rua) 2-4 hafta izle; yalnız sağlayıcı geçiyor olmalı.
2. `p=quarantine; pct=100`
3. `p=reject`

Doğrulama: `dig +short TXT akredit.org`, `dig +short TXT _dmarc.akredit.org`; bir deneme e-postasının başlığında `spf=pass dkim=pass dmarc=pass`.
