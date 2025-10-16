// agent.ts
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
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Salon business prompt
const SALON_SYSTEM_PROMPT = `
You are a friendly AI assistant for "Bliss Beauty Salon". Here's our business information:

SALON DETAILS:
- Name: Bliss Beauty Salon
- Hours: Monday-Saturday 9AM-7PM, Sunday 10AM-5PM
- Services: Haircuts, coloring, styling, manicures, pedicures, facials
- Address: 123 Beauty Street, Glamour City
- Phone: (555) 123-4567
- We accept walk-ins but appointments are recommended

PRICING:
- Haircut: $45
- Hair coloring: $85-$120
- Manicure: $35
- Pedicure: $45
- Facial: $60

SPECIAL OFFERS:
- First-time customers get 15% off
- Student discount: 10% with valid ID
- Refer a friend and both get $20 off

RESPONSE GUIDELINES:
1. Be friendly and helpful
2. Answer questions about hours, services, pricing, and location
3. If you don't know the answer or the question is too complex, say "Let me get a human specialist to help you with that"
4. Keep responses concise and natural for voice conversation
`;

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
 entry: async (ctx: JobContext) => {
  const vad = ctx.proc.userData.vad! as silero.VAD;

  const assistant = new voice.Agent({
    instructions: SALON_SYSTEM_PROMPT,
  });

  const session = new voice.AgentSession({
    vad,
    stt: "assemblyai/universal-streaming:en",
    llm: "openai/gpt-4.1-mini",
    tts: "cartesia/sonic-2:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    turnDetection: new livekit.turnDetector.MultilingualModel(),
  });

  
  // ✅ FIRST: connect to the room
  await ctx.connect();
  console.log("✅ Connected to room:", ctx.room.name);

  // ✅ THEN: start the agent session (so audio is ready)
  await session.start({
    agent: assistant,
    room: ctx.room,
    inputOptions: {
      noiseCancellation: BackgroundVoiceCancellation(),
    },
  });

    console.log("✅ Session started with STT:", session.stt, "TTS:", session.tts);


    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
        if (!ev.transcript) return;

        // Only check escalation on final transcript
        if (ev.isFinal) {
            checkForEscalation(ev.transcript, session, ctx);
        }
    });


  // ✅ Log key events for debugging
 
  // ✅ Greet the user
  await session.generateReply({
    instructions: 'Greet the user and offer your assistance.',
  });

  ctx.room.on('disconnected', () => console.log('Room disconnected'));
},


});

// Helper function for escalation logic
async function checkForEscalation(
  text: string,
  session: voice.AgentSession,
  ctx: JobContext
): Promise<boolean> {
  if (!text) return false;

    const escalatedTexts = new Set<string>();

  console.log("🔍 Checking for escalation in text:", text);
  const unknownTopics = [
    "manager",
    "supervisor",
    "complaint",
    "refund",
    "refunds",
    "specific stylist",
    "employee",
    "schedule",
  ];

  const shouldEscalate = unknownTopics.some((topic) =>
    text.toLowerCase().includes(topic.toLowerCase())
  );

  if (shouldEscalate && !escalatedTexts.has(text)) {
    console.log("🆘 ESCALATION TRIGGERED for:", text);
    escalatedTexts.add(text);

    // Send data to frontend with required `reliable` flag
    if (ctx.room) {
      try {
        await ctx.room.localParticipant?.publishData(
          new TextEncoder().encode(
            JSON.stringify({
              type: "help_request",
              reason: text,
              timestamp: new Date().toISOString(),
            })
          ),
          { topic: "escalation", reliable: true } // ✅ add reliable
        );
        console.log("📤 Escalation data sent to frontend");
      } catch (error) {
        console.error("❌ Failed to send escalation data:", error);
      }
    }

    // Interrupt with escalation message
    try {
  // Interrupt any ongoing speech
  session.interrupt();

  // Now safely say the escalation message
  await session.say(
    "Let me check with my supervisor and get back to you.",
    { allowInterruptions: true } // optional
  );

  console.log("🗣️ Escalation message spoken");
} catch (error) {
  console.error("❌ Failed to speak escalation message:", error);
}


    return true;
  }

  return false;
}

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));