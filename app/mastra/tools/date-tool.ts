import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const dateTool = createTool({
  id: 'get-current-date',
  description: 'Ottiene la data corrente (YYYY-MM-DD) per riferimenti temporali come "oggi", "domani", "questa settimana".',
  inputSchema: z.object({}),
  outputSchema: z.object({
    date: z.string(),
    dayOfWeek: z.string(),
    formatted: z.string(),
  }),
  execute: async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    const daysOfWeek = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const dayOfWeek = daysOfWeek[now.getDay()];

    const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const monthName = months[now.getMonth()];

    const formatted = `${dayOfWeek} ${now.getDate()} ${monthName} ${year}`;

    logger.debug('Date Tool:', { date, dayOfWeek, formatted });
    return { date, dayOfWeek, formatted };
  },
});
