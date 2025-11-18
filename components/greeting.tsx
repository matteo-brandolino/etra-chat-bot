import { motion } from "framer-motion";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";

const suggestedQuestions = [
  {
    title: "Cosa si butta oggi?",
    prompt: "Cosa si raccoglie oggi a Bassano del Grappa zona A?",
  },
  {
    title: "In che zona abito?",
    prompt: "In che zona mi trovo se abito in Via Roma 15 a Cittadella?",
  },
  {
    title: "Quando passa la plastica?",
    prompt: "Quando passa la raccolta della plastica a Marostica zona A?",
  },
  {
    title: "Prossima raccolta vetro",
    prompt: "Qual è la prossima data di raccolta del vetro a Piombino Dese zona B?",
  },
];

export const Greeting = ({
  chatId,
  sendMessage,
}: {
  chatId?: string;
  sendMessage?: UseChatHelpers<ChatMessage>["sendMessage"];
}) => {
  const handleSuggestionClick = (prompt: string) => {
    if (sendMessage) {
      // Update URL before sending message (like simple-input does)
      if (chatId) {
        window.history.pushState({}, "", `/chat/${chatId}`);
      }

      sendMessage({
        role: "user",
        parts: [{ type: "text", text: prompt }],
      });
    }
  };

  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        Ciao!
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-muted-foreground md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        Come posso aiutarti oggi con la raccolta differenziata?
      </motion.div>

      {sendMessage && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.7 }}
        >
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(question.prompt)}
              className="group flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-muted dark:border-border dark:bg-card dark:hover:border-primary/50 dark:hover:bg-muted"
            >
              <div className="font-medium text-sm">{question.title}</div>
              <div className="text-muted-foreground text-xs line-clamp-2">
                {question.prompt}
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};
