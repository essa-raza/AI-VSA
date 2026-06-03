import type { LeadContext } from "@ai-vsa/shared";

const scoringSignals = [
  "missed",
  "slow",
  "book",
  "automation",
  "follow-up",
  "reply",
  "lead",
  "website",
  "chat"
];

export function scoreLead(lead: LeadContext) {
  let score = 35;

  if (lead.website) {
    score += 10;
  }

  if (lead.painPoints.length > 0) {
    score += 15;
  }

  if (lead.goals.length > 0) {
    score += 10;
  }

  const combinedText = `${lead.painPoints.join(" ")} ${lead.goals.join(" ")}`.toLowerCase();

  for (const signal of scoringSignals) {
    if (combinedText.includes(signal)) {
      score += 4;
    }
  }

  score = Math.min(score, 100);

  return {
    score,
    band: score >= 75 ? "high" : score >= 55 ? "medium" : "low",
    nextStep:
      score >= 75
        ? "Push for a meeting confidently."
        : score >= 55
          ? "Do more discovery, then ask for a short appointment."
          : "Keep the pitch light and qualify further before pushing hard."
  };
}
