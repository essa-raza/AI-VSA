import { renderCouncil } from "./councilRenderer";
import { renderTranscript, type TranscriptMessage } from "./transcriptRenderer";
import { renderActionButtons, renderWorkspaceActions } from "./workspaceActions";
import { renderMetricCard, renderPrimaryWorkspaceCard, renderTagList } from "./workspaceWidgets";
import type { SalesCouncil } from "./workspaceTypes";

export type ModularWorkspaceResponse = {
  messages: TranscriptMessage[];
  activeHandoff: {
    id: string;
    status: string;
    priority: string;
    assignedTo: string;
    reason: string;
  } | null;
  analysis: {
    intent: string;
    sentiment: string;
    urgencyScore: number;
    dealRiskScore: number;
    buyingSignals: string[];
    objections: string[];
    closerBrief: string;
    summary: string;
    council?: SalesCouncil;
  };
  workspace: {
    primaryAction: string;
    nextActions: string[];
    crmSyncRecommended: boolean;
    bookingRecommended: boolean;
  };
};

export function renderWorkspace(data: ModularWorkspaceResponse) {
  const actionsHtml = renderWorkspaceActions(data.workspace.nextActions, {
    hasHandoff: Boolean(data.activeHandoff),
    bookingRecommended: data.workspace.bookingRecommended,
    crmSyncRecommended: data.workspace.crmSyncRecommended
  });

  return `
    <div class="workspace-grid">
      ${renderPrimaryWorkspaceCard(data.workspace.primaryAction, data.analysis.closerBrief, actionsHtml)}
      ${renderMetricCard({ label: "Risk", value: data.analysis.dealRiskScore, helper: data.analysis.summary })}
      ${renderMetricCard({ label: "Urgency", value: data.analysis.urgencyScore, helper: `Intent: ${data.analysis.intent} · Sentiment: ${data.analysis.sentiment}` })}
      ${renderMetricCard({ label: "Handoff", value: data.activeHandoff?.status ?? "none", helper: data.activeHandoff?.reason ?? "No active handoff on this conversation." })}
    </div>
    ${renderCouncil(data.analysis.council)}
    <div class="workspace-grid two-col">
      ${renderTagList("Buying Signals", data.analysis.buyingSignals, "No buying signals detected yet.")}
      ${renderTagList("Objections", data.analysis.objections, "No strong objections detected.")}
    </div>
    ${renderActionButtons({
      hasHandoff: Boolean(data.activeHandoff),
      bookingRecommended: data.workspace.bookingRecommended,
      crmSyncRecommended: data.workspace.crmSyncRecommended
    })}
    ${renderTranscript(data.messages)}
  `;
}
