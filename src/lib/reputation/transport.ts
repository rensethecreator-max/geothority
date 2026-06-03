import { TwilioReputationTransport } from "@/lib/reputation/twilio";
import { EmailReputationTransport } from "@/lib/reputation/email";

export type ReputationMessageChannel = "sms" | "email";
export type ReputationTransportName = "simulated" | "twilio" | "resend";

export interface ReputationOutboundMessage {
  requestId: string;
  userId: string;
  businessName: string;
  customerName: string;
  channel: ReputationMessageChannel;
  phone?: string | null;
  email?: string | null;
  subject?: string | null;
  body: string;
  html?: string | null;
  attemptNumber: number;
  reviewToken: string;
  reviewLink?: string | null;
}

export interface ReputationDeliveryResult {
  provider: ReputationTransportName;
  providerSid: string | null;
  deliveryState: "accepted" | "scheduled" | "queued" | "sending" | "sent" | "delivered" | "undelivered" | "failed" | "receiving" | "received" | "read";
  simulated: boolean;
  metadata?: Record<string, unknown>;
}

export interface ReputationTransport {
  readonly name: ReputationTransportName;
  readonly simulated: boolean;
  deliver(message: ReputationOutboundMessage): Promise<ReputationDeliveryResult>;
}

class SimulatedReputationTransport implements ReputationTransport {
  readonly name = "simulated" as const;
  readonly simulated = true;

  async deliver(message: ReputationOutboundMessage): Promise<ReputationDeliveryResult> {
    return {
      provider: this.name,
      providerSid: `sim_${message.requestId}_${message.attemptNumber}`,
      deliveryState: "sent",
      simulated: true,
      metadata: {
        acceptedAt: new Date().toISOString(),
      },
    };
  }
}

const simulatedTransport = new SimulatedReputationTransport();
const twilioTransport = new TwilioReputationTransport();
const emailTransport = new EmailReputationTransport();

function isTwilioConfigured() {
  const hasCoreCredentials = Boolean(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim());
  const hasSender = Boolean(process.env.TWILIO_FROM_NUMBER?.trim() || process.env.TWILIO_MESSAGING_SERVICE_SID?.trim());
  return hasCoreCredentials && hasSender;
}

export function getReputationTransport(): ReputationTransport {
  const configuredTransport = (process.env.GEOTHORITY_REPUTATION_TRANSPORT || "auto").trim().toLowerCase();

  switch (configuredTransport) {
    case "auto":
      return isTwilioConfigured() ? twilioTransport : simulatedTransport;
    case "simulated":
      return simulatedTransport;
    case "twilio":
      return twilioTransport;
    default:
      throw new Error(`Unsupported reputation transport: ${configuredTransport}`);
  }
}

export function getReputationChannelTransport(channel: ReputationMessageChannel): ReputationTransport {
  if (channel === "email") {
    return isEmailConfigured() ? emailTransport : simulatedTransport;
  }
  return getReputationTransport();
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
