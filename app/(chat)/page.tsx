import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Guida ETRA Rifiuti - Assistente Raccolta Differenziata Veneto",
  description:
    "Assistente AI non ufficiale per la raccolta differenziata ETRA. Trova il calendario 2025, la tua zona e cosa buttare oggi in oltre 80 comuni del Veneto.",
  keywords: [
    "ETRA",
    "raccolta differenziata",
    "calendario rifiuti",
    "Veneto",
    "Bassano del Grappa",
    "Asiago",
    "Cittadella",
    "zone raccolta",
    "cosa buttare oggi",
  ],
  alternates: {
    canonical: "https://etra-chat-bot.vercel.app",
  },
};

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          isReadonly={false}
          key={id}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie.value}
        initialMessages={[]}
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
