# Açık MCP için ters vekilde hız sınırı (İP-49)

Herkese açık MCP ucu (`/mcp`, `apps/acik-mcp`) hesapsızdır. Uygulamanın kendi hız sınırı vardır ama asıl koruma ters vekilde kurulmalıdır. Bu not neden gerektiğini, hangi değerlerin kullanılacağını ve iki dağıtım yolunda (Coolify ve `infra/uretim` Caddy) nasıl kurulacağını anlatır.

## Neden vekilde de

| Uygulamadaki sınır | Sonuç |
|---|---|
| Kova süreç içi bellektedir (`apps/acik-mcp/src/http.ts`, `AdresKovasi`). | Birden çok web kopyası varsa her kopya ayrı sayar; yeniden başlatma kovaları sıfırlar. |
| İstemci adresi `x-forwarded-for` başlığının **ilk** öğesinden alınır. | Vekil bu başlığı kendisi yazmazsa istemci başlığı uydurup sınırı aşar. |
| Sınır, Node isteği okuyup ayrıştırdıktan sonra uygulanır. | Yoğun saldırıda yük web sürecine kadar gelir. |

Uygulamadaki sınır kalır (ikinci savunma hattı); vekildeki sınır ondan biraz gevşek olmamalı, aynı ya da daha sıkı olmalıdır.

## Değerler

Uygulamanın varsayılanı: adres başına 60 isteklik kova, saniyede 1 dolum (dakikada ortalama 60, anlık en çok 60). Vekilde aynısı önerilir:

- Yalnız `POST /mcp` ve `OPTIONS /mcp` için (sitenin geri kalanını etkilemez).
- Anahtar: istemcinin gerçek IP adresi (vekilin gördüğü bağlantı adresi; dışarıdan gelen `X-Forwarded-For` değil).
- Ortalama dakikada 60 istek, patlama 60. Aşımda `429`.
- Gövde sınırı: 512 KB (uygulamayla aynı).

## Başlık güvenliği (her iki yolda zorunlu)

Vekil, istemciden gelen `X-Forwarded-For` başlığını atıp bağlantı adresini yazmalıdır. Aksi hâlde uygulamanın kovası istemcinin uydurduğu adrese göre sayar.

- Caddy 2: `reverse_proxy`, `trusted_proxies` ayarlanmadıkça istemciden gelen `X-Forwarded-*` başlıklarını yok sayar ve bağlantı adresini yazar. `infra/uretim/Caddyfile` bu ayarı içermez, yani varsayılan doğru davranıştır. `trusted_proxies` eklenirse (ör. önüne CDN konursa) bu not yeniden gözden geçirilmelidir.
- Traefik (Coolify): giriş noktasında `forwardedHeaders.insecure` kapalıysa ve `forwardedHeaders.trustedIPs` boşsa dışarıdan gelen `X-Forwarded-For` yok sayılır. Coolify'ın Traefik yapılandırmasında bu ayarın durumu **DOĞRULANMADI**; sunucuda denetlenmeli.

Deneme (kurulumdan sonra, sunucu dışından):

```bash
# Uydurma başlıkla 70 istek: 60'tan sonrası 429 dönmeli. Başlık sınırı aşmaya yetmemeli.
for i in $(seq 70); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST https://akredit.org/mcp \
    -H 'content-type: application/json' -H "x-forwarded-for: 10.0.0.$i" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
done | sort | uniq -c
```

## Coolify (Traefik)

Coolify, hizmet etiketlerine Traefik ara katmanı eklemeye izin verir (hizmet ayarlarında "Container Labels"). `/mcp` için ayrı bir yönlendirici ve `ratelimit` ara katmanı:

```text
traefik.http.middlewares.acik-mcp-hiz.ratelimit.average=60
traefik.http.middlewares.acik-mcp-hiz.ratelimit.period=1m
traefik.http.middlewares.acik-mcp-hiz.ratelimit.burst=60
traefik.http.middlewares.acik-mcp-govde.buffering.maxRequestBodyBytes=524288
traefik.http.routers.acik-mcp.rule=Host(`akredit.org`) && Path(`/mcp`)
traefik.http.routers.acik-mcp.entrypoints=https
traefik.http.routers.acik-mcp.tls=true
traefik.http.routers.acik-mcp.priority=100
traefik.http.routers.acik-mcp.middlewares=acik-mcp-hiz,acik-mcp-govde
traefik.http.routers.acik-mcp.service=<Coolify'ın web için ürettiği hizmet adı>
```

Etiket adları Traefik v3 belgesine göredir; Coolify'ın giriş noktası adı (`https`), hizmet adı ve etiketlerin Coolify sürümüyle birleşimi **DOĞRULANMADI**. Uygulamadan önce Coolify'da hizmetin mevcut etiketleri okunmalı, yönlendirici adları onlarla çakışmamalıdır.

## infra/uretim (Caddy)

Standart Caddy imajında hız sınırı yoktur. İki yol:

1. **Önerilen:** Caddy'yi hız sınırı eklentisiyle derlemek (`xcaddy build --with github.com/mholt/caddy-ratelimit`). Eklentinin sürümü ve lisansı (Apache-2.0 olduğu belirtiliyor) kurulumdan önce kaynağından **DOĞRULANMALI**; imaj özeti `infra/uretim/surumler.env`'e sabitlenmeli. Örnek blok (`{$AKREDIT_ALAN}` sitesine, `reverse_proxy`'den önce):

   ```caddy
   {
   	order rate_limit before reverse_proxy
   }

   @acikMcp path /mcp
   handle @acikMcp {
   	request_body {
   		max_size 512KB
   	}
   	rate_limit {
   		zone acik_mcp {
   			key {remote_host}
   			events 60
   			window 1m
   		}
   	}
   	reverse_proxy web:3000
   }
   ```

2. Eklentisiz geçici yol: yalnız gövde sınırı (`request_body max_size 512KB`) Caddy'de, adres başına sınır uygulamada kalır. Bu durumda web tek kopya çalışmalıdır.

`{remote_host}` bağlantı adresidir; `X-Forwarded-For`'a dayanmaz.

## İzleme

Uygulama her istekte yalnız zaman, yöntem, araç adı, süre, boyut ve durum yazar (`olay: "acik_mcp"`). `429` oranı gözlem panosunda izlenebilir (`docs/isletim/gozlem.md`). İçerik günlüğe yazılmaz.
