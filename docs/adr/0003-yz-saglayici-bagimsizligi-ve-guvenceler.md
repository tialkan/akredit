# ADR-0003: YZ sağlayıcısından bağımsızlık ve kodla uygulanan güvenceler

- Durum: kabul edildi (2026-10-23)

## Bağlam

Kurumlar verinin yurt içinde kalmasını ister. EVREN gibi yurt içi kamu altyapıları ve kurumların kendi açık ağırlıklı model sunucuları OpenAI uyumlu uç sunar. Bazı kurumlar yurt dışı sağlayıcılara izin verebilir. Akreditasyon metninde uydurma kabul edilemez.

## Karar

- `@akredit/yz` ince bir sağlayıcı arayüzü tanımlar: sohbet, yapılandırılmış çıktı, gömme. Bağdaştırıcılar: OpenAI uyumlu ve Anthropic. SDK yerine `fetch` kullanılır.
- Sağlayıcı ve model kurum ayarıdır. Yurt dışı sağlayıcı kurum izni olmadan çağrılmaz, çağrıldığında kişisel veri maskelenir.
- Atıf doğrulama, sayı denetimi, şema doğrulama, istem enjeksiyonu kalkanı ve araç yetki düzeyleri modelden bağımsız, kodla uygulanır.
- Model hiçbir zaman karar kaydı oluşturamaz. Karar yalnız kişi ya da kişinin imzaladığı yetki politikasıyla oluşur.

## Sonuçlar

- Daha zayıf yerel modellerde kalite düşebilir. Bunu değerlendirme düzeneği ölçer, eşiği geçmeyen görev "insan gerekli" olarak düşer.
