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
import {  SALON_SYSTEM_PROMPT } from './data/SALON_PROMPT.js';
import { fileURLToPath } from 'node:url';
import { unknownTopics } from './data/UNKNOWN_TOPIC.js';
import { getDb } from './src/infrastructure/database/config/db.js';
import { setupDependencies } from './src/di-container.js';
import { ConversationEntryType, RequestStatus } from './src/domain/entities/Enums.js';
import { ObjectId } from 'mongodb';


dotenv.config({ path: '.env.local' });

let lastUserMessage = '';
let lastMessageTime = 0;

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


    // Initialize dependencies
    const db = await getDb();
    const dependencies = setupDependencies(db);
    const { 
      conversationService, 
      knowledgeService, 
      liveKitEscalationHandler 
    } = dependencies;

    // Use room name as conversationId
    const conversationId  = ctx.room.name ;

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
            
            console.log('🎓 Using supervisor answer for:', data);
            const responseText = `The supervisor provided an answer to your question.  The answer is: "${data.answer}".`;
            
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

    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async (ev) => {
      if (!ev.transcript || !ev.isFinal) return;
    
      const userMessage = ev.transcript;
    
      const now = Date.now();
      
      // 👇 Prevent same message within 2 seconds
      if (userMessage === lastUserMessage && (now - lastMessageTime) < 2000) {
        console.log('🔄 Skipping duplicate message:', userMessage);
        return;
      }
      
      lastUserMessage = userMessage;
      lastMessageTime = now;
      
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

        // INTERRUPT any automatic responses
        session.interrupt();
        const responseText = 'The Knowledge base has provided an answer for your asked question . The response is '+ knowledgeAnswer; // Direct answer
        
        // Send knowledge base answer
        await session.say(responseText, {
          allowInterruptions: false,
          
        });
    
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
    
      // 2. AI DECIDES: Use a promise to capture the AI response
      let aiResponseText = '';
      let responseResolve: (value: string) => void;
      const responsePromise = new Promise<string>((resolve) => {
        responseResolve = resolve;
      });
      
      // Listen for the AI response (THIS WILL HANDLE ALL AI RESPONSES)
      const onConversationItem = (ev: any) => {
        const { textContent, role, createdAt } = ev.item;
        if (role === 'assistant' && textContent) {
          aiResponseText = textContent;
          
          // Save ALL AI responses to conversation
          conversationService.saveMessage(conversationId!, {
            text: textContent,
            type: ConversationEntryType.AI,
            timestamp: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
          }).catch(console.error);
          
          responseResolve(textContent);
          session.off(voice.AgentSessionEventTypes.ConversationItemAdded, onConversationItem);
        }
      };
    
      session.on(voice.AgentSessionEventTypes.ConversationItemAdded, onConversationItem);
    
      try {
        // Generate the response
        // await session.generateReply({
        //   instructions: `Current user question: "${userMessage}" - If this requires human assistance based on your escalation criteria, respond with "ESCALATE:" followed by the reason.`,
        // });
    
        // Wait for the AI response text
        const responseText = await responsePromise;
        // Check if AI decided to escalate
        const shouldEscalate = responseText.includes('ESCALATE:');
    
        if (shouldEscalate) {
          console.log('🤖 AI decided to escalate:', userMessage);
          
          // EXTRACT THE CLEAN MESSAGE (remove ESCALATE: prefix)
          const cleanMessage = responseText.replace(/^ESCALATE:.*?\n/, '').trim();
          
          // Update the saved message with clean version
          await conversationService.saveMessage(conversationId!, {
            text: cleanMessage,
            type: ConversationEntryType.AI,
            timestamp: new Date().toISOString(),
          });
          
          // Trigger escalation WITHOUT speaking again
          const helpRequestId = await liveKitEscalationHandler.createHelpRequestOnly(
            userMessage, 
            ctx
          );
          
          if (helpRequestId) {
            await conversationService.updateStatus(conversationId!, RequestStatus.WAITING_FOR_HELP);
            console.log('✅ Escalation completed without duplicate messages');
          }
          
        } else {
          // AI handled the response normally
          console.log('🤖 AI handling response normally');
          // The response is already saved by the conversation item listener
        }
      } catch (error) {
        console.error('Error in AI response generation:', error);
        session.off(voice.AgentSessionEventTypes.ConversationItemAdded, onConversationItem);
        
        // Fallback: Use semantic detection if AI generation fails
        const escalated = await liveKitEscalationHandler.checkForEscalation(
          userMessage, 
          session, 
          ctx, 
          unknownTopics
        );
        
        if (escalated) {
          await conversationService.updateStatus(conversationId!, RequestStatus.WAITING_FOR_HELP);
        }
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