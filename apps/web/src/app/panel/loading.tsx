/** Panel yükleniyor ekranı: içerik yerinde ince satırlar; hareket azaltma tercihinde durağan kalır. */
export default function PanelYukleniyor() {
  return (
    <div role="status" aria-live="polite" className="max-w-4xl">
      <p className="sr-only">Sayfa yükleniyor.</p>
      <div aria-hidden className="space-y-4">
        <div className="h-8 w-2/5 rounded-sm bg-yuzey-2 motion-safe:animate-pulse" />
        <div className="h-4 w-3/5 rounded-sm bg-yuzey-2 motion-safe:animate-pulse" />
        <div className="mt-8 border-y border-cizgi">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 border-t border-cizgi py-4 first:border-t-0">
              <div className="h-4 w-1/3 rounded-sm bg-yuzey-2 motion-safe:animate-pulse" />
              <div className="h-4 flex-1 rounded-sm bg-yuzey-2 motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
