import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dateTool = createTool({
  id: 'get-current-date',
  description: 'Ottiene la data corrente nel formato YYYY-MM-DD. Usa questo tool quando l\'utente chiede informazioni relative a "oggi", "domani", "questa settimana", o qualsiasi riferimento temporale.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    date: z.string().describe('Data corrente in formato YYYY-MM-DD'),
    dayOfWeek: z.string().describe('Giorno della settimana in italiano'),
    formatted: z.string().describe('Data formattata in italiano (es: "lunedì 4 novembre 2024")'),
  }),
  execute: async () => {
    logger.debug('Date Tool called - getting current date');
    const now = new Date();

    // Formato YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    // Giorno della settimana in italiano
    const daysOfWeek = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const dayOfWeek = daysOfWeek[now.getDay()];

    // Mesi in italiano
    const months = [
      'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    const monthName = months[now.getMonth()];

    // Data formattata in italiano
    const formatted = `${dayOfWeek} ${now.getDate()} ${monthName} ${year}`;

    const result = {
      date,
      dayOfWeek,
      formatted,
    };

    logger.debug('Date Tool result:', result);
    return result;
  },
});
