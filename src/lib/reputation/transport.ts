import { TwilioReputationTransport } from "@/lib/reputation/twilio";

export type ReputationTransportName = "simulated" | "twilio";

export interface ReputationOutboundMessage {
  requestId: string;
  userId: string;
  businessName: string;
  customerName: string;
  phone: string;
  body: string;
  attemptNumber: number;
  reviewToken: string;
}

export interface ReputationDeliveryResult {
  provider: ReputationTransportName;
  providerSid: string | null;
  deliveryState: "accepted" | "scheduled" | "queued" | "sending" | "sent" | "delivered" | "undelivered" | "failed";
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
