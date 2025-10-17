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
import { RequestStatus } from './interface.js';
import { fileURLToPath } from 'node:url';
import { checkForEscalation } from './utils/escalation.js';
import { returnToActiveStatus, saveConversation, updateSessionStatus } from './utils/conversation.js';
import { findAnswerInKnowledgeBase } from './utils/knowledgeService.js';

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

    ctx.room.on('dataReceived', (payload, participant, kind, topic) => {
      if (topic === 'supervisor_response') {
        try {
          const textDecoder = new TextDecoder();
          const data = JSON.parse(textDecoder.decode(payload));
          
          if (data.answer && data.conversationId === conversationId) {
            console.log('🤖 Supervisor response received:', data.answer);
            
            // Send the supervisor's answer to user
            session.say(data.answer);
            
            // Save to conversation
            saveConversation(conversationId!, {
              text: data.answer,
              type: 'ai',
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Error handling supervisor response:', error);
        }
      }
    });
    // Use room name as conversationId
    const conversationId = ctx.room.name;

    // Initial AI greeting saved as first message
    await saveConversation(conversationId!, {
      text: "Session started. Ready to assist the user.",
      type: 'ai',
      timestamp: new Date().toISOString(),
    });

    // Listen to AI generated messages
   session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (ev) => {
  if (!ev.transcript || !ev.isFinal) return;

  const userMessage = ev.transcript;

  // Save user message
  await saveConversation(conversationId!, {
    text: userMessage,
    type: 'user',
    timestamp: new Date().toISOString(),
  });

  // 1. FIRST check knowledge base
  const knowledgeAnswer = await findAnswerInKnowledgeBase(userMessage);
  if (knowledgeAnswer) {
    console.log('🎓 Using knowledge base answer for:', userMessage);
    
    // Send knowledge base answer
    
    await session.say(knowledgeAnswer);
    
    await returnToActiveStatus(conversationId!);

    
    // Save AI response
    await saveConversation(conversationId!, {
      text: knowledgeAnswer,
      type: 'ai',
      timestamp: new Date().toISOString(),
    });
    
    return; // Stop further processing
  }

  // 2. THEN check for escalation (only if no knowledge base answer)
  const escalated = await checkForEscalation(userMessage, session, ctx);
  if (escalated) {
    await updateSessionStatus(conversationId!, RequestStatus.WAITING_FOR_HELP);
  }
});

    // Initial AI greeting
    await session.generateReply({
      instructions: 'Greet the user and offer your assistance.',
    });




    ctx.room.on('disconnected', () => console.log('Room disconnected'));

  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));