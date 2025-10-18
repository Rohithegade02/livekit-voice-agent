export interface INotificationService {
  sendSupervisorResponse(roomName: string, answer: string): Promise<void>;
}