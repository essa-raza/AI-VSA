import type { Campaign } from "@ai-vsa/shared";

export const defaultCampaign: Campaign = {
  name: "Website Automation Appointment Setter",
  audience: "Small businesses with websites but weak automation or slow lead response",
  coreOffer:
    "We help businesses automate website chat, follow-up, email replies, AI calling, and lead handling so they miss fewer opportunities.",
  primaryGoal: "Book a 15-minute appointment with the human sales team.",
  trustPromises: [
    "We focus on practical automation, not hype.",
    "We tailor the solution to the business instead of forcing a generic bot.",
    "We keep the conversation short and respectful."
  ],
  qualifyingQuestions: [
    "How are website inquiries handled today?",
    "Do missed calls or slow replies ever cost you leads?",
    "Are you already using any chatbot, CRM, or automation stack?",
    "Would improving lead response and bookings be a priority this quarter?"
  ],
  objectionPlaybook: {
    tooBusy: "Acknowledge their time, explain the audit is short, and shift to a brief meeting invite.",
    noNeed: "Highlight missed leads, after-hours response, and the value of an outside efficiency check.",
    alreadyUsingTools:
      "Position the team as an optimization partner that can improve current workflows instead of replacing them.",
    sendEmail: "Agree to send information, but still ask for a short follow-up slot so the email does not die in the inbox."
  },
  bookingCallToAction:
    "Ask for a short discovery appointment with the real team and offer a simple next step."
};

