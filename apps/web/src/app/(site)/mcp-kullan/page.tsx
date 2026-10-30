import { ACIK_ARACLAR } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.mcpKullan);

/** Herkese açık uç nokta. Araç listesi aşağıda doğrudan sunucunun kodundan okunur, elle yazılmaz. */
const MCP_ADRESI = "https://akredit.org/mcp";

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
            Aynı araçlar internete çıkmadan, kendi bilgisayarınızda da çalışır. Paket henüz npm'de yayımlanmadı;
            şimdilik açık kaynak deposundan çalıştırılır. Yayımlandığında komut şu olacak:
          </p>
          <pre className={BLOK}>claude mcp add --transport stdio akredit -- npx -y @akredit/acik-mcp</pre>
        </Metin>
      </Bolum>

      <Bolum id="tam-sistem" baslik="Kurumunuzun verisiyle çalışmak için">
        <Metin>
          <p>
            Bu bağlantı kurumunuzun verisine erişmez: kanıt, ders dosyası, karar ve rapor kaydı yoktur. Kanıta bağlı
            rapor, onay kutusu ve değiştirilemez günlük Akredit panelinde çalışır. Kurumunuzda denemek için{" "}
            <Link href="/pilot">pilot kurum başvurusu</Link> yapın.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
