// Kurulum adımlarının ortak görünümü. Adımlar elle yazılmaz; apps/acik-mcp/src/yardim.ts'den gelir.
import type { Adim } from "@akredit/acik-mcp";

export function AdimListesi({ adimlar }: { adimlar: Adim[] }) {
  return (
    <ol className="mt-4 grid gap-3">
      {adimlar.map((a) => (
        <li key={a.no} className="grid grid-cols-[2.25rem_1fr] gap-x-2">
          <span className="paragraf-no text-xl leading-7" aria-hidden>
            {a.no}.
          </span>
          <div>
            <p>
              <span className="sr-only">{a.no}. </span>
              {a.yap}
            </p>
            {a.goreceginiz ? <p className="text-soluk">Göreceğiniz: {a.goreceginiz}</p> : null}
            {a.degisebilir ? <p className="text-soluk">Menünün adı sizde biraz farklı olabilir.</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
