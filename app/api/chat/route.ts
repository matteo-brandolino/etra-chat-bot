import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { mastra } from "@/app/mastra";
import { generateUUID } from "@/lib/utils";
import { saveChat, saveMessages, getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatRequestSchema } from "@/lib/validations/chat";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trasforma i messaggi dal formato UI al formato OpenAI standard
function transformMessages(messages: any[]) {
  return messages.map((msg: any) => {
    // Se il messaggio ha già il formato semplice (role + content), usalo direttamente
    if (msg.content && typeof msg.content === "string") {
      return {
        role: msg.role,
        content: msg.content,
      };
    }

    // Se il messaggio ha "parts", trasformalo
    if (msg.parts && Array.isArray(msg.parts)) {
      const textParts = msg.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n");

      return {
        role: msg.role,
        content: textParts || "",
      };
    }

    // Fallback: ritorna il messaggio così com'è
    return {
      role: msg.role,
      content: msg.content || "",
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'anonymous';

    const { success, headers } = await checkRateLimit(ip);

    if (!success) {
      return new Response(JSON.stringify({
        error: 'Too many requests. Please try again later.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
    }

    const body = await req.json();

    // Validate input with Zod
    const validation = chatRequestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({
        error: 'Invalid request format',
        details: validation.error.issues
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id, messages } = validation.data;

    // 1. Ottieni o crea un anonymous user ID
    const cookieStore = await cookies();
    let anonymousUserId = cookieStore.get("anonymous-user-id")?.value;
    let isNewUser = false;

    if (!anonymousUserId) {
      anonymousUserId = generateUUID();
      isNewUser = true;
      cookieStore.set("anonymous-user-id", anonymousUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
      logger.debug("Created new anonymous user ID:", anonymousUserId);
    } else {
      logger.debug("Using existing anonymous user ID:", anonymousUserId);
    }

    // Assicurati che l'utente esista nel database
    const client = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(client);
    try {
      await db.insert(user).values({
        id: anonymousUserId,
        email: `anonymous-${anonymousUserId}@local`,
        password: null,
      }).onConflictDoNothing();
      if (isNewUser) {
        logger.debug("Created anonymous user in database");
      } else {
        logger.debug("Ensured anonymous user exists in database");
      }
    } catch (error: any) {
      logger.error("Error ensuring anonymous user exists:", error);
    }
    await client.end();

    // 2. Verifica se la chat esiste, altrimenti creala
    logger.debug("Checking if chat exists:", id);
    const existingChat = await getChatById({ id });

    if (!existingChat) {
      logger.debug("Creating new chat:", { id, userId: anonymousUserId });
      try {
        await saveChat({
          id,
          userId: anonymousUserId,
          title: "New Chat",
          visibility: "private",
        });
        logger.success("Chat created successfully");
      } catch (error) {
        // Se la chat esiste già (race condition), ignora l'errore
        logger.debug("Error creating chat (might already exist):", error);
      }
    } else {
      logger.debug("Chat already exists");
    }

    // 3. Salva solo i messaggi nuovi (evita duplicati)
    // Recupera i messaggi esistenti per questa chat
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
        // Non bloccare lo streaming se il salvataggio fallisce
      }
    }

    const transformedMessages = transformMessages(messages);

    logger.debug("Calling Mastra agent directly:", {
      chatId: id,
      messageCount: transformedMessages.length,
      lastMessage: transformedMessages[transformedMessages.length - 1],
    });

    // Ottieni l'agent ragAgent da Mastra
    const ragAgent = mastra.getAgent("ragAgent");
    logger.debug("Agent retrieved:", ragAgent?.name);

    // Chiama stream con formato AI SDK
    // Note: format: "aisdk" è deprecato ma necessario per avere toUIMessageStreamResponse()
    logger.debug("Starting stream with options:", {
      format: "aisdk",
      threadId: id,
      resourceId: id,
      messageCount: transformedMessages.length,
    });

    let stream;
    try {
      stream = await ragAgent.stream(transformedMessages, {
        format: "aisdk",
        threadId: id,
        resourceId: id,
      });
      logger.success("Stream created successfully");
    } catch (streamError) {
      logger.error("Error creating stream:", streamError);
      throw streamError;
    }

    // Ritorna la risposta in formato compatibile con useChat
    try {
      const response = stream.toUIMessageStreamResponse();
      logger.success("Response created, streaming to client");
      return response;
    } catch (responseError) {
      logger.error("Error creating response:", responseError);
      throw responseError;
    }
  } catch (error) {
    logger.error("API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
