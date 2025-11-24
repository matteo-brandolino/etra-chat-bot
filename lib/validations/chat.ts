import { z } from 'zod';

export const chatMessagePartSchema = z.object({
  type: z.enum(['text', 'image']),
  text: z.string().optional(),
  image: z.string().url().optional(),
});

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string().min(1).max(10000),
    z.array(chatMessagePartSchema),
  ]),
  id: z.string().optional(),
  createdAt: z.date().optional(),
  parts: z.array(chatMessagePartSchema).optional(),
  attachments: z.array(z.any()).optional(),
});

export const chatRequestSchema = z.object({
  id: z.string().uuid().optional(),
  messages: z.array(chatMessageSchema).min(1).max(50),
  modelId: z.string().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
