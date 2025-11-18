import { NextRequest } from "next/server";
import { saveMessages } from "@/lib/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, message } = body;

    if (!chatId || !message) {
      return new Response(JSON.stringify({ error: "chatId and message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Salva il messaggio nel database
    await saveMessages({
      messages: [{
        id: message.id,
        chatId,
        role: message.role,
        parts: message.parts || [],
        attachments: message.attachments || [],
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
      }],
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error saving message:", error);
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
