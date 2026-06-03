import type { AppConfig } from "./config.js";

export function createWhatsAppService(config: AppConfig) {
  return {
    verifyWebhook(mode: string, token: string, challenge: string) {
      if (mode === "subscribe" && token === config.whatsappVerifyToken) {
        return challenge;
      }

      return null;
    },

    async sendMessage(to: string, body: string) {
      if (config.whatsappProvider === "twilio") {
        if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioWhatsAppNumber) {
          return {
            provider: "twilio",
            status: "mocked",
            note: "Twilio WhatsApp credentials are not configured.",
            body
          };
        }

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
              From: config.twilioWhatsAppNumber.startsWith("whatsapp:")
                ? config.twilioWhatsAppNumber
                : `whatsapp:${config.twilioWhatsAppNumber}`,
              Body: body
            }).toString()
          }
        );

        if (!response.ok) {
          throw new Error(`Twilio WhatsApp send failed with HTTP ${response.status}`);
        }

        return response.json();
      }

      if (config.whatsappProvider === "meta") {
        if (!config.metaWhatsAppToken || !config.metaWhatsAppPhoneNumberId) {
          return {
            provider: "meta",
            status: "mocked",
            note: "Meta WhatsApp credentials are not configured.",
            body
          };
        }

        const response = await fetch(
          `https://graph.facebook.com/v22.0/${config.metaWhatsAppPhoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${config.metaWhatsAppToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: to.replace("whatsapp:", ""),
              type: "text",
              text: {
                body
              }
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Meta WhatsApp send failed with HTTP ${response.status}`);
        }

        return response.json();
      }

      if (config.customWhatsAppApiUrl) {
        const response = await fetch(config.customWhatsAppApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.customWhatsAppApiKey ? { "Authorization": `Bearer ${config.customWhatsAppApiKey}` } : {})
          },
          body: JSON.stringify({ to, body })
        });

        if (!response.ok) {
          throw new Error(`Custom WhatsApp API failed with HTTP ${response.status}`);
        }

        return response.json();
      }

      return {
        provider: config.whatsappProvider,
        status: "mocked",
        note: "No outbound WhatsApp provider is configured.",
        body
      };
    }
  };
}

