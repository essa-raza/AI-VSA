export type WorkspaceActionContext = {
  hasHandoff: boolean;
  bookingRecommended: boolean;
  crmSyncRecommended: boolean;
};

export function renderWorkspaceActions(actions: string[], context: WorkspaceActionContext) {
  const recommended = [
    context.hasHandoff ? "Resolve handoff" : "Review lead",
    context.bookingRecommended ? "Book meeting" : "Ask qualifier",
    context.crmSyncRecommended ? "Sync CRM" : "Create lead"
  ];

  const merged = [...new Set([...actions, ...recommended])];

  return `
    <div class="workspace-actions">
      ${merged.map((action) => `<span>${escapeHtml(action)}</span>`).join("")}
    </div>
  `;
}

export function renderActionButtons(context: WorkspaceActionContext) {
  return `
    <div class="workspace-button-row">
      <button type="button" class="workspace-action-button">${context.hasHandoff ? "Resolve Handoff" : "Create Handoff"}</button>
      <button type="button" class="workspace-action-button">${context.bookingRecommended ? "Book Meeting" : "Suggest Meeting"}</button>
      <button type="button" class="workspace-action-button">${context.crmSyncRecommended ? "Sync CRM" : "Save Lead"}</button>
    </div>
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
