import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../bilesenler/dugme.tsx";
import { Logo } from "../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

export default function Bulunamadi() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
          <Link href="/" aria-label="Akredit ana sayfa">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="icerik" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sayfa bulunamadı</h1>
        <p className="mt-2 max-w-prose text-soluk">
          Aradığınız sayfa yok ya da taşınmış. Adresi denetleyin ya da ana sayfadan devam edin.
        </p>
        <p className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className={dugmeSinifi("birincil")}>
            Ana sayfa
          </Link>
          <Link href="/panel" className={dugmeSinifi("ikincil")}>
            Panel
          </Link>
        </p>
      </main>
    </div>
  );
}
