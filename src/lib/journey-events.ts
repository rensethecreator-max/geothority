import { triggerJourneyEvent } from "@/lib/email-journey-service";
import { triggerPushJourneyEvent } from "@/lib/push-notification-service";

export async function recordJourneyMilestone(userId: string, eventName: string) {
  await Promise.allSettled([
    triggerJourneyEvent(userId, eventName),
    triggerPushJourneyEvent(userId, eventName),
  ]);
}
