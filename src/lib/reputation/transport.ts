export type ReputationTransportName = "simulated";

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
  deliveryState: "sent";
  simulated: boolean;
  metadata?: Record<string, unknown>;
}

export interface ReputationTransport {
  readonly name: ReputationTransportName;
  deliver(message: ReputationOutboundMessage): Promise<ReputationDeliveryResult>;
}

class SimulatedReputationTransport implements ReputationTransport {
  readonly name = "simulated" as const;

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

export function getReputationTransport(): ReputationTransport {
  const configuredTransport = (process.env.GEOTHORITY_REPUTATION_TRANSPORT || "simulated").trim().toLowerCase();

  switch (configuredTransport) {
    case "simulated":
      return simulatedTransport;
    default:
      throw new Error(`Unsupported reputation transport: ${configuredTransport}`);
  }
}
