import type { TimeoutService } from "../../application/services/TimeoutService.js";

export class TimeoutHandler {
  constructor(private timeoutService: TimeoutService) {}

  async handleExpiredHelpRequests(): Promise<void> {
    try {
      const processedCount = await this.timeoutService.handleExpiredRequests();
      
      if (processedCount > 0) {
        console.log(`⏰ Processed ${processedCount} expired help requests`);
      }
    } catch (error) {
      console.error('❌ Error handling expired help requests:', error);
    }
  }

  start(intervalMinutes: number = 5): void {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(() => {
      this.handleExpiredHelpRequests();
    }, intervalMs);

    console.log(`⏰ Timeout handler started (checking every ${intervalMinutes} minutes)`);
    
    // Run immediately on startup
    this.handleExpiredHelpRequests();
  }
}