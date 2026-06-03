import type { Campaign, LeadContext, SimulationRequest } from "@ai-vsa/shared";
import { runSalesAgentCouncil } from "./council.js";
import { scoreLead } from "./qualification.js";

export { scoreLead } from "./qualification.js";
export { runSalesAgentCouncil } from "./council.js";

export function buildLeadHypothesis(lead: LeadContext) {
  const websiteMention = lead.website
    ? `Their website ${lead.website} is a clear entry point for automation improvements.`
    : "Their website still needs discovery, which creates room for a manual audit offer.";

  const automationAngles = [
    "website chatbot",
    "email reply automation",
    "AI call handling",
    "appointment follow-up"
  ];

  return {
    summary: `${lead.company} may benefit from faster lead response, stronger automation, and better appointment capture.`,
    websiteMention,
    automationAngles,
    likelyPain:
      lead.painPoints[0] ??
      "They may be losing leads through slow follow-up, missed calls, or weak website conversion."
  };
}

export function buildCallPlan(lead: LeadContext, campaign: Campaign) {
  const opener = `Hi ${lead.name}, this is Alex from AI-VSA. We help businesses like ${lead.company} automate website inquiries, replies, and lead follow-up so fewer sales opportunities slip through. I wanted to ask a quick question about how your team handles incoming leads today.`;

  const angle = lead.painPoints.length > 0
    ? `Lead with their visible pain point: ${lead.painPoints[0]}.`
    : "Lead with missed leads, slow replies, and after-hours coverage.";

  return {
    opener,
    angle,
    bookingMove: campaign.bookingCallToAction
  };
}

export function buildSystemPrompt(lead: LeadContext, campaign: Campaign) {
  return [
    "You are a calm, human-sounding AI sales rep.",
    `Your goal is: ${campaign.primaryGoal}`,
    `Lead company: ${lead.company}`,
    `Lead industry: ${lead.industry}`,
    `Known pain points: ${lead.painPoints.join(", ") || "unknown"}`,
    "Do not over-explain the technology.",
    "Sell outcomes like faster replies, more captured leads, and smoother follow-up.",
    "Sound confident, concise, and respectful.",
    "Try to book the appointment when interest appears."
  ].join(" ");
}

export function createSimulationReply(
  request: SimulationRequest,
  campaign: Campaign
) {
  const transcript = request.transcript;
  const latestLeadMessage = [...transcript]
    .reverse()
    .find((turn) => turn.speaker === "lead")?.message.toLowerCase() ?? "";
  const qualification = scoreLead(request.lead);

  if (latestLeadMessage.includes("email")) {
    return {
      stage: "soft-booking",
      message: `Absolutely, I can send details. To make that useful, would you be open to a quick 15-minute call with our team so we can show what would actually fit ${request.lead.company}?`,
      qualification
    };
  }

  if (latestLeadMessage.includes("busy")) {
    return {
      stage: "respect-time",
      message: `Totally understood. I'll keep it simple. We help businesses reduce missed leads and automate follow-up. Would a short call later this week be easier than trying to unpack it right now?`,
      qualification
    };
  }

  if (request.leadSignal === "warm" || qualification.score >= 70) {
    return {
      stage: "booking-push",
      message: `It sounds like there could be a real fit here. ${campaign.bookingCallToAction} Would early next week be reasonable?`,
      qualification
    };
  }

  return {
    stage: "discovery",
    message: `A lot of teams we speak with are losing good leads because replies are slow or website inquiries are not handled consistently. How is ${request.lead.company} handling that today?`,
    qualification
  };
}

export function generateChatReply(
  lead: LeadContext,
  incomingMessage: string,
  campaign: Campaign
) {
  const latestMessage = incomingMessage.toLowerCase();
  const council = runSalesAgentCouncil({
    campaign,
    lead,
    latestMessage
  });
  const qualification = scoreLead(lead);

  if (council.complianceAgent.handoffRequired) {
    return {
      reply:
        "I can bring a human teammate in for that so you get the right answer. Could I confirm the best contact details and a good time for them to reach out?",
      qualification,
      council,
      handoffRequired: true,
      summary: "The lead requested or triggered a human handoff."
    };
  }

  if (latestMessage.includes("price") || latestMessage.includes("cost")) {
    return {
      reply:
        "Pricing depends on the workflow complexity, but we usually work in practical ranges rather than throwing out random numbers too early. If you want, I can help qualify the fit and then book a short call with our team.",
      qualification,
      council,
      handoffRequired: false,
      summary: "The lead asked about pricing and the agent redirected toward qualification."
    };
  }

  if (qualification.score >= 75 || latestMessage.includes("interested")) {
    return {
      reply: `It sounds like there may be a strong fit. ${campaign.bookingCallToAction}`,
      qualification,
      council,
      handoffRequired: false,
      summary: "The lead appears qualified enough to push for an appointment."
    };
  }

  return {
    reply: `${council.strategistAgent} ${council.discoveryAgent}`,
    qualification,
    council,
    handoffRequired: false,
    summary: "The agent continued qualification and positioned the offer."
  };
}
