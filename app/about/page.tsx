import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chi siamo - Guida ETRA Rifiuti",
  description: "Informazioni sul servizio non ufficiale di assistenza per la raccolta differenziata ETRA in Veneto.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Chi siamo</h1>

        <div className="prose prose-neutral dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Cos'è Guida ETRA Rifiuti?</h2>
            <p className="text-muted-foreground mb-4">
              Guida ETRA Rifiuti è un <strong>assistente AI non ufficiale</strong> che aiuta i cittadini
              a trovare informazioni sulla raccolta differenziata nei comuni serviti da ETRA S.p.A. in Veneto.
            </p>
            <p className="text-muted-foreground mb-4">
              Il servizio utilizza i dati pubblici disponibili sul sito ufficiale di ETRA per fornire
              risposte rapide su calendari, zone di raccolta e tipologie di rifiuti.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Disclaimer importante</h2>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Questo servizio NON è affiliato, sponsorizzato o approvato da ETRA S.p.A.</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Le informazioni fornite potrebbero non essere sempre aggiornate o accurate.
                Per informazioni ufficiali, consulta sempre il sito ufficiale.
              </p>
              <p className="text-sm text-muted-foreground">
                In caso di dubbi, contatta il servizio clienti ETRA al numero verde{" "}
                <a href="tel:800566766" className="underline">800 566 766</a>.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Sito ufficiale ETRA</h2>
            <p className="text-muted-foreground mb-4">
              Per informazioni ufficiali, modulistica, pagamenti e contatti, visita:
            </p>
            <a
              href="https://www.etraspa.it"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Vai a etraspa.it
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Contatti ETRA ufficiali</h2>
            <ul className="text-muted-foreground space-y-2">
              <li>
                <strong>Numero verde clienti:</strong>{" "}
                <a href="tel:800566766" className="underline">800 566 766</a>
              </li>
              <li>
                <strong>Pronto intervento (24h):</strong>{" "}
                <a href="tel:800013027" className="underline">800 013 027</a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t">
          <Link
            href="/"
            className="text-primary hover:underline"
          >
            ← Torna alla chat
          </Link>
        </div>
      </div>
    </div>
  );
}
