# Deploy su Vercel + Neon

## Prerequisiti
- Account Vercel: https://vercel.com
- Account Neon: https://neon.tech
- OpenAI API Key: https://platform.openai.com/api-keys

## Step 1: Configurare Database Neon

1. Vai su https://console.neon.tech
2. Clicca "Create Project"
3. Nome progetto: `etra-chatbot`
4. Regione: Europe (Frankfurt) - più vicino all'Italia
5. Copia il **Connection String** (postgres://...)

## Step 2: Eseguire Migrazioni Database

Dalla tua macchina locale:

```bash
# Configura temporaneamente POSTGRES_URL
export POSTGRES_URL="postgres://[NEON_CONNECTION_STRING]"

# Esegui migrazioni
pnpm db:migrate

# Carica dati calendari (se necessario)
pnpm mastra:ingest-pdf
```

## Step 3: Deploy su Vercel

### Opzione A: Deploy da CLI (Consigliata)

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (segui il wizard)
vercel

# Configura variabili ambiente
vercel env add POSTGRES_URL
vercel env add OPENAI_API_KEY
vercel env add AUTH_SECRET

# Deploy in produzione
vercel --prod
```

### Opzione B: Deploy da Web

1. Vai su https://vercel.com/new
2. Importa repository GitHub: `etra-chat-bot`
3. Framework Preset: **Next.js** (auto-detect)
4. Build Command: `pnpm build` (già configurato)
5. Install Command: `pnpm install` (già configurato)

## Step 4: Configurare Environment Variables su Vercel

In Vercel Dashboard → Settings → Environment Variables:

```env
AUTH_SECRET=<genera con: openssl rand -base64 32>
OPENAI_API_KEY=sk-proj-...
POSTGRES_URL=postgres://[username]:[password]@[neon-hostname]/[dbname]
NODE_ENV=production
```

**Opzionali (rate limiting):**
```env
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

## Step 5: Verifica Deploy

1. Attendi il deploy (2-3 minuti)
2. Apri l'URL assegnato: `https://etra-chatbot.vercel.app`
3. Testa la chat con una domanda

## Troubleshooting

### Errore: "relation does not exist"
→ Migrazioni non eseguite. Esegui `pnpm db:migrate` con POSTGRES_URL corretto

### Errore: "OpenAI quota exceeded"
→ Verifica crediti OpenAI: https://platform.openai.com/usage

### Errore: Build failed
→ Verifica TypeScript: `pnpm tsc --noEmit`

## Costi Stimati

- **Vercel Hobby**: GRATIS (uso non commerciale)
- **Neon Free Tier**: GRATIS (0.5GB storage)
- **OpenAI**: ~$0.002 per messaggio

**Per uso commerciale:**
- Vercel Pro: $20/mese
- Neon Launch: $19/mese
- **Totale: ~$39/mese**

## Monitoring

- Vercel Analytics: https://vercel.com/[team]/[project]/analytics
- Vercel Logs: https://vercel.com/[team]/[project]/logs
- Neon Monitoring: https://console.neon.tech/app/projects/[project]

## Auto-Deploy

Ogni push su `main` triggera un deploy automatico su Vercel.
