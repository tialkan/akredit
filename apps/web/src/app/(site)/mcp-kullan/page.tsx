import { ACIK_ARACLAR, ACIK_ISTEMLER, AKREDIT_ODAKLARI, baglayiciAdimlari } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import { AdimListesi } from "../../../site/adim-listesi.tsx";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { GORSELLER, Gorsel } from "../../../site/gorsel.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { CLAUDE_CODE_KOMUTU, MCP_ADRESI } from "../../../site/kurulum.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.mcpKullan);

// Araç ve istem listesi ile odak menüsü aşağıda doğrudan sunucunun kodundan okunur, elle yazılmaz.

/**
 * Bologna doldurma örnek konuşması. Ders, kurum, kişiler ve sayılar kurgudur; asistanın yanıtları kısaltılmıştır.
 * Akış sunucunun Bologna istemindeki sıradır (apps/acik-mcp/src/promptlar.ts): giriş, ders listesini sormadan
 * tarama, tek özet, doldurma, tek değişiklik özeti, kayıt, geri okuma.
 */
const ORNEK_KONUSMA: { kim: "Hoca" | "Asistan"; metin: string }[] = [
  { kim: "Hoca", metin: "akredit" },
  {
    kim: "Asistan",
    metin: ["Neye odaklanalım? Numarasını yazın.", ...AKREDIT_ODAKLARI.map((o) => `${o.no}) ${o.ad}`)].join("\n"),
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin: "Parolanızı yalnız OBS'nin kendi ekranına yazın, bana yazmayın. OBS adresiniz nedir?",
  },
  { kim: "Hoca", metin: "obs.kurgu.edu.tr" },
  { kim: "Asistan", metin: 'OBS ekranını kenarda açtım. Girince "girdim" yazın.' },
  { kim: "Hoca", metin: "girdim" },
  {
    kim: "Asistan",
    metin:
      "Üç dersinizin paketini okudum. Şu eksiklikleri tespit ettim:\nKRG204 Kurgu Ölçme Yöntemleri: 9 alan eksik ya da zayıf\nKRG101 Kurgu Dersi: 3 alan eksik\nKRG310 Kurgu Semineri: eksik görünmüyor\nKRG204'ün değerlendirme yüzdeleri sayfada yok; biliyorsanız seçiminizin yanına yazın.\n1) En eksikten başlayıp hepsini sırayla kapatalım (önerilen)\n2) Yalnız en eksik dersi tamamlayalım\n3) Dersi ben seçeyim",
  },
  { kim: "Hoca", metin: "1, ara sınav 40, final 60" },
  {
    kim: "Asistan",
    metin:
      "İki dersi doldurdum; biçim denetiminden geçti, içerik teyidi sizde. 12 alanın önceki ve yeni değeri tek tabloda.\n1) OBS'ye yaz ve kaydet\n2) Formu doldur, Kaydet'e ben basayım\n3) Alan alan kopya metni ver",
  },
  { kim: "Hoca", metin: "1" },
  {
    kim: "Asistan",
    metin: "Yazdım ve kaydettim. Sayfayı geri okuyup karşılaştırdım: fark yok. Onaya Gönder'e siz basarsınız.",
  },
];

/** Hiç bilmeyenler için adımlar: her adım tek iş ve ekranda ne görüleceği. */
const ILK_KEZ: { baslik: string; yap: string; gorursunuz: string }[] = [
  {
    baslik: "Claude'a Akredit'i ekleyin",
    yap: `Ayarlar, Bağdaştırıcılar, + Ekle, Özel bağdaştırıcı ekle. Ad: Akredit, adres: ${MCP_ADRESI}. Ayrıntısı aşağıda.`,
    gorursunuz: "Bağdaştırıcılar listesinde Akredit.",
  },
  {
    baslik: "akredit yazın",
    yap: "Yeni sohbette akredit yazın. Menü gelmezse Akredit araçlarıyla Bologna paketimi denetle yazın.",
    gorursunuz: "Numaralı odak menüsü.",
  },
  {
    baslik: "OBS'nize kendiniz girin",
    yap: "Parola, doğrulama kodu ve CAPTCHA yalnız OBS'nin kendi ekranına, sizin elinizle. Sohbete asla yazmayın.",
    gorursunuz: "Asistan hangi ders diye sormaz; ders listenizi kendisi tarar ve eksikleri tek özetle gösterir.",
  },
  {
    baslik: "Kenardaki tarayıcı",
    yap: "Claude in Chrome, Claude masaüstü tarayıcısı ya da ChatGPT ajan modu sayfayı okur. Yoksa asistan adım adım anlatır.",
    gorursunuz: "Sohbetin yanında OBS sayfası.",
  },
  {
    baslik: "Seçin ve onaylayın",
    yap: "Önerilen seçeneğin numarasını yazın. Asistan alanları doldurur, denetler ve tek özet gösterir. Kaydet'e siz basarsınız ya da onayınızla asistan basar. Onaya Gönder her zaman sizdedir.",
    gorursunuz: "Önceki ve yeni değerlerin özeti, sonra OBS'nin kayıt iletisi.",
  },
  {
    baslik: "Engel olursa",
    yap: "Ne olduğunu asistana yazın. Yedek yol: ders sayfasında Ctrl+A, Ctrl+C, sohbete Ctrl+V.",
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
        ozet="Claude, ChatGPT, Cursor ya da VS Code içinde. Ücretsiz, hesapsız."
        gorsel={
          <Gorsel
            gorsel={GORSELLER.amfi}
            alt="Gravür çizim: yüksek pencereli, basamak basamak sıralarıyla boş bir üniversite amfisi."
            boyutlar="(min-width: 64rem) 32rem, (min-width: 28rem) 28rem, calc(100vw - 2rem)"
            oncelikli
          />
        }
      />

      <Bolum id="ne" baslik="Ne işe yarar">
        <Metin>
          <p>
            Asistanınıza <code className={KOD}>{MCP_ADRESI}</code> adresini eklersiniz. Asistan YÖKAK ölçüt metnine ve
            olgunluk düzeylerine bakar, ders bilgisini ve rapor metnini denetler, ÇK ve PÇ sağlanma düzeyini hesaplar.
          </p>
          <p>
            Araçlar yalnız okur ve hesaplar; sunucu model çalıştırmaz. Her yanıt kaynağını taşır; belgeden alınamayan
            metin DOĞRULANMADI döner. Akredit'in YÖKAK ile bağı yoktur.
          </p>
        </Metin>
      </Bolum>

      <Bolum id="ilk-iki-dakika" baslik="İlk 2 dakika" zemin>
        <Metin>
          <ol>
            <li>
              <code className={KOD}>{MCP_ADRESI}</code> adresini ekleyin (aşağıda, "Nasıl eklenir").
            </li>
            <li>
              Yeni sohbette <code className={KOD}>akredit</code> yazın. Menü gelmezse "Akredit araçlarıyla Bologna
              paketimi denetle" yazın.
            </li>
            <li>
              Odağınızı numarasıyla seçin. Bologna'da asistan ders listenizi sormadan tarar, eksikleri tek özetle
              gösterir, alanları doldurur ve denetler.
            </li>
          </ol>
          <p>Akredit kuralları verir ve hesaplar. OBS'ye siz girersiniz; Kaydet'e siz ya da izninizle asistan basar.</p>
          <p>
            Ara soru istemiyorsanız baştan "hepsini yap ve kaydet" yazın. Asistan tarar, doldurur, kaydeder, sayfayı
            geri okuyup doğrular ve sonda tek rapor verir. Sayfada olmayan değerlendirme yüzdesi ve kaynak uydurulmaz,
            EKSİK kalır. Onaya Gönder düğmesine yine siz basarsınız.
          </p>
        </Metin>
        <h3 className="bolum-etiketi mt-8 text-lg text-vurgu">Hazır başlangıçlar</h3>
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
        <p className="text-soluk">Sırayla izleyin; her adım tek iş.</p>
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
        <p className="text-soluk">Kurgu ders, kurgu OBS, kısaltılmış.</p>
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

      <Bolum id="kisisel-veri" baslik="Parola yollamayın, öğrenciye takma ad verin" zemin>
        <aside className="rounded-sm border border-cizgi-guclu bg-zemin p-5">
          <p>
            Parola, doğrulama kodu ve oturum bilgisi asistana ya da Akredit'e yazılmaz. Sunucu böyle bir ifade görürse
            işlemi yapmaz.
          </p>
          <p className="mt-3">
            Bologna'daki Dersi Verenler satırları olduğu gibi korunur. Not tablosunda ad, soyad ve numara hesaplamadan
            önce atılır; öğrenciler o1, o2 gibi takma ad alır.
          </p>
          <p className="mt-3 text-soluk">
            İstek içeriği kaydedilmez; yalnız araç adı, süre ve boyut yazılır. Kaynak doğrulama yalnız Crossref, Open
            Library ve Google Books'a sorar. Yapay zekâ hizmetinizin veri politikası ayrıca geçerlidir.
          </p>
        </aside>
      </Bolum>

      <Bolum id="ekleme" baslik="Nasıl eklenir">
        <Metin>
          <h3>Claude (claude.ai ve masaüstü uygulaması)</h3>
          <AdimListesi adimlar={baglayiciAdimlari("claude_web")} />

          <h3>Claude Code</h3>
          <pre className={BLOK}>{CLAUDE_CODE_KOMUTU}</pre>

          <h3>ChatGPT</h3>
          <AdimListesi adimlar={baglayiciAdimlari("chatgpt")} />

          <h3>Cursor</h3>
          <p>
            <code className={KOD}>.cursor/mcp.json</code> ya da <code className={KOD}>~/.cursor/mcp.json</code>:
          </p>
          <pre className={BLOK}>{`{
  "mcpServers": {
    "akredit": { "url": "${MCP_ADRESI}" }
  }
}`}</pre>

          <h3>VS Code</h3>
          <p>
            "MCP: Add Server", HTTP, adres. Ya da <code className={KOD}>.vscode/mcp.json</code>:
          </p>
          <pre className={BLOK}>{`{
  "servers": {
    "akredit": { "type": "http", "url": "${MCP_ADRESI}" }
  }
}`}</pre>

          <h3>Bilgisayarınızda çalıştırmak</h3>
          <p>
            npm paketi <code className={KOD}>@akredit/acik-mcp</code>; Node.js 22.18 ya da üstü gerekir.
          </p>
          <pre className={BLOK}>claude mcp add --transport stdio akredit -- npx -y @akredit/acik-mcp</pre>
          <p>Başka istemcide:</p>
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
            Bu bağlantı kurum verisine erişmez. Kanıta bağlı rapor ve onay Akredit platformundadır; kurumunuz kendi
            sunucusuna kurabilir. akredit.org'da kurum hizmeti sponsor bulunana kadar askıda.{" "}
            <Link href="/kurum-demosu">Kurum demosu</Link> hazır, sponsor bulunana kadar askıda.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
