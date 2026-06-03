import type { Campaign, LeadContext } from "@ai-vsa/shared";

type CouncilInput = {
  campaign: Campaign;
  lead: LeadContext;
  latestMessage: string;
};

export function runSalesAgentCouncil({ campaign, lead, latestMessage }: CouncilInput) {
  const discoveryAgent = pickDiscoveryQuestion(campaign, latestMessage);
  const strategistAgent = buildOfferAngle(lead);
  const closerAgent = buildCloserMove(campaign, latestMessage);
  const complianceAgent = evaluateRisk(latestMessage);

  return {
    discoveryAgent,
    strategistAgent,
    closerAgent,
    complianceAgent
  };
}

function pickDiscoveryQuestion(campaign: Campaign, latestMessage: string) {
  if (latestMessage.includes("budget")) {
    return "When would you like to launch this if the solution made sense?";
  }

  return campaign.qualifyingQuestions[0] ?? "What are you looking to build or automate?";
}

function buildOfferAngle(lead: LeadContext) {
  if (lead.website) {
    return `Anchor the value around improving ${lead.website} with faster lead capture, better follow-up, and less manual work.`;
  }

  if (lead.painPoints.length > 0) {
    return `Lead with the pain point "${lead.painPoints[0]}" and connect it to booked appointments and response speed.`;
  }

  return "Lead with missed opportunities, after-hours replies, and qualification automation.";
}

function buildCloserMove(campaign: Campaign, latestMessage: string) {
  if (latestMessage.includes("interested") || latestMessage.includes("yes")) {
    return campaign.bookingCallToAction;
  }

  return "Keep the call moving toward a short discovery appointment without sounding pushy.";
}

function evaluateRisk(latestMessage: string) {
  const risky = ["legal", "contract", "refund", "angry", "speak to a person", "proposal"];
  const matched = risky.find((item) => latestMessage.includes(item));

  return {
    handoffRequired: Boolean(matched),
    reason: matched ? `Escalate because the lead mentioned ${matched}.` : ""
  };
}
