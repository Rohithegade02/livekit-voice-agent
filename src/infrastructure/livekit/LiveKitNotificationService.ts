import { DataPacket_Kind, RoomServiceClient } from 'livekit-server-sdk';
import type { INotificationService } from '../../domain/services/INotificationService.js';

export class LiveKitNotificationService implements INotificationService {
  private roomService: RoomServiceClient;

  constructor() {
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const livekitUrl = process.env.LIVEKIT_URL!;
    
    this.roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
  }

  async sendSupervisorResponse(roomName: string, answer: string): Promise<void> {
    const data = new TextEncoder().encode(JSON.stringify({
      type: 'supervisor_response',
      answer,
      conversationId: roomName,
      timestamp: new Date().toISOString()
    }));

    await this.roomService.sendData(
      roomName,
      data,
      DataPacket_Kind.RELIABLE,
      { topic: 'supervisor_response' }
    );
  }
}