import { z } from 'zod';

export const chatMessagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  image: z.string().optional(),
}).passthrough();

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string().min(1).max(10000),
    z.array(chatMessagePartSchema),
  ]).optional(),
  id: z.string().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  parts: z.array(z.any()).optional(),
  attachments: z.array(z.any()).optional(),
}).passthrough().refine(
  (data) => data.content !== undefined || data.parts !== undefined,
  { message: "Either content or parts must be provided" }
);

export const chatRequestSchema = z.object({
  id: z.string().optional(),
  messages: z.array(chatMessageSchema).min(1).max(50),
  modelId: z.string().optional(),
}).passthrough();

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
