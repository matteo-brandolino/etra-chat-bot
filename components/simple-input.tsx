"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { memo, useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { ArrowUpIcon, StopIcon } from "./icons";
import { Button } from "./ui/button";

function PureSimpleInput({
  chatId,
  input,
  setInput,
  status,
  sendMessage,
  stop,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  status: UseChatHelpers<ChatMessage>["status"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  stop: UseChatHelpers<ChatMessage>["stop"];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "streaming" || status === "submitted") {
      stop();
      return;
    }

    if (!input.trim()) return;

    // Update URL before sending message (like original ai-chatbot)
    window.history.pushState({}, "", `/chat/${chatId}`);

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    });

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex w-full items-end gap-2">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          rows={1}
          style={{ maxHeight: "200px" }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() && status !== "streaming" && status !== "submitted"}
          className="absolute bottom-2 right-2 h-8 w-8 rounded-lg"
        >
          {status === "streaming" || status === "submitted" ? (
            <StopIcon size={16} />
          ) : (
            <ArrowUpIcon size={16} />
          )}
        </Button>
      </div>
    </form>
  );
}

export const SimpleInput = memo(PureSimpleInput, (prevProps, nextProps) => {
  return (
    prevProps.input === nextProps.input &&
    prevProps.status === nextProps.status
  );
});
