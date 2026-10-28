# Kurum hukuk paketi: önce okuyun

> **TASLAK, avukat incelemesi gerekir.** Bu klasördeki hiçbir metin hukuki görüş değildir. Akredit taslak üretir; kurumun hukuk birimi ya da bir avukat incelemeden imzalanmaz, yayımlanmaz.

Bu paket, Akredit'i kullanmayı düşünen üniversitenin hukuk birimine verilir. Mevzuat bilgileri [kaynaklar.md](kaynaklar.md) dosyasındaki kodlara (K1...K11) bağlıdır; kaynağı bulunamayan bilgi `DOĞRULANMADI` diye işaretlidir (ilke 6: resmî metin hafızadan yazılmaz).

## İçindekiler

| Dosya | Ne işe yarar |
|---|---|
| 01-veri-isleme-sozlesmesi.md | Kurum (veri sorumlusu) ile işletmeci (veri işleyen) arasındaki sözleşme taslağı |
| 02-standart-sozlesme-kullanim-notu.md | Yurt dışı aktarım gerekirse standart sözleşmenin nasıl kullanılacağı |
| 03-verbis-degerlendirmesi.md | VERBİS kaydı açısından değerlendirme |
| 04-aydinlatma-metinleri.md | Aydınlatma metinlerine yapay zekâ ve çıkış kapısı eki; tam metinler `aydinlatma-metinleri.md` |
| 05-sorumluluk-matrisi.md | Kim neyi onaylar, hata olursa ne olur (Katman 0/1/2) |
| 06-beyan-siniri.md | "Sistem kurum adına beyanda bulunmaz" sorumluluk sınırı ve Apache-2.0 garanti sınırı |
| veri-akis-envanteri.md / .csv | Kod tabanından üretilen veri akış envanteri |
| kaynaklar.md, aydinlatma-metinleri.md, saklama-imha-politikasi.md | İP-28 taslakları (değişmeden) |

## Teknik güvencelerin özeti

1. **Sıfır kişisel veri çıkışı.** Yurt dışındaki ya da kurum dışındaki her yapay zekâ çağrısı (sohbet, gömme, web araması) tek bir çıkış kapısından geçer. Kapı ad-soyad, T.C. kimlik no, öğrenci no, e-posta, telefon, IBAN, adres ve imza alanlarını maskeler. Maskelenemeyen şüpheli içerik (ör. "Doğum tarihi:" etiketi, sağlık raporu ipucu) varsa çağrı yapılmaz, iş bir insana düşer. Bağdaştırıcılar kapı dışında ağ isteği yapamaz; bu, otomatik testle denetlenir.
2. **Çıkış kaydı.** Her çağrı için hangi türden kaç değerin maskelendiği (değerin kendisi değil), sağlayıcı, ülke ve amaç kaydedilir.
3. **Kurum içi model.** Kurum EVREN, vLLM ya da Ollama gibi yurt içi/yerel bir model seçerse kapı "kurum içi" kipinde çalışır; kurum içi kipten yurt dışı hizmete gidilemez.
4. **Silme hakkı.** Kişiye özgü anahtar silinerek kriptografik silme yapılır; günlüğe yeni bir "silme uygulandı" kaydı eklenir, eski kayıtlar ve özet zinciri bozulmaz. Bunun hukuken anonim hale getirme sayılıp sayılmadığı `DOĞRULANMADI`.

Maskeleme bir desen tanıma işidir ve kusursuz değildir. Bu yüzden kişisel veri aktarımı hukuken "yok" sayılmadan önce kurumun hukuk birimi riski değerlendirmelidir (`DOĞRULANMADI`).
