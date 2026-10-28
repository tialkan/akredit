// Panelin veri kipi (İP-36). Varsayılan gerçek veritabanıdır. Örnek veri yalnız derlemede
// `AKREDIT_ORNEK_VERI=1` verilirse açılır (tanıtım kurulumu, uçtan uca testler). next.config.ts bu değeri
// `NEXT_PUBLIC_AKREDIT_ORNEK_VERI` olarak sunucu ve tarayıcı paketine aynı biçimde gömer; böylece iki taraf
// hiçbir zaman farklı kipte çalışmaz. Eski `NEXT_PUBLIC_AKREDIT_VERI=gercek` ayarına artık gerek yoktur.

export const ORNEK_VERI = process.env.NEXT_PUBLIC_AKREDIT_ORNEK_VERI === "1";
export const GERCEK_VERI = !ORNEK_VERI;
