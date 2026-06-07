import type { SalesCouncil, SalesCouncilAgent } from "./workspaceTypes";

export function renderCouncil(council: SalesCouncil | undefined) {
  if (!council) {
    return "";
  }

  return `
    <section class="workspace-card council-section">
      <span class="label">Multi Agent Sales Council</span>
      <h3>Specialized AI decision panel</h3>
      <div class="workspace-grid council-grid">
        ${renderCouncilAgent("🎯 Qualification Agent", council.qualificationAgent)}
        ${renderCouncilAgent("🚧 Objection Agent", council.objectionAgent)}
        ${renderCouncilAgent("🤝 Closer Agent", council.closerAgent)}
        ${renderCouncilAgent("🛡️ Compliance Agent", council.complianceAgent)}
      </div>
    </section>
  `;
}

function renderCouncilAgent(title: string, agent: SalesCouncilAgent) {
  return `
    <article class="workspace-card council-card">
      <span class="label">${escapeHtml(title)}</span>
      <h3>${escapeHtml(agent.verdict)}</h3>
      <strong class="confidence">${agent.confidence}% confidence</strong>
      <p>${escapeHtml(agent.rationale)}</p>
      <p class="next-action">${escapeHtml(agent.nextStep)}</p>
    </article>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
