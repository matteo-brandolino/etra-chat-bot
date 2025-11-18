import type { ChatModel } from "./models";

// Sito pubblico - nessuna distinzione tra tipi di utente
type UserType = "public";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * Per tutti gli utenti (sito pubblico)
   */
  public: {
    maxMessagesPerDay: 1000, // Illimitato per uso pubblico
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },
};
