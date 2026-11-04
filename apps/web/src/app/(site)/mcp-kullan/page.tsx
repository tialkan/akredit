import { ACIK_ARACLAR, ACIK_ISTEMLER } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.mcpKullan);

/** Herkese açık uç nokta. Araç ve istem listesi aşağıda doğrudan sunucunun kodundan okunur, elle yazılmaz. */
const MCP_ADRESI = "https://akredit.org/mcp";

/** Bologna doldurma örnek konuşması. Ders, kurum ve kişiler kurgudur; asistanın yanıtları kısaltılmıştır. */
const ORNEK_KONUSMA: { kim: "Hoca" | "Asistan"; metin: string }[] = [
  { kim: "Hoca", metin: "basla" },
  {
    kim: "Asistan",
    metin:
      "Merhaba. Bugün neye odaklanalım? Numarasını yazmanız yeter.\n1) Bologna ders paketini denetle ve boş alanları doldur\n2) Ders öğrenme çıktısı yaz ya da iyileştir\n3) ÇK ve PÇ sağlanma düzeyini hesapla\n4) Ölçüt ve kanıt rehberi\n5) Öz değerlendirme metninin dil denetimi",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin:
      "Önce bir kural: kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi giriş ekranına, kendiniz yazın. Bana asla yazmayın.\nOBS adresiniz nedir?",
  },
  { kim: "Hoca", metin: "obs.kurgu.edu.tr" },
  {
    kim: "Asistan",
    metin:
      'OBS giriş ekranını kenardaki tarayıcıda açtım. Bilgilerinizi oraya yazın. Bitince bana yalnız "girdim" yazın.',
  },
  { kim: "Hoca", metin: "girdim" },
  {
    kim: "Asistan",
    metin: "Dersleriniz:\n1) KRG204 Kurgu Ölçme Yöntemleri\n2) KRG305 Kurgu Veri Çözümlemesi\nHangisi?",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin:
      "Bologna sayfasını okudum. Dersi veren satırı kişisel veri olduğu için atıldı.\n9 alan eksik ya da zayıf: 1) Dersin amacı (boş) 2) Dersin içeriği (8 kelime) 3) Öğrenme çıktıları (2 var, 8-12 olmalı) 4) Haftalık akış (3 hafta var) 5) Kaynaklar (1 var, en az 2) ...\nNasıl ilerleyelim?\n1) Hepsini sırayla dolduralım (önerilen)\n2) Yalnız boş olanlar\n3) Numaraları kendim seçeyim",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin:
      'Dersin amacı için üç seçenek, üçü de kurallardan geçti (60-120 kelime):\n1) Kavram ağırlıklı: "Bu ders kurgu ölçme yöntemlerini tanıtır..." (66 kelime, önerilen)\n2) Uygulama ağırlıklı (74 kelime)\n3) Proje ağırlıklı (81 kelime)',
  },
  { kim: "Hoca", metin: "hepsi 1" },
  {
    kim: "Asistan",
    metin:
      "Kalan alanlarda hep 1. seçenekle ilerledim ve her birini denetledim. İş yükü: toplam 150 saat, hedef 5 AKTS x 30 = 150, uyumlu.\nKalan 1 alan: Kaynaklar. Derste kullandığınız ikinci kitabın adı ve yazarı nedir?",
  },
  { kim: "Hoca", metin: "Can Deneme, Kurgu ölçme el kitabı, 2023, Kurgu Yayınları" },
  {
    kim: "Asistan",
    metin:
      "Künye: Deneme, C. (2023). Kurgu ölçme el kitabı. Kurgu Yayınları.\nKalan alan yok. OBS'ye nasıl yazalım?\n1) Formu ben doldurayım, Kaydet'e siz basın (önerilen)\n2) Alan alan kopyalayıp yapıştırın",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin:
      'Ders Bilgileri sekmesini doldurdum. Alanlara göz atın, Kaydet düğmesine siz basın, sonra "kaydettim" yazın.',
  },
  { kim: "Hoca", metin: "kaydettim" },
  {
    kim: "Asistan",
    metin: "Sayfayı yeniden okudum ve denetledim: tamamlandı.\n1) Başka ders\n2) Bir alanı değiştir\n3) Bitir",
  },
];

/** Hiç bilmeyenler için adımlar: her adım tek iş ve ekranda ne görüleceği. */
const ILK_KEZ: { baslik: string; yap: string; gorursunuz: string }[] = [
  {
    baslik: "Claude'a Akredit'i ekleyin",
    yap: `claude.ai'de sol alttaki adınıza tıklayın, Settings (Ayarlar), sonra Connectors (Bağlayıcılar). Add custom connector düğmesine basın. Ad olarak Akredit, adres olarak ${MCP_ADRESI} yazın ve Add deyin.`,
    gorursunuz: "Bağlayıcı listesinde Akredit.",
  },
  {
    baslik: "basla yazın",
    yap: "Yeni bir sohbet açın ve yazı kutusuna basla yazın. Bologna için 1 yazın.",
    gorursunuz: "Beş seçenekli bir menü.",
  },
  {
    baslik: "OBS'nize kendiniz girin",
    yap: "Asistan OBS adresinizi sorar ve sayfayı kenarda açar. Kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi giriş ekranına, kendiniz yazın. Asistana, sohbete ya da Akredit'e asla yazmayın. Doğrulama kodu ve CAPTCHA da sizindir. Girince asistana yalnız girdim yazın.",
    gorursunuz: "Ders listeniz sohbette numaralı.",
  },
  {
    baslik: "Kenardaki tarayıcı",
    yap: "Sayfayı Claude in Chrome eklentisi, Claude masaüstü uygulamasının tarayıcı paneli ya da ChatGPT'nin ajan modu okur. Bunlardan biri yoksa asistan kurulum adımlarını tek tek verir. Menü adları sürüme göre değişebilir.",
    gorursunuz: "Sohbetin yanında OBS sayfası.",
  },
  {
    baslik: "Seçin",
    yap: 'Asistan eksik alanları listeler ve her alan için 2-3 seçenek sunar. Bir rakam yazın ya da "hepsi 1" deyin.',
    gorursunuz: "Her seçimden sonra kaç alan kaldığı.",
  },
  {
    baslik: "OBS'ye yazın",
    yap: "Tarayıcı aracı varsa asistan formu doldurur; siz alanlara göz atıp Kaydet düğmesine kendiniz basarsınız. Yoksa asistan alan alan kopyalanacak metni verir.",
    gorursunuz: "OBS'nin kayıt iletisi, sonra asistandan tamamlandı.",
  },
  {
    baslik: "Engel olursa",
    yap: "Tarayıcı aracı yoksa, site açılmıyorsa, CAPTCHA çıkarsa ya da oturum düşerse asistana ne olduğunu yazın; adım adım çözüm verir. Yedek yol hep var: OBS'de ders sayfasında Ctrl+A, Ctrl+C, sohbete Ctrl+V.",
    gorursunuz: "Numaralı çözüm adımları.",
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
              Yeni bir sohbet açın ve <code className={KOD}>basla</code> yazın ya da hazır başlangıçlardan seçin.
              Claude'da "+" düğmesinin altında Akredit, Cursor ve Claude Code'da eğik çizgi (/) ile görünür. Komut
              görünmüyorsa "Akredit ile başlayalım" yazmanız yeter.
            </li>
            <li>
              Odağınızı seçin: Bologna paketi, öğrenme çıktısı, ÇK ve PÇ hesabı, ölçüt rehberi ya da dil denetimi.
              Asistan her adımda 2-3 numaralı seçenek sunar; tek rakamla seçip ilerlersiniz. "hepsi 1" gibi bir yanıt
              kalan adımların hepsine uygulanır.
            </li>
          </ol>
          <p>
            Seçenekleri sizin asistanınız yazar. Akredit kuralları ve sınırları verir, yazılanı denetler, toplamları
            kendisi hesaplar. OBS'ye siz girersiniz; asistan formu doldurur ya da alan alan kopyalayacağınız metni
            verir. Kaydet düğmesine siz basarsınız.
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

      <Bolum id="hic-bilmeyenler" baslik="Hiç bilmeyenler için">
        <p className="text-soluk">
          Yapay zekâyı ilk kez kullanıyorsanız bu adımları sırayla izleyin. Her adım tek iştir.
        </p>
        <ol className="mt-4 space-y-3">
          {ILK_KEZ.map((a, n) => (
            <li key={a.baslik} className="rounded-sm border border-cizgi p-4">
              <p className="text-lg text-vurgu">
                {n + 1}. {a.baslik}
              </p>
              <p className="mt-1">{a.yap}</p>
              <p className="mt-1 text-sm text-soluk">Göreceğiniz: {a.gorursunuz}</p>
            </li>
          ))}
        </ol>
      </Bolum>

      <Bolum id="ornek" baslik="Örnek: Bologna paketini baştan sona doldurmak" zemin>
        <p className="text-soluk">Kurgu bir ders ve kurgu bir OBS üzerinden kısaltılmış bir konuşma.</p>
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

      <Bolum id="araclar" baslik="Araçlar">
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

      <Bolum id="kisisel-veri" baslik="Parola ve kişisel veri yollamayın" zemin>
        <aside className="rounded-sm border border-cizgi-guclu bg-zemin p-5">
          <p>
            Parolanızı, doğrulama kodunuzu ve oturum bilgisini hiçbir zaman asistana ya da Akredit'e yazmayın; yalnız
            OBS'nin kendi giriş ekranına siz yazarsınız. Sunucu böyle bir ifade görürse işlemi yapmaz.
          </p>
          <p className="mt-3">
            Öğrenci adı, öğrenci numarası, T.C. kimlik numarası, e-posta ve telefon göndermeyin. Puan tablosunda öğrenci
            yerine "o1", "o2" gibi takma ad kullanın. Sunucu gelen veride böyle bir ifade görürse işlemi yapmaz ve
            maskelemenizi ister. İki istisna kendiliğinden işler: Bologna sayfasında Dersi Verenler, Dersin Yardımcıları
            ve Koordinatör satırları ile e-posta ve telefonlar; Excel not tablosunda ad, soyad ve numara sütunları
            ayrıştırmadan önce bellekte atılır, hiçbir yere yazılmaz ve neyin atıldığı size söylenir. Kaynakçadaki yazar
            adları yayımlanmış künyedir, kaynak alanında kalır.
          </p>
          <p className="mt-3 text-soluk">
            İstek içeriği kaydedilmez. Kayda yalnız araç adı, süre ve istek boyutu yazılır. Hesap, çerez ve anahtar
            yoktur. Kullandığınız yapay zekâ hizmetinin kendi veri politikası ayrıca geçerlidir.
          </p>
        </aside>
      </Bolum>

      <Bolum id="ekleme" baslik="Nasıl eklenir">
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

      <Bolum id="tam-sistem" baslik="Kurumunuzun verisiyle çalışmak için" zemin>
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
