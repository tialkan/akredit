// Bağlayıcıların kanıt hattına verdiği girdi. apps/isci kanit-hatti/alma.ts içindeki KanitGirdisi'nin
// kurumId dışındaki alanlarıyla birebir uyumludur (CLAUDE.md: başka paketin içi değiştirilmez, küçük arayüz tanımlanır).
// Bağlama: kanitAl(b, { kurumId, ...girdi }).

export interface BaglayiciKanitGirdisi {
  veri: Uint8Array;
  dosyaAdi: string;
  mime?: string;
  kaynakTuru: "baglayici" | "eposta";
  kaynakAyrinti?: Record<string, unknown>;
  belgeTarihi?: string;
}
