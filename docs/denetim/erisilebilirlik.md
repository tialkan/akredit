# Erişilebilirlik denetimi (İP-31)

Tarih: 2026-10-27. Hedef: WCAG 2.2 AA.

## Otomatik denetim (CI'da)

| Test | Kapsam |
|---|---|
| `apps/web/e2e/erisilebilirlik.spec.ts` | axe-core, `apps/web/e2e/sayfalar.ts`'teki bütün sayfalar, açık ve koyu tema; WCAG 2.0/2.1/2.2 A ve AA etiketlerindeki **her** ihlal reddedilir (yalnız ciddi olanlar değil). |
| `apps/web/e2e/klavye.spec.ts` | Atlama bağlantısı, sekme sırası, görünür odak, iletişim kutusunda odak tuzağı ve Esc, ekran okuyucu yapısı (yer imleri, başlık düzeni, ayırt edici sayfa başlıkları, aria-current). |
| `apps/web/e2e/portal.spec.tsx` | Değerlendirici portalının kapalı/ret/boş durumları. |
| `apps/web/e2e/telefon.spec.ts` | 360 px genişlikte kullanım. |

Sonuç: ihlal yok (156 e2e testinin tamamı geçti).

## Giderilenler

Portal durum sayfalarına başlık, form alanlarında 3:1 kenarlık karşıtlığı (ortak bileşenler), menüde
`aria-current`, 404 sayfası, ayrıntı sayfalarında ayırt edici `<title>`, odak kimliği düzeltmesi.

## Elle denetim (ekran okuyucu)

**Yapılmadı.** NVDA (Windows) ve VoiceOver (iOS/macOS) ile elle tur, bir insan tarafından yapılmalıdır.
Önerilen tur: giriş → onay kutusunda bir öneriyi kanıtını açarak onaylama → kanıt yükleme → değerlendirici
portalında soru sorma. Bulgular bu dosyaya eklenmelidir.
