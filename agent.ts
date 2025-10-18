import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as livekit from '@livekit/agents-plugin-livekit';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import dotenv from 'dotenv';
import { SALON_SYSTEM_PROMPT } from './data/SALON_PROMPT.js';
import { fileURLToPath } from 'node:url';
import { unknownTopics } from './data/UNKNOWN_TOPIC.js';
import { getDb } from './config/db.js';
import { setupDependencies } from './src/di-container.js';
import { ConversationEntryType, RequestStatus } from './src/domain/entities/Enums.js';
import { ObjectId } from 'mongodb';


dotenv.config({ path: '.env.local' });

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    const vad = ctx.proc.userData.vad! as silero.VAD;

    const assistant = new voice.Agent({ instructions: SALON_SYSTEM_PROMPT });

    const session = new voice.AgentSession({
      vad,
      stt: "assemblyai/universal-streaming:en",
      llm: "openai/gpt-4.1-mini",
      tts: "cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
      turnDetection: new livekit.turnDetector.MultilingualModel(),
    });

    await ctx.connect();
    console.log("✅ Connected to room:", ctx.room.name);

    await session.start({
      agent: assistant,
      room: ctx.room,
      inputOptions: { noiseCancellation: BackgroundVoiceCancellation() },
    });

    console.log("✅ Session started with STT:", session.stt, "TTS:", session.tts);

    // Initialize dependencies
    const db = await getDb();
    const dependencies = setupDependencies(db);
    const { 
      conversationService, 
      knowledgeService, 
      liveKitEscalationHandler 
    } = dependencies;

    // Use room name as conversationId
    const conversationId : ObjectId = new ObjectId(ctx.room.name) ;

    // Initial AI greeting saved as first message
    await conversationService.saveMessage(conversationId!, {
      text: "Session started. Ready to assist the user.",
      type: ConversationEntryType.AI,
      timestamp: new Date().toISOString(),
    });

    // Listen for supervisor responses
    ctx.room.on('dataReceived', async (payload, participant, kind, topic) => {
      if (topic === 'supervisor_response') {
        try {
          const textDecoder = new TextDecoder();
          const data = JSON.parse(textDecoder.decode(payload));
          
          if (data.answer && data.conversationId === conversationId) {
            console.log('🤖 Supervisor response received:', data.answer);
            
            const responseText = `The supervisor provided an answer to your question. You asked: "${data.question}". The answer is: "${data.answer}".`;
            
            // Send the supervisor's answer to user
            await session.say(responseText);
            
            // Save to conversation
            await conversationService.saveMessage(conversationId!, {
              text: data.answer,
              type: ConversationEntryType.AI,
              timestamp: new Date().toISOString(),
            });
            
            // Update conversation status
            await conversationService.returnToActiveStatus(conversationId!);
          }
        } catch (error) {
          console.error('Error handling supervisor response:', error);
        }
      }
    });

    // Listen to user transcriptions
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (ev) => {
      if (!ev.transcript || !ev.isFinal) return;

      const userMessage = ev.transcript;

      // Save user message
      await conversationService.saveMessage(conversationId!, {
        text: userMessage,
        type: ConversationEntryType.USER,
        timestamp: new Date().toISOString(),
      });

      // 1. FIRST check knowledge base
      const knowledgeAnswer = await knowledgeService.findAnswer(userMessage);
      if (knowledgeAnswer) {
        console.log('🎓 Using knowledge base answer for:', userMessage);
        
        const responseText = `The knowledge base provided an answer to your question. You asked: "${userMessage}". The answer is: "${knowledgeAnswer}".`;
        
        // Send knowledge base answer
        await session.say(responseText);

        // Update conversation status
        await conversationService.returnToActiveStatus(conversationId!);
        
        // Save AI response
        await conversationService.saveMessage(conversationId!, {
          text: responseText,
          type: ConversationEntryType.AI,
          timestamp: new Date().toISOString(),
        });
        
        return; // Stop further processing
      }

      // 2. THEN check for escalation (only if no knowledge base answer)
      const escalated = await liveKitEscalationHandler.checkForEscalation(
        userMessage, 
        session, 
        ctx, 
        unknownTopics
      );
      
      if (escalated) {
        await conversationService.updateStatus(conversationId!, RequestStatus.WAITING_FOR_HELP);
      }
    });

    // Listen to AI generated messages and save them
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, async (ev) => {
      const { textContent, role, createdAt } = ev.item;
      if (!textContent) return;

      await conversationService.saveMessage(conversationId!, {
        text: textContent,
        type: role === 'user' ? ConversationEntryType.USER : ConversationEntryType.AI,
        timestamp: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      });
    });

    // Initial AI greeting
    await session.generateReply({
      instructions: 'Greet the user and offer your assistance.',
    });

    ctx.room.on('disconnected', () => console.log('Room disconnected'));
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));