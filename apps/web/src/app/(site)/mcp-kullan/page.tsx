import { ACIK_ARACLAR, ACIK_ISTEMLER } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.mcpKullan);

/** Herkese açık uç nokta. Araç ve istem listesi aşağıda doğrudan sunucunun kodundan okunur, elle yazılmaz. */
const MCP_ADRESI = "https://akredit.org/mcp";

/** Bologna doldurma örnek konuşması. Ders kurgudur; asistanın yanıtları kısaltılmıştır. */
const ORNEK_KONUSMA: { kim: "Hoca" | "Asistan"; metin: string }[] = [
  { kim: "Hoca", metin: "/baslangic" },
  {
    kim: "Asistan",
    metin:
      "Merhaba. Bugün neye odaklanalım? Numarasını yazmanız yeter.\n1) Bologna ders paketini denetle ve boş alanları doldur\n2) Ders öğrenme çıktısı yaz ya da iyileştir\n3) ÇK ve PÇ sağlanma düzeyini hesapla\n4) Ölçüt ve kanıt rehberi\n5) Öz değerlendirme metninin dil denetimi",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin:
      "Ders sayfasını nasıl alalım?\n1) Bologna sayfasının adresini verin, ben okuyayım (önerilen)\n2) Sayfanın kaynağını yapıştırın\n3) Sıfırdan: ders adı, AKTS ve T+U+L yeter",
  },
  { kim: "Hoca", metin: "1, KRG101 Kurgu Bilimine Giriş sayfasının adresi" },
  {
    kim: "Asistan",
    metin:
      "KRG101 için 6 alan doldurulmalı: 1) Dersin amacı (boş) 2) Öğrenme çıktıları (2 çıktı var, 8-12 olmalı) 3) Haftalık akış (3 hafta var) 4) Ders yapısı (boş) 5) Katkı tablosu (boş) 6) Kaynaklar.\nNasıl ilerleyelim?\n1) Hepsini sırayla dolduralım (önerilen)\n2) Yalnız boş olanlar\n3) Numaraları kendim seçeyim",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin:
      'Dersin amacı için üç seçenek, üçü de kurallardan geçti (60-120 kelime):\nA) Kavram ağırlıklı: "Bu dersin amacı, öğrencilere kurgu biliminin temel kavramlarını..." (78 kelime, önerilen)\nB) Uygulama ağırlıklı (84 kelime)\nC) Proje ağırlıklı (91 kelime)',
  },
  { kim: "Hoca", metin: "hepsi A" },
  {
    kim: "Asistan",
    metin:
      "Kalan alanlarda hep A seçeneğiyle ilerledim ve her birini denetledim. İş yükü: toplam 150 saat, hedef 5 AKTS x 30 = 150, uyumlu. Kaynakları ve ders yetkililerini OBS'de kendiniz yazın; kitap adı uydurmuyorum.\nOBS'ye kopyalanacak metin hazır: Ders Bilgileri, Öğrenme Çıktıları, Ders Akışı, Prg.Çıktısına Katkısı sırasıyla.\n1) OBS'ye yapıştırdım, yeniden denetle\n2) Bir alanı değiştir\n3) Başka ders",
  },
];

const KOD = "rounded-sm border border-cizgi bg-zemin px-1.5 py-0.5 font-mono text-[0.92em]";
const BLOK = "mt-3 overflow-x-auto rounded-sm border border-cizgi bg-zemin p-4 font-mono text-sm";

export default function McpKullan() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.mcpKullan} />
      <SayfaBasi
        sayfa={SAYFALAR.mcpKullan}
        ozet="Akredit'in ölçüt ve denetim araçlarını Claude, ChatGPT, Cursor ya da VS Code içinde kullanın. Ücretsizdir, hesap gerekmez."
      />

      <Bolum id="ne" baslik="Ne işe yarar">
        <Metin>
          <p>
            Yapay zekâ asistanınıza tek bir adres eklersiniz: <code className={KOD}>{MCP_ADRESI}</code>. Asistan, YÖKAK
            ölçütünün resmî metnine, alt ölçütlerin olgunluk düzeylerine ve örnek kanıtlara buradan bakar.
            Yapıştırdığınız ders bilgisini ve rapor metnini Akredit'in kurallarıyla denetler, anonim puan tablosundan ÇK
            ve PÇ sağlanma düzeyini hesaplar.
          </p>
          <p>
            Bağlantı MCP (Model Context Protocol) adlı açık standarda dayanır. Araçlar yalnız okur ve hesaplar. Sunucu
            hiçbir yapay zekâ modeli çalıştırmaz, aynı girdiye her zaman aynı sonucu verir. Karar, imza ve dış kuruma
            gönderim bu bağlantıda yoktur.
          </p>
          <p>
            Her yanıt kaynağını taşır: ölçüt metni için resmî belgenin adresi, sayfası ve dosya özeti. Belgeden
            alınamayan metin DOĞRULANMADI olarak döner, tahminle doldurulmaz. Akredit'in YÖKAK ile bağı yoktur.
          </p>
        </Metin>
      </Bolum>

      <Bolum id="ilk-iki-dakika" baslik="İlk 2 dakika" zemin>
        <Metin>
          <ol>
            <li>
              Asistanınıza <code className={KOD}>{MCP_ADRESI}</code> adresini ekleyin. Adımlar aşağıda, "Nasıl eklenir"
              bölümünde.
            </li>
            <li>
              Yeni bir sohbet açın ve hazır başlangıçlardan <code className={KOD}>baslangic</code> komutunu seçin.
              Claude'da "+" düğmesinin altında Akredit, Cursor ve Claude Code'da eğik çizgi (/) ile görünür. Komut
              görünmüyorsa "Akredit ile başlayalım" yazmanız yeter.
            </li>
            <li>
              Odağınızı seçin: Bologna paketi, öğrenme çıktısı, ÇK ve PÇ hesabı, ölçüt rehberi ya da dil denetimi.
              Asistan her adımda 2-3 numaralı seçenek sunar; tek rakamla ya da harfle seçip ilerlersiniz. "hepsi A" gibi
              bir yanıt kalan adımların hepsine uygulanır.
            </li>
          </ol>
          <p>
            Seçenekleri sizin asistanınız yazar. Akredit kuralları ve sınırları verir, yazılanı denetler, toplamları
            kendisi hesaplar. Sonunda OBS'ye alan alan kopyalayacağınız düz metin gelir. Kaydı siz yaparsınız.
          </p>
        </Metin>
        <h3 className="mt-8 text-lg font-semibold text-vurgu">Hazır başlangıçlar</h3>
        <ul className="mt-2 grid gap-x-10 sm:grid-cols-2">
          {ACIK_ISTEMLER.map((i) => (
            <li key={i.ad} className="border-t border-cizgi py-4">
              <p className="font-semibold">{i.baslik}</p>
              <p className="mt-1 text-sm text-soluk">
                <code className={KOD}>{i.ad}</code>
              </p>
              <p className="mt-2 text-soluk">{i.aciklama}</p>
            </li>
          ))}
        </ul>
      </Bolum>

      <Bolum id="ornek" baslik="Örnek: Bologna paketini doldurmak">
        <p className="text-soluk">Kurgu bir ders üzerinden kısaltılmış bir konuşma.</p>
        <ol className="mt-4 space-y-3">
          {ORNEK_KONUSMA.map((s, n) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: sabit, sırası değişmeyen örnek liste
              key={n}
              className={`rounded-sm border border-cizgi p-4 ${s.kim === "Hoca" ? "bg-zemin" : ""}`}
            >
              <p className="text-sm font-semibold text-soluk">{s.kim}</p>
              <p className="mt-1 whitespace-pre-line">{s.metin}</p>
            </li>
          ))}
        </ol>
      </Bolum>

      <Bolum id="araclar" baslik="Araçlar" zemin>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {ACIK_ARACLAR.map((a) => (
            <li key={a.ad} className="border-t border-cizgi py-4">
              <p className="text-lg font-semibold text-vurgu">{a.baslik}</p>
              <p className="mt-1 text-sm text-soluk">
                <code className={KOD}>{a.ad}</code>
              </p>
              <p className="mt-2 text-soluk">{a.aciklama}</p>
            </li>
          ))}
        </ul>
      </Bolum>

      <Bolum id="kisisel-veri" baslik="Kişisel veri yollamayın">
        <aside className="rounded-sm border border-cizgi-guclu bg-zemin p-5">
          <p>
            Öğrenci adı, öğrenci numarası, T.C. kimlik numarası, e-posta ve telefon göndermeyin. Puan tablosunda öğrenci
            yerine "o1", "o2" gibi takma ad kullanın. Sunucu gelen veride böyle bir ifade görürse işlemi yapmaz ve
            maskelemenizi ister.
          </p>
          <p className="mt-3 text-soluk">
            İstek içeriği kaydedilmez. Kayda yalnız araç adı, süre ve istek boyutu yazılır. Hesap, çerez ve anahtar
            yoktur. Kullandığınız yapay zekâ hizmetinin kendi veri politikası ayrıca geçerlidir.
          </p>
        </aside>
      </Bolum>

      <Bolum id="ekleme" baslik="Nasıl eklenir" zemin>
        <Metin>
          <h3>Claude (claude.ai ve masaüstü uygulaması)</h3>
          <ol>
            <li>Ayarlarda Customize, ardından Connectors bölümünü açın.</li>
            <li>"+ Add" ve "Add custom connector" seçin.</li>
            <li>
              Ad olarak "Akredit" yazın, adres olarak <code className={KOD}>{MCP_ADRESI}</code> girin, Continue deyin.
            </li>
            <li>Kimlik doğrulamada "No sign in" seçin ve Add ile bitirin.</li>
            <li>Sohbette sol alttaki "+" düğmesinden Connectors altında Akredit'i açın.</li>
          </ol>
          <p>Ücretsiz planda bir özel bağlayıcı eklenebilir. Kurumsal planlarda bağlayıcıyı yönetici ekler.</p>

          <h3>Claude Code</h3>
          <pre className={BLOK}>claude mcp add --transport http akredit {MCP_ADRESI}</pre>

          <h3>ChatGPT</h3>
          <p>
            Özel MCP bağlantısı ChatGPT'de geliştirici kipiyle açılır ve plana göre değişir. Genel yol: Settings, Apps,
            Advanced settings altında geliştirici kipini açın; Apps altında Create ile yeni uygulama oluşturun, adres
            olarak <code className={KOD}>{MCP_ADRESI}</code> girin, kimlik doğrulamasız seçin, araçları taratıp
            kaydedin. İş ve kurum hesaplarında bu ayarı önce yönetici açar. Menü adları değişebilir; güncel adımlar için
            OpenAI yardım sayfasına bakın.
          </p>

          <h3>Cursor</h3>
          <p>
            Proje klasöründe <code className={KOD}>.cursor/mcp.json</code> ya da bütün projeler için{" "}
            <code className={KOD}>~/.cursor/mcp.json</code> dosyasına ekleyin:
          </p>
          <pre className={BLOK}>{`{
  "mcpServers": {
    "akredit": { "url": "${MCP_ADRESI}" }
  }
}`}</pre>

          <h3>VS Code</h3>
          <p>
            Komut paletinden "MCP: Add Server" seçin, "HTTP" türünü seçip adresi girin. Ya da çalışma alanında{" "}
            <code className={KOD}>.vscode/mcp.json</code> dosyasına ekleyin:
          </p>
          <pre className={BLOK}>{`{
  "servers": {
    "akredit": { "type": "http", "url": "${MCP_ADRESI}" }
  }
}`}</pre>

          <h3>Bilgisayarınızda çalıştırmak</h3>
          <p>
            Aynı araçlar kendi bilgisayarınızda da çalışır. Paket npm'de <code className={KOD}>@akredit/acik-mcp</code>{" "}
            adıyla yayımlandı; Node.js 22.18 ya da üstü gerekir.
          </p>
          <pre className={BLOK}>claude mcp add --transport stdio akredit -- npx -y @akredit/acik-mcp</pre>
          <p>Cursor ya da başka bir istemcide komut olarak:</p>
          <pre className={BLOK}>{`{
  "mcpServers": {
    "akredit": { "command": "npx", "args": ["-y", "@akredit/acik-mcp"] }
  }
}`}</pre>
        </Metin>
      </Bolum>

      <Bolum id="tam-sistem" baslik="Kurumunuzun verisiyle çalışmak için">
        <Metin>
          <p>
            Bu bağlantı kurumunuzun verisine erişmez: kanıt, ders dosyası, karar ve rapor kaydı yoktur. Kanıta bağlı
            rapor, onay kutusu ve değiştirilemez günlük Akredit platformunda çalışır. Platform açık kaynaktır, kurumunuz
            kendi sunucusuna kurabilir. akredit.org'da kurumlara barındırılan hizmet sponsor bulunana kadar sunulmuyor.
            Platformu uydurma veriyle <Link href="/deneyin">hesap açmadan deneyebilirsiniz</Link>.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
