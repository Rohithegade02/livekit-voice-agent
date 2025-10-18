import type { JobContext, voice } from "@livekit/agents";
import type { EscalationService } from "../../services/EscalationService.js";
import type { ObjectId } from "mongodb";

export class LiveKitEscalationHandler {
  constructor(private escalationService: EscalationService) {}

  async checkForEscalation(
    text: string,
    session: voice.AgentSession,
    ctx: JobContext,
    unknownTopics: string[]
  ): Promise<boolean> {
    if (!text) return false;

    console.log("🔍 Checking for escalation in text:", text);

    const shouldEscalate = this.escalationService.shouldEscalate(text, unknownTopics);

    if (shouldEscalate) {
      console.log("🆘 ESCALATION TRIGGERED for:", text);

      // 1. Create help request and update conversation
      const conversationId = ctx.room.name;
      const helpRequestId = await this.escalationService.handleEscalation(conversationId!, text);
      
      // 2. Send data to frontend
      await this.sendEscalationData(ctx, text, helpRequestId);

      // 3. Speak escalation message
      await this.speakEscalationMessage(session);

      return true;
    }

    return false;
  }

  private async sendEscalationData(ctx: JobContext, text: string, helpRequestId: ObjectId): Promise<void> {
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
  }

  private async speakEscalationMessage(session: voice.AgentSession): Promise<void> {
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
  }
}