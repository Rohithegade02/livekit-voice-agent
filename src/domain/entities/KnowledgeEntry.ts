export interface KnowledgeEntry {
  _id?: string;
  question: string;
  answer: string;
  sourceHelpRequestId: string;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
}