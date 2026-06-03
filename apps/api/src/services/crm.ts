import type { Lead } from "@ai-vsa/shared";
import type { AppConfig } from "./config.js";

export function createCrmService(config: AppConfig) {
  return {
    async syncLead(lead: Lead) {
      if (config.crmProvider === "hubspot") {
        if (!config.hubSpotAccessToken) {
          return {
            provider: "hubspot",
            status: "mocked",
            note: "HubSpot token is not configured."
          };
        }

        const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.hubSpotAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            properties: {
              firstname: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              website: lead.website,
              hs_lead_status: lead.status,
              lifecyclestage: lead.status === "qualified" || lead.status === "booked" ? "opportunity" : "lead"
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HubSpot sync failed with HTTP ${response.status}`);
        }

        return response.json();
      }

      if (config.customCrmWebhookUrl) {
        const response = await fetch(config.customCrmWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(lead)
        });

        if (!response.ok) {
          throw new Error(`Custom CRM webhook failed with HTTP ${response.status}`);
        }

        return response.json();
      }

      return {
        provider: config.crmProvider,
        status: "mocked",
        note: "No CRM provider is configured."
      };
    }
  };
}

