export interface ReputationTransportChecks {
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasFromNumber: boolean;
  hasMessagingServiceSid: boolean;
  hasSender: boolean;
  hasBaseUrl: boolean;
  hasQstashUrl: boolean;
  hasQstashToken: boolean;
  hasJobSecret: boolean;
  hasWebhookSecret: boolean;
  hasResendApiKey: boolean;
}

export interface ReputationTransportDiagnostics {
  mode: string;
  validMode: boolean;
  ready: boolean;
  twilioRequested: boolean;
  queueReady: boolean;
  callbacksReady: boolean;
  automationReady: boolean;
  activeTransport: "simulated" | "twilio";
  emailReady: boolean;
  missing: string[];
  checks: ReputationTransportChecks;
}

export function getReputationTransportDiagnostics(): ReputationTransportDiagnostics {
  const mode = (process.env.GEOTHORITY_REPUTATION_TRANSPORT || "auto").trim().toLowerCase();
  const validMode = mode === "auto" || mode === "simulated" || mode === "twilio";
  const hasAccountSid = Boolean(process.env.TWILIO_ACCOUNT_SID?.trim());
  const hasAuthToken = Boolean(process.env.TWILIO_AUTH_TOKEN?.trim());
  const hasFromNumber = Boolean(process.env.TWILIO_FROM_NUMBER?.trim());
  const hasMessagingServiceSid = Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID?.trim());
  const hasBaseUrl = Boolean((process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim());
  const hasQstashUrl = Boolean(process.env.UPSTASH_QSTASH_URL?.trim());
  const hasQstashToken = Boolean(process.env.UPSTASH_QSTASH_TOKEN?.trim());
  const hasJobSecret = Boolean(process.env.GEOTHORITY_REPUTATION_JOB_SECRET?.trim());
  const hasWebhookSecret = Boolean(process.env.GEOTHORITY_REPUTATION_WEBHOOK_SECRET?.trim());
  const hasResendApiKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSender = hasFromNumber || hasMessagingServiceSid;
  const twilioRequested = mode === "twilio" || mode === "auto";
  const callbacksReady = hasAuthToken && hasBaseUrl;
  const queueReady = hasQstashUrl && hasQstashToken && hasJobSecret;
  const liveTransportReady = hasAccountSid && hasAuthToken && hasSender && hasBaseUrl;
  const ready = !validMode ? false : mode === "simulated" ? true : liveTransportReady;

  const missing = [
    !validMode ? 'GEOTHORITY_REPUTATION_TRANSPORT must be one of auto|simulated|twilio' : null,
    !hasAccountSid && twilioRequested ? "Twilio Account SID" : null,
    !hasAuthToken && twilioRequested ? "Twilio auth token" : null,
    !hasSender && twilioRequested ? "Twilio from number or messaging service" : null,
    !hasBaseUrl && twilioRequested ? "Canonical app URL" : null,
    !hasQstashUrl ? "Upstash QStash URL" : null,
    !hasQstashToken ? "Upstash QStash token" : null,
    !hasJobSecret ? "Reputation job secret" : null,
    !hasWebhookSecret ? "Reputation webhook secret" : null,
  ].filter(Boolean) as string[];

  return {
    mode,
    validMode,
    ready,
    twilioRequested,
    queueReady,
    callbacksReady,
    automationReady: queueReady && hasWebhookSecret,
    activeTransport: mode === "simulated" ? "simulated" : liveTransportReady ? "twilio" : "simulated",
    emailReady: hasResendApiKey,
    missing,
    checks: {
      hasAccountSid,
      hasAuthToken,
      hasFromNumber,
      hasMessagingServiceSid,
      hasSender,
      hasBaseUrl,
      hasQstashUrl,
      hasQstashToken,
      hasJobSecret,
      hasWebhookSecret,
      hasResendApiKey,
    },
  };
}
