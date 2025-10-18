export enum RequestStatus {
  ACTIVE = 'ACTIVE',
  WAITING_FOR_HELP = 'WAITING_FOR_HELP', 
  COMPLETED = 'COMPLETED'
}

export enum HelpRequestStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  UNRESOLVED = 'UNRESOLVED'
}


export enum ConversationEntryType {
  USER = 'user',
  AI = 'ai'
}