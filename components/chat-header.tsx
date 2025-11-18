"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "./icons";

type VisibilityType = "public" | "private";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();

  return (
    <header className="sticky top-0 flex flex-col bg-background border-b">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex flex-col">
          <h1 className="font-semibold text-lg">Guida ETRA Rifiuti</h1>
          <span className="text-xs text-muted-foreground">
            Servizio non ufficiale -{" "}
            <a
              href="https://www.etraspa.it"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              etraspa.it
            </a>
            {" "}-{" "}
            <Link href="/about" className="underline hover:text-foreground">
              Info
            </Link>
          </span>
        </div>

        <Button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
          size="sm"
        >
          <PlusIcon />
          <span className="ml-2">Nuova Chat</span>
        </Button>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.chatId === nextProps.chatId;
});
