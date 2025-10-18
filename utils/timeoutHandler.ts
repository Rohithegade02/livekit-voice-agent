import { getDb } from '../config/db.js';
import { HelpRequestStatus, RequestStatus } from '../src/domain/entities/Enums.js';

export async function handleExpiredHelpRequests() {
  try {
    const db = await getDb();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Find expired pending requests
    const expiredRequests = await db.collection('help_requests')
      .find({
        status: HelpRequestStatus.PENDING,
        createdAt: { $lt: thirtyMinutesAgo.toISOString() }
      })
      .toArray();

    for (const request of expiredRequests) {
      // Mark as unresolved
      await db.collection('help_requests').updateOne(
        { _id: request._id },
        {
          $set: {
            status: HelpRequestStatus.UNRESOLVED,
            resolvedAt: new Date().toISOString()
          }
        }
      );

      // Update conversation status
      await db.collection('conversations').updateOne(
        { activeHelpRequestId: request._id },
        {
          $set: {
            status: RequestStatus.ACTIVE,
            activeHelpRequestId: null
          }
        }
      );

      console.log(`⏰ Marked help request as unresolved: ${request.question}`);
    }

    console.log(`🕒 Processed ${expiredRequests.length} expired help requests`);
  } catch (error) {
    console.error('Error handling expired help requests:', error);
  }
}

// Run this periodically
export function startTimeoutHandler() {
  setInterval(handleExpiredHelpRequests, 5 * 60 * 1000); // Run every 5 minutes
  console.log('⏰ Timeout handler started');
}