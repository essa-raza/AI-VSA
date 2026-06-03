export type AppConfig = {
  port: number;
  appBaseUrl: string;
  webBaseUrl: string;
  databaseUrl?: string;
  openAiApiKey?: string;
  openAiModel: string;
  openAiRealtimeModel: string;
  openAiVoice: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  twilioWhatsAppNumber?: string;
  twilioPublicWebhookUrl?: string;
  twilioMediaStreamUrl?: string;
  whatsappProvider: "twilio" | "meta" | "custom";
  whatsappVerifyToken: string;
  metaWhatsAppToken?: string;
  metaWhatsAppPhoneNumberId?: string;
  customWhatsAppApiUrl?: string;
  customWhatsAppApiKey?: string;
  calendarProvider: "google" | "calendly" | "custom" | "none";
  googleCalendarAccessToken?: string;
  googleCalendarId?: string;
  calendlyBookingUrl?: string;
  customCalendarWebhookUrl?: string;
  crmProvider: "hubspot" | "custom" | "none";
  hubSpotAccessToken?: string;
  customCrmWebhookUrl?: string;
};

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    port: Number(env.PORT ?? 4000),
    appBaseUrl: env.APP_BASE_URL ?? "http://localhost:4000",
    webBaseUrl: env.WEB_BASE_URL ?? "http://localhost:5173",
    databaseUrl: env.DATABASE_URL,
    openAiApiKey: env.OPENAI_API_KEY,
    openAiModel: env.OPENAI_MODEL ?? "gpt-4.1-mini",
    openAiRealtimeModel: env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-mini",
    openAiVoice: env.OPENAI_VOICE ?? "alloy",
    twilioAccountSid: env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: env.TWILIO_PHONE_NUMBER,
    twilioWhatsAppNumber: env.TWILIO_WHATSAPP_NUMBER,
    twilioPublicWebhookUrl: env.TWILIO_PUBLIC_WEBHOOK_URL,
    twilioMediaStreamUrl: env.TWILIO_MEDIA_STREAM_URL,
    whatsappProvider: (env.WHATSAPP_PROVIDER as AppConfig["whatsappProvider"]) ?? "twilio",
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN ?? "dev-verify-token",
    metaWhatsAppToken: env.META_WHATSAPP_TOKEN,
    metaWhatsAppPhoneNumberId: env.META_WHATSAPP_PHONE_NUMBER_ID,
    customWhatsAppApiUrl: env.CUSTOM_WHATSAPP_API_URL,
    customWhatsAppApiKey: env.CUSTOM_WHATSAPP_API_KEY,
    calendarProvider: (env.CALENDAR_PROVIDER as AppConfig["calendarProvider"]) ?? "none",
    googleCalendarAccessToken: env.GOOGLE_CALENDAR_ACCESS_TOKEN,
    googleCalendarId: env.GOOGLE_CALENDAR_ID,
    calendlyBookingUrl: env.CALENDLY_BOOKING_URL,
    customCalendarWebhookUrl: env.CUSTOM_CALENDAR_WEBHOOK_URL,
    crmProvider: (env.CRM_PROVIDER as AppConfig["crmProvider"]) ?? "none",
    hubSpotAccessToken: env.HUBSPOT_ACCESS_TOKEN,
    customCrmWebhookUrl: env.CUSTOM_CRM_WEBHOOK_URL
  };
}

