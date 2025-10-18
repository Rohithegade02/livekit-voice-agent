import type { ConversationEntryType } from "./Enums.js";

export interface ConversationEntry {
  text: string;
  type: ConversationEntryType;
  timestamp: string;
}
