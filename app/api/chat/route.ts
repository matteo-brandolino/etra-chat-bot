import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { mastra } from "@/app/mastra";
import { generateUUID } from "@/lib/utils";
import { saveChat, saveMessages, getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { db } from "@/lib/db/connection";
import { user } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatRequestSchema } from "@/lib/validations/chat";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function transformMessages(messages: any[]) {
  return messages.map((msg: any) => {
    if (msg.content && typeof msg.content === "string") {
      return { role: msg.role, content: msg.content };
    }

    if (msg.parts && Array.isArray(msg.parts)) {
      const textParts = msg.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n");

      return { role: msg.role, content: textParts || "" };
    }

    return { role: msg.role, content: msg.content || "" };
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    const { success, headers } = await checkRateLimit(ip);

    if (!success) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, {
        status: 429,
        headers
      });
    }

    const body = await req.json();
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json({
        error: 'Invalid request format',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { id = generateUUID(), messages } = validation.data;

    const cookieStore = await cookies();
    let anonymousUserId = cookieStore.get("anonymous-user-id")?.value;

    if (!anonymousUserId) {
      anonymousUserId = generateUUID();
      cookieStore.set("anonymous-user-id", anonymousUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });

      try {
        await db.insert(user).values({
          id: anonymousUserId,
          email: `anonymous-${anonymousUserId}@local`,
          password: null,
        }).onConflictDoNothing();
      } catch (error) {
        logger.error("Error creating user:", error);
      }
    }

    const existingChat = await getChatById({ id });

    if (!existingChat) {
      try {
        await saveChat({
          id,
          userId: anonymousUserId,
          title: "New Chat",
          visibility: "private",
        });
      } catch (error) {
        logger.error("Error creating chat:", error);
      }
    }

    const existingMessages = await getMessagesByChatId({ id });
    const existingMessageIds = new Set(existingMessages.map(m => m.id));
    const newMessages = messages.filter((msg: any) => !existingMessageIds.has(msg.id));

    if (newMessages.length > 0) {
      try {
        await saveMessages({
          messages: newMessages.map((msg: any) => ({
            id: msg.id || generateUUID(),
            chatId: id,
            role: msg.role,
            parts: msg.parts || [],
            attachments: msg.attachments || [],
            createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
          })),
        });
      } catch (error) {
        logger.error("Error saving messages:", error);
      }
    }

    const transformedMessages = transformMessages(messages);
    const ragAgent = mastra.getAgent("ragAgent");
    const stream = await ragAgent.stream(transformedMessages, {
      format: "aisdk",
      threadId: id,
      resourceId: id,
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("API error:", error);
    return Response.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
