# LiveKit Voice Agent Backend

A clean architecture Node.js backend for a voice AI agent system with supervisor escalation and knowledge base management.

## 🏗️ Architecture Overview

This project follows Clean Architecture principles with clear separation of concerns:

```
src/
├── domain/              # Business logic & enterprise rules
│   ├── entities/        # Core business objects
│   ├── repositories/    # Interface definitions
│   └── use-cases/       # Application-specific business rules
├── application/         # Application business rules
│   ├── services/        # Use case implementations
│   └── dtos/            # Data transfer objects
├── infrastructure/      # External concerns
│   ├── database/        # MongoDB implementation
│   ├── livekit/         # LiveKit integration
│   └── config/          # Configuration
└── presentation/        # Delivery mechanisms
    ├── controllers/     # Request handlers
    └── routes/          # HTTP route definitions
```

## 📁 Project Structure

### Domain Layer (Business Core)

**entities/** - Core business objects:
- `HelpRequest.ts` - Help request entity
- `KnowledgeEntry.ts` - Knowledge base entries
- `Conversation.ts` - Conversation sessions
- `ConversationEntry.ts` - Individual messages
- `Enums.ts` - Status enums and constants

**repositories/** - Data access interfaces:
- `IHelpRequestRepository.ts`
- `IKnowledgeRepository.ts`
- `IConversationRepository.ts`
- `INotificationService.ts`

**use-cases/** - Business operations:
- `EscalateToSupervisorUseCase.ts`
- `ResolveHelpRequestUseCase.ts`
- `GetPendingHelpRequestsUseCase.ts`
- `ManageKnowledgeUseCase.ts`
- `HandleExpiredRequest.ts`

### Application Layer (Business Logic)

**services/** - Application services:
- `HelpRequestService.ts`
- `KnowledgeService.ts`
- `ConversationService.ts`
- `EscalationService.ts`

### Infrastructure Layer (External Concerns)

**database/repositories/** - MongoDB implementations:
- `HelpRequestRepository.ts`
- `KnowledgeRepository.ts`
- `ConversationRepository.ts`

**livekit/** - LiveKit integrations:
- `LiveKitNotificationService.ts`
- `LiveKitEscalationHandler.ts`

**config/** - Database configuration:
- `db.ts` - MongoDB connection

### Presentation Layer (Delivery)

**controllers/** - HTTP controllers:
- `HelpRequestController.ts`
- `KnowledgeController.ts`

**routes/** - Express route definitions:
- `helpRequestRoutes.ts`
- `knowledgeRoutes.ts`

## 🚀 Core Features

### 1. Voice Agent System
- LiveKit integration for real-time voice communication
- AI agent with STT/TTS capabilities
- Automatic conversation recording

### 2. Supervisor Escalation
- Automatic detection of topics requiring human assistance
- Real-time help request creation
- Supervisor dashboard for managing requests

### 3. Knowledge Base
- Auto-learning from supervisor responses
- Intelligent question matching
- Usage tracking and analytics

### 4. Real-time Notifications
- LiveKit data channels for instant updates
- Webhook support for room events
- Supervisor response delivery

## 🔧 API Endpoints

### Help Requests
- `GET /api/help-requests` - Get pending help requests
- `POST /api/help-requests/resolve` - Resolve a help request

### Knowledge Base
- `GET /api/knowledge` - Get all knowledge entries

## 🗄️ Database Schema

### Collections:
- `conversations` - Voice conversation sessions
- `help_requests` - Supervisor escalation requests
- `knowledge_entries` - Learned Q&A pairs

### Key Fields:

```typescript
// Help Request
{
  _id?: string;
  conversationId: string;
  question: string;
  createdAt: Date;
  resolvedAt?: Date;
  status: HelpRequestStatus;
  supervisorResponse?: string;
  knowledgeBaseEntryId?: string;
}


//Conversation
 {
  _id?: ObjectId;          
  conversationId: string;
  roomName: string;
  status: RequestStatus;
  startedAt: string;
  endedAt?: string;
  messages: ConversationEntry[];
  activeHelpRequestId?: ObjectId | string;
}

// Knowledge Entry
{
  _id?: string;
  question: string;
  answer: string;
  sourceHelpRequestId: string;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
}
```

## ⚙️ Configuration

### Environment Variables

```env
# MongoDB
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=
NEXT_PUBLIC_LIVEKIT_URL=
MONGODB_URI=
MONGODB_DB_NAME=
# Server
SUPERVISOR_PORT=3001
```

## 🛠️ Development

### Installation

```bash
pnpm install
```

### Running the Server

```bash
# Development
pnpm run dev:supervisor



### Running the Agent

```bash
# Development
pnpm run dev

```

## 🔄 Workflow

### Normal Conversation Flow:
1. User asks question via voice
2. AI checks knowledge base first
3. If answer exists, respond immediately
4. If not, AI attempts to answer using LLM

### Escalation Flow:
1. User asks complex/questionable topic
2. AI detects escalation trigger
3. Creates help request (status: PENDING)
4. Notifies supervisor via dashboard
5. AI tells user: "Let me check with supervisor"

### Supervisor Response Flow:
1. Supervisor views pending requests
2. Submits answer via dashboard
3. System creates knowledge base entry
4. Response delivered to user via LiveKit
5. Conversation status returns to ACTIVE


## 📈 Monitoring & Logging

Key log events:
- 🔍 Checking for escalation - Escalation detection
- 🆘 ESCALATION TRIGGERED - Help request created
- 🎓 Using knowledge base - KB answer reused
- 🤖 Supervisor response received - Response delivery
- ✅ Supervisor response sent - Notification success

## 🔮 Future Enhancements

- Enhanced NLP for better question matching
- Supervisor workload balancing
- Conversation analytics dashboard
- Multi-language support
- Advanced timeout handling with retries

