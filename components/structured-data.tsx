export function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ETRA S.p.A.",
    url: "https://www.etraspa.it",
    logo: "https://www.etraspa.it/sites/etraspa.it/files/etra_logo.png",
    description:
      "ETRA S.p.A. Società benefit - Servizi ai Comuni per il servizio idrico integrato e la gestione dei rifiuti in Veneto",
    areaServed: {
      "@type": "State",
      name: "Veneto",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+39-800-013-027",
        contactType: "emergency",
      },
      {
        "@type": "ContactPoint",
        telephone: "+39-800-566-766",
        contactType: "customer service",
        areaServed: "IT",
        availableLanguage: "Italian",
      },
    ],
  };

  const webApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Guida ETRA Rifiuti",
    description:
      "Assistente AI non ufficiale per la raccolta differenziata ETRA in Veneto. Trova il calendario 2025, la tua zona e cosa buttare oggi.",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    featureList: [
      "Ricerca calendario raccolta differenziata 2025",
      "Identificazione zona raccolta per indirizzo",
      "Informazioni su tipologie di rifiuti",
      "Chat AI per domande sulla raccolta",
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Come posso sapere quando passa la raccolta nella mia zona?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Usa il chatbot ETRA Assistant per chiedere il calendario della raccolta. Specifica il tuo comune e la zona (A o B) per ottenere le date precise del 2025.",
        },
      },
      {
        "@type": "Question",
        name: "Come trovo la mia zona di raccolta?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fornisci il tuo indirizzo completo e il comune al chatbot. L'assistente cercherà automaticamente la tua zona di raccolta utilizzando i dati ETRA.",
        },
      },
      {
        "@type": "Question",
        name: "Quali comuni sono coperti dal servizio?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Il servizio copre oltre 80 comuni in Veneto tra cui Bassano del Grappa, Asiago, Cittadella, Piombino Dese, Marostica e molti altri nella provincia di Vicenza e Padova.",
        },
      },
      {
        "@type": "Question",
        name: "Cosa si raccoglie oggi nella mia zona?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chiedi al chatbot 'Cosa si raccoglie oggi nella mia zona?' specificando il tuo comune e zona. L'assistente consulterà il calendario 2025 e ti dirà quale tipo di rifiuto viene raccolto.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
