# Guida ETRA Rifiuti

Assistente AI per il servizio di raccolta rifiuti ETRA che copre oltre 80 comuni nella regione Veneto.

## Funzionalità

- **Chat AI** - Risposte in tempo reale con streaming
- **Calendario Rifiuti** - Ricerca semantica nel calendario raccolta 2025
- **Ricerca Zone** - Trova la tua zona ETRA tramite indirizzo
- **PWA** - Installabile su mobile e desktop
- **Tema scuro/chiaro** - Supporto completo

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **AI**: Vercel AI SDK, Mastra (RAG), OpenAI GPT-4o
- **Database**: PostgreSQL, Drizzle ORM, pgvector
- **Auth**: NextAuth 5

## Setup

### Prerequisiti

- Node.js 18+
- PostgreSQL 14+
- pnpm

### Installazione

```bash
# Installa dipendenze
pnpm install

# Configura variabili ambiente
cp .env.example .env.local
# Modifica .env.local con le tue credenziali

# Esegui migrazioni database
pnpm db:migrate

# Carica dati calendario (opzionale)
pnpm mastra:ingest
```

### Variabili Ambiente

```env
AUTH_SECRET=<secret-casuale>
AI_GATEWAY_API_KEY=<vercel-ai-gateway-key>
OPENAI_API_KEY=<openai-key>
POSTGRES_URL=<postgres-connection-string>
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
REDIS_URL=<redis-connection-string>
```

## Scripts

```bash
# Sviluppo
pnpm dev              # Server sviluppo

# Produzione
pnpm build            # Build + migrazioni
pnpm start            # Avvia server produzione

# Database
pnpm db:migrate       # Esegui migrazioni
pnpm db:studio        # Apri Drizzle Studio

# Mastra
pnpm mastra:ingest    # Carica dati nel vector store
```

## Struttura Progetto

```
├── app/
│   ├── (chat)/           # Pagine chat
│   ├── api/              # API routes
│   └── mastra/           # Configurazione agente AI
│       ├── agents/       # Definizione agenti
│       └── tools/        # Tools RAG e utility
├── components/           # Componenti React
├── lib/
│   ├── ai/              # Configurazione modelli AI
│   └── db/              # Schema e query database
└── public/              # Assets statici e PWA
```

## Agente AI

L'agente RAG utilizza questi tools:

- **get-current-date** - Data corrente
- **search-waste-calendar** - Ricerca calendario rifiuti
- **find-zone-collection-info** - Trova zona ETRA da indirizzo
- **get-weather** - Meteo attuale

## Tipi di Rifiuti

- Organico
- Carta
- Plastica/Metalli
- Vetro
- Secco residuo
- Verde/Ramaglie

## Note

Questo è un assistente non ufficiale per i servizi ETRA. Per informazioni ufficiali visita [etraspa.it](https://www.etraspa.it).

## License

MIT
