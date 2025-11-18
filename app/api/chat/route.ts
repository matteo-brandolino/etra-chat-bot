import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { mastra } from "@/app/mastra";
import { generateUUID } from "@/lib/utils";
import { saveChat, saveMessages, getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "@/lib/db/schema";

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
    const body = await req.json();
    const { id, messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      console.log("🆔 Created new anonymous user ID:", anonymousUserId);
    } else {
      console.log("🆔 Using existing anonymous user ID:", anonymousUserId);
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
        console.log("✅ Created anonymous user in database");
      } else {
        console.log("✅ Ensured anonymous user exists in database");
      }
    } catch (error: any) {
      console.error("Error ensuring anonymous user exists:", error);
    }
    await client.end();

    // 2. Verifica se la chat esiste, altrimenti creala
    console.log("🔍 Checking if chat exists:", id);
    const existingChat = await getChatById({ id });

    if (!existingChat) {
      console.log("💾 Creating new chat:", { id, userId: anonymousUserId });
      try {
        await saveChat({
          id,
          userId: anonymousUserId,
          title: "New Chat",
          visibility: "private",
        });
        console.log("✅ Chat created successfully");
      } catch (error) {
        // Se la chat esiste già (race condition), ignora l'errore
        console.error("❌ Error creating chat:", error);
        console.log("Chat might already exist, continuing...");
      }
    } else {
      console.log("✅ Chat already exists");
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
        console.error("Error saving messages:", error);
        // Non bloccare lo streaming se il salvataggio fallisce
      }
    }

    const transformedMessages = transformMessages(messages);

    console.log("🚀 Calling Mastra agent directly:", {
      chatId: id,
      messageCount: transformedMessages.length,
      lastMessage: transformedMessages[transformedMessages.length - 1],
    });

    // Ottieni l'agent ragAgent da Mastra
    const ragAgent = mastra.getAgent("ragAgent");
    console.log("✅ Agent retrieved:", ragAgent?.name);

    // Chiama stream con formato AI SDK
    // Note: format: "aisdk" è deprecato ma necessario per avere toUIMessageStreamResponse()
    console.log("📤 Starting stream with options:", {
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
      console.log("✅ Stream created successfully");
    } catch (streamError) {
      console.error("❌ Error creating stream:", streamError);
      throw streamError;
    }

    // Ritorna la risposta in formato compatibile con useChat
    try {
      const response = stream.toUIMessageStreamResponse();
      console.log("✅ Response created, streaming to client");
      return response;
    } catch (responseError) {
      console.error("❌ Error creating response:", responseError);
      throw responseError;
    }
  } catch (error) {
    console.error("❌ API error:", error);
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
