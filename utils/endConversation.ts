import type { JobContext, voice } from "@livekit/agents";
import { RequestStatus } from "../interface.js";



// List of topics that should trigger escalation
  const endTopics = [
   "end",
   "close",
   "goodbye"
  ];

export async function checkForEndConversation(
  text: string,
  session: voice.AgentSession,
  ctx: JobContext
): Promise<boolean> {
  if (!text) return false;

    const escalatedTexts = new Set<string>();

  console.log("🔍 Checking for end convo in text:", text);


  const shouldEscalate = endTopics.some((topic) =>
    text.toLowerCase().includes(topic.toLowerCase())
  );

  if (shouldEscalate && !escalatedTexts.has(text)) {
    console.log("🆘 END CONVO TRIGGERED for:", text);
    escalatedTexts.add(text);

    // Send data to frontend with required `reliable` flag
    if (ctx.room) {
      try {
        await ctx.room.localParticipant?.publishData(
          new TextEncoder().encode(
            JSON.stringify({
              type: RequestStatus.RESOLVED,
              reason: text,
              timestamp: new Date().toISOString(),
            })
          ),
          { topic: "end_conversation", reliable: true } // ✅ add reliable
        );
      } catch (error) {
        console.error("❌ Failed to send end conversation data:", error);
      }
    }

    // Interrupt with end conversation message
    try {
  // Interrupt any ongoing speech
  session.interrupt();

  // Now safely say the end conversation message
  await session.say(
    "The conversation has been ended.",
    { allowInterruptions: true } // optional
  );

//   session.close();
  console.log("🗣️ End conversation message spoken");
} catch (error) {
  console.error("❌ Failed to speak end conversation message:", error);
}


    return true;
  }

  return false;
}
