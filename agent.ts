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
import { saveConversation, updateSessionStatus } from './utils/conversation.js';

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

    // Use room name as conversationId
    const conversationId = ctx.room.name;

    // Initial AI greeting saved as first message
    await saveConversation(conversationId!, {
      text: "Session started. Ready to assist the user.",
      type: 'ai',
      timestamp: new Date().toISOString(),
    });

    // Listen to user transcriptions
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (ev) => {
      if (!ev.transcript || !ev.isFinal) return;

      // Save user message
      await saveConversation(conversationId!, {
        text: ev.transcript,
        type: 'user',
        timestamp: new Date().toISOString(),
      });

      // Check for escalation
      const escalated = await checkForEscalation(ev.transcript, session, ctx);
      if (escalated) {
        await updateSessionStatus(conversationId!, RequestStatus.WAITING_FOR_HELP);
      }
    });

    // Listen to AI generated messages
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, async (ev) => {
      const { textContent, role, createdAt } = ev.item;
      if (!textContent) return;

      await saveConversation(conversationId!, {
        text: textContent,
        type: role === 'user' ? 'user' : 'ai',
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