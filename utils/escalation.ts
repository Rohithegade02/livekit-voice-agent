import type { JobContext, voice } from "@livekit/agents";
import { RequestStatus, HelpRequestStatus } from "../interface.js";
import { updateSessionStatus } from "./conversation.js";
import { createHelpRequest } from "./helpRequests.js";

// List of topics that should trigger escalation
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

export async function checkForEscalation(
  text: string,
  session: voice.AgentSession,
  ctx: JobContext
): Promise<boolean> {
  if (!text) return false;

  console.log("🔍 Checking for escalation in text:", text);

  const shouldEscalate = unknownTopics.some((topic) =>
    text.toLowerCase().includes(topic.toLowerCase())
  );

  if (shouldEscalate) {
    console.log("🆘 ESCALATION TRIGGERED for:", text);

    // 1. Create help request in database
    const conversationId = ctx.room.name;
    const helpRequestId = await createHelpRequest(conversationId!, text);
    
    // 2. Update conversation status
    await updateSessionStatus(conversationId!, RequestStatus.WAITING_FOR_HELP);

    // 3. Send data to frontend
    if (ctx.room) {
      try {
        await ctx.room.localParticipant?.publishData(
          new TextEncoder().encode(
            JSON.stringify({
              type: "HELP_REQUEST",
              reason: text,
              helpRequestId: helpRequestId.toString(),
              timestamp: new Date().toISOString(),
            })
          ),
          { topic: "escalation", reliable: true }
        );
        console.log("📤 Escalation data sent to frontend");
      } catch (error) {
        console.error("❌ Failed to send escalation data:", error);
      }
    }

    // 4. Interrupt with escalation message
    try {
      session.interrupt();
      await session.say(
        "Let me check with my supervisor and get back to you.",
        { allowInterruptions: true }
      );
      console.log("🗣️ Escalation message spoken");
    } catch (error) {
      console.error("❌ Failed to speak escalation message:", error);
    }

    return true;
  }

  return false;
}