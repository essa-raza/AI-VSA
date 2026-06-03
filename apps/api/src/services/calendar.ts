import type { Lead } from "@ai-vsa/shared";
import type { AppConfig } from "./config.js";

type BookingInput = {
  lead: Lead;
  scheduledFor: string;
  timezone: string;
  summary?: string;
};

export function createCalendarService(config: AppConfig) {
  return {
    async bookMeeting(input: BookingInput) {
      if (config.calendarProvider === "google") {
        if (!config.googleCalendarAccessToken || !config.googleCalendarId) {
          return {
            provider: "google",
            status: "mocked",
            meetingUrl: "",
            calendarEventId: "",
            note: "Google Calendar is not fully configured."
          };
        }

        const start = new Date(input.scheduledFor);
        const end = new Date(start.getTime() + 15 * 60 * 1000);
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.googleCalendarId)}/events?conferenceDataVersion=1`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${config.googleCalendarAccessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              summary: input.summary ?? `Razex discovery call with ${input.lead.company || input.lead.name}`,
              description: input.lead.summary || "Booked from AI-VSA",
              start: {
                dateTime: start.toISOString(),
                timeZone: input.timezone
              },
              end: {
                dateTime: end.toISOString(),
                timeZone: input.timezone
              },
              conferenceData: {
                createRequest: {
                  requestId: `${input.lead.id}-${Date.now()}`
                }
              },
              attendees: input.lead.email ? [{ email: input.lead.email }] : []
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar booking failed with HTTP ${response.status}`);
        }

        const payload = await response.json() as {
          id?: string;
          htmlLink?: string;
          conferenceData?: { entryPoints?: Array<{ uri?: string }> };
        };

        return {
          provider: "google",
          status: "booked",
          calendarEventId: payload.id ?? "",
          meetingUrl: payload.conferenceData?.entryPoints?.[0]?.uri ?? payload.htmlLink ?? ""
        };
      }

      if (config.calendarProvider === "calendly") {
        return {
          provider: "calendly",
          status: "pending",
          calendarEventId: "",
          meetingUrl: config.calendlyBookingUrl ?? "",
          note: "Calendly link returned for manual booking handoff."
        };
      }

      if (config.customCalendarWebhookUrl) {
        const response = await fetch(config.customCalendarWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        });

        if (!response.ok) {
          throw new Error(`Custom calendar webhook failed with HTTP ${response.status}`);
        }

        const payload = await response.json() as { meetingUrl?: string; calendarEventId?: string };
        return {
          provider: "custom",
          status: "pending",
          meetingUrl: payload.meetingUrl ?? "",
          calendarEventId: payload.calendarEventId ?? ""
        };
      }

      return {
        provider: "none",
        status: "pending",
        meetingUrl: "",
        calendarEventId: "",
        note: "No calendar provider is configured."
      };
    }
  };
}

