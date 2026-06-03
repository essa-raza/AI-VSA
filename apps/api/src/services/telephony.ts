import type { Lead } from "@ai-vsa/shared";
import type { AppConfig } from "./config.js";

type OutboundCallInput = {
  lead: Lead;
  promptOverride?: string;
};

export function createTelephonyService(config: AppConfig) {
  return {
    async createOutboundCall(input: OutboundCallInput) {
      if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber || !config.twilioPublicWebhookUrl) {
        return {
          provider: "twilio",
          status: "mocked",
          note: "Twilio outbound calling is not fully configured yet."
        };
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Calls.json`;
      const webhookUrl = new URL("/webhooks/voice", config.twilioPublicWebhookUrl);
      webhookUrl.searchParams.set("leadId", input.lead.id);
      if (input.promptOverride) {
        webhookUrl.searchParams.set("prompt", input.promptOverride);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: input.lead.phone,
          From: config.twilioPhoneNumber,
          Url: webhookUrl.toString()
        }).toString()
      });

      if (!response.ok) {
        throw new Error(`Twilio outbound call failed with HTTP ${response.status}`);
      }

      return response.json();
    },

    buildVoiceResponseTwiML(message: string, bookingPrompt: string, leadId?: string) {
      if (config.twilioMediaStreamUrl) {
        const leadParameter = leadId
          ? `<Parameter name="leadId" value="${escapeXml(leadId)}" />`
          : "";

        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(message)}</Say>
  <Connect>
    <Stream url="${escapeXml(config.twilioMediaStreamUrl)}">
      ${leadParameter}
    </Stream>
  </Connect>
  <Say voice="alice">${escapeXml(bookingPrompt)}</Say>
</Response>`;
      }

      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(message)}</Say>
  <Pause length="1" />
  <Say voice="alice">${escapeXml(bookingPrompt)}</Say>
</Response>`;
    }
  };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

